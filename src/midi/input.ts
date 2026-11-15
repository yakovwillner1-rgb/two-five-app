import { S, save } from '../state';

/** Web MIDI access: keyboard input, and the list of output ports for "Sound". */
export type MidiState = 'idle' | 'asking' | 'unsupported' | 'blocked' | 'on';
export const midi = {
  acc: null as MIDIAccess | null,
  /** input ports we listen to */
  names: [] as string[],
  /** output ports available for sound */
  outs: [] as string[],
  state: (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator ? 'idle' : 'unsupported') as MidiState,
};
/** Set by the UI. */
export const midiHooks = {
  noteOn: (_n: number): void => {},
  noteOff: (_n: number): void => {},
  /** connection state or port list changed */
  changed: (): void => {},
};

export async function connectMIDI(): Promise<void> {
  if (!navigator.requestMIDIAccess) { midi.state = 'unsupported'; midiHooks.changed(); return; }
  midi.state = 'asking'; midiHooks.changed();
  try {
    midi.acc = await navigator.requestMIDIAccess();
    S.midiOn = true; save();
    midi.acc.onstatechange = bindMidi;
    bindMidi();
  } catch (e) { midi.state = 'blocked'; midiHooks.changed(); }
}

export function bindMidi(): void {
  const acc = midi.acc;
  if (!acc) return;
  midi.names = []; midi.outs = [];
  acc.outputs.forEach(o => { if (o.state !== 'disconnected') midi.outs.push(o.name || ''); });
  /* never listen to the port we send to, or the app would hear its own notes */
  acc.inputs.forEach(i => {
    if (S.soundOut && i.name === S.soundOut) { i.onmidimessage = null; return; }
    i.onmidimessage = onMidi;
    midi.names.push(i.name || '');
  });
  midi.state = 'on';
  midiHooks.changed();
}

function onMidi(ev: MIDIMessageEvent): void {
  const d = ev.data;
  if (!d || d.length < 2) return;
  const t = d[0] & 0xf0, n = d[1], v = d[2] || 0;
  if (t === 0x90 && v > 0) midiHooks.noteOn(n);
  else if (t === 0x80 || (t === 0x90 && v === 0)) midiHooks.noteOff(n);
}
