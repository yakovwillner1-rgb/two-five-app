import { parseChord, type PChord } from '../theory/symbols';
import type { SNote, STrack, Tempo, TimeSig } from './smf';

/*
 * MusicXML reader: scores and lead sheets exported from Logic, MuseScore, Sibelius, Dorico or
 * Finale. Pure: text in, data out (no DOM, so it runs in tests too). It reads notes (with ties,
 * chords, voices and staves), chord symbols (<harmony>), time signatures, the key and the tempo.
 * Times come out in ticks at 480 per quarter note, like a MIDI file.
 */
export const XML_PPQ = 480;
export interface GivenChord { tick: number; chord: PChord; /** the symbol could not be read exactly: the nearest chord type was used */ approx?: boolean }
export interface Score {
  title: string; ppq: number; tracks: STrack[]; tempos: Tempo[]; timeSigs: TimeSig[]; end: number;
  /** chord symbols written in the score, in order */
  given: GivenChord[];
  /** key signature: pitch class of the tonic and the mode, when the score has one */
  key: { pc: number; mode: 'major' | 'minor' } | null;
}
export class ScoreError extends Error {}

/* ---------- a small XML reader ---------- */
export interface XNode { tag: string; attrs: Record<string, string>; kids: XNode[]; text: string }
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (s: string): string => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
/** Parse XML into a tree. Comments, processing instructions and the DOCTYPE are skipped. */
export function parseXml(src: string): XNode {
  const root: XNode = { tag: '', attrs: {}, kids: [], text: '' }, stack = [root];
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?[^>]*>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2] !== undefined) { if (stack.length > 1) stack.pop(); }
    else if (m[3] !== undefined) {
      const node: XNode = { tag: m[3], attrs: {}, kids: [], text: '' };
      const ar = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let a: RegExpExecArray | null;
      while ((a = ar.exec(m[4]))) node.attrs[a[1]] = decode(a[2] ?? a[3]);
      top.kids.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6] !== undefined) top.text += decode(m[6]);
  }
  return root;
}
const kid = (n: XNode | undefined, tag: string): XNode | undefined => n?.kids.find(k => k.tag === tag);
const kids = (n: XNode | undefined, tag: string): XNode[] => n?.kids.filter(k => k.tag === tag) ?? [];
const txt = (n: XNode | undefined, tag: string): string => (kid(n, tag)?.text ?? '').trim();
const num = (n: XNode | undefined, tag: string, dflt = 0): number => { const v = parseFloat(txt(n, tag)); return Number.isFinite(v) ? v : dflt; };

/* ---------- chord symbols ---------- */
/** MusicXML <kind> values → the app's chord types. */
export const XML_KINDS: Record<string, string> = {
  'major': '', 'minor': 'm', 'augmented': '+', 'diminished': '°', 'dominant': '7', 'major-seventh': 'maj7', 'minor-seventh': 'm7',
  'diminished-seventh': '°7', 'augmented-seventh': '7♭13', 'half-diminished': 'm7♭5', 'major-minor': 'm(maj7)', 'major-sixth': '6', 'minor-sixth': 'm6',
  'dominant-ninth': '9', 'major-ninth': 'maj9', 'minor-ninth': 'm9', 'dominant-11th': '9sus4', 'major-11th': 'maj9', 'minor-11th': 'm11',
  'dominant-13th': '13', 'major-13th': 'maj9', 'minor-13th': 'm11', 'suspended-second': 'add9', 'suspended-fourth': 'sus4', 'power': '', 'other': '', 'none': '',
};
const ACC = (alter: number): string => (alter > 0 ? '#'.repeat(Math.round(alter)) : 'b'.repeat(Math.round(-alter)));
/** One <harmony> element as a chord. Tries the exact symbol first (kind + added/altered degrees), then the kind's printed text, then the plain kind. */
export function harmonyChord(h: XNode): { chord: PChord; approx: boolean } | null {
  const r = kid(h, 'root');
  if (!r || !txt(r, 'root-step')) return null;
  const root = txt(r, 'root-step').toUpperCase() + ACC(num(r, 'root-alter')), k = kid(h, 'kind'), kind = (k?.text ?? '').trim();
  if (kind === 'none') return null;
  const b = kid(h, 'bass'), bass = b && txt(b, 'bass-step') ? '/' + txt(b, 'bass-step').toUpperCase() + ACC(num(b, 'bass-alter')) : '';
  const base = XML_KINDS[kind] ?? '';
  /* an added 9 on a plain triad is "add9", not a dominant 9 */
  const triad = base === '' || base === 'm';
  const degs = kids(h, 'degree').filter(d => txt(d, 'degree-type') !== 'subtract')
    .map(d => (triad && txt(d, 'degree-type') === 'add' && !num(d, 'degree-alter') ? 'add' : '') + ACC(num(d, 'degree-alter')) + txt(d, 'degree-value'));
  const plainDegs = degs.every(d => /^\d+$/.test(d));
  /* 7 + ♭9 → 7♭9; maj7 + ♯11 → maj7♯11; 7 + ♯9 + ♭13 → 7♯9♭13; 7 + 13 → 13; m7 + 11 → m11 */
  const tries = degs.length ? [base + degs.join(''), ...(plainDegs ? [base.replace(/7$/, '') + degs[degs.length - 1]] : []), ...(k?.attrs.text ? [k.attrs.text + degs.join('')] : [])] : [];
  for (const t of tries) { const c = parseChord(root + t + bass); if (c) return { chord: c, approx: false }; }
  const plain = parseChord(root + base + bass) ?? parseChord(root + base);
  if (k?.attrs.text && !degs.length && !(kind in XML_KINDS)) { const c = parseChord(root + k.attrs.text + bass); if (c) return { chord: c, approx: false }; }
  return plain ? { chord: plain, approx: degs.length > 0 || !(kind in XML_KINDS) } : null;
}

/* ---------- the score ---------- */
const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Major-key tonic for a number of sharps (+) or flats (−). */
const fifthsPc = (f: number): number => (((f * 7) % 12) + 12) % 12;

export function parseMusicXml(src: string): Score {
  const doc = parseXml(src), root = doc.kids.find(k => k.tag === 'score-partwise' || k.tag === 'score-timewise');
  if (!root) throw new ScoreError('This is not a MusicXML score. Export the score as MusicXML (.musicxml or .mxl).');
  if (root.tag === 'score-timewise') throw new ScoreError('This MusicXML file is "timewise", which is not supported. Export it again as a normal (partwise) MusicXML file.');
  const names = new Map<string, string>();
  kids(kid(root, 'part-list'), 'score-part').forEach(p => names.set(p.attrs.id, txt(p, 'part-name')));
  const title = txt(kid(root, 'work'), 'work-title') || txt(root, 'movement-title');
  const tracks: STrack[] = [], tempos: Tempo[] = [], timeSigs: TimeSig[] = [], given: GivenChord[] = [];
  let key: Score['key'] = null, end = 0, shift = 0;
  const parts = kids(root, 'part');
  parts.forEach((part, pi) => {
    const byStaff = new Map<number, SNote[]>(), open = new Map<string, SNote>();
    let divisions = 1, barStart = 0, sig = { num: 4, den: 4 };
    const T = (d: number): number => Math.round((d / divisions) * XML_PPQ);
    kids(part, 'measure').forEach((meas, mi) => {
      let pos = barStart, far = barStart, lastStart = barStart;
      const tempoOf = (n: XNode): void => { const t = parseFloat(n.attrs.tempo); if (pi === 0 && t > 0) tempos.push({ tick: pos, us: Math.round(6e7 / t) }); };
      meas.kids.forEach(el => {
        if (el.tag === 'attributes') {
          if (kid(el, 'divisions')) divisions = num(el, 'divisions', 1) || 1;
          const t = kid(el, 'time');
          if (t && txt(t, 'beats')) { sig = { num: parseInt(txt(t, 'beats'), 10) || 4, den: parseInt(txt(t, 'beat-type'), 10) || 4 }; if (pi === 0) timeSigs.push({ tick: barStart, ...sig }); }
          const ks = kid(el, 'key');
          if (ks && !key && txt(ks, 'fifths') !== '') { const minor = txt(ks, 'mode') === 'minor', pc = fifthsPc(num(ks, 'fifths')); key = { pc: minor ? (pc + 9) % 12 : pc, mode: minor ? 'minor' : 'major' }; }
        } else if (el.tag === 'backup') pos -= T(num(el, 'duration'));
        else if (el.tag === 'forward') { pos += T(num(el, 'duration')); far = Math.max(far, pos); }
        else if (el.tag === 'sound') tempoOf(el);
        else if (el.tag === 'direction') kids(el, 'sound').forEach(tempoOf);
        else if (el.tag === 'harmony') {
          const c = harmonyChord(el), at = pos + T(num(el, 'offset'));
          if (c && !given.some(g => g.tick === at)) given.push({ tick: at, chord: c.chord, ...(c.approx ? { approx: true } : {}) });
        } else if (el.tag === 'note') {
          if (kid(el, 'grace')) return;
          const dur = T(num(el, 'duration')), isChord = !!kid(el, 'chord'), start = isChord ? lastStart : pos;
          const p = kid(el, 'pitch');
          if (p && dur > 0) {
            const midi = (num(p, 'octave', 4) + 1) * 12 + (STEP[txt(p, 'step').toUpperCase()] ?? 0) + Math.round(num(p, 'alter'));
            const staff = num(el, 'staff', 1), id = `${staff}:${midi}`, ties = kids(el, 'tie').map(t => t.attrs.type);
            const held = open.get(id);
            if (ties.includes('stop') && held && held.tick + held.dur === start) held.dur += dur;
            else {
              const n: SNote = { tick: start, dur, midi, vel: 80, ch: Math.min(15, tracks.length + staff - 1) };
              if (!byStaff.has(staff)) byStaff.set(staff, []);
              byStaff.get(staff)!.push(n);
              open.set(id, n);
            }
          }
          if (!isChord) { lastStart = pos; pos += dur; far = Math.max(far, pos); }
        }
      });
      /* a short first bar is a pickup: everything moves right so the pickup ends on a bar line */
      const full = Math.round((sig.num * 4 * XML_PPQ) / sig.den), len = far - barStart;
      if (mi === 0 && pi === 0 && len > 0 && len < full) shift = full - len;
      barStart += len || full;
    });
    end = Math.max(end, barStart);
    const staves = [...byStaff.keys()].sort((a, b) => a - b), name = names.get(part.attrs.id) || `Part ${pi + 1}`;
    staves.forEach(s => tracks.push({ name: staves.length > 1 ? `${name} · ${s === 1 ? 'upper' : s === 2 ? 'lower' : 'staff ' + s} staff` : name, notes: byStaff.get(s)!.sort((a, b) => a.tick - b.tick || a.midi - b.midi) }));
  });
  if (shift) {
    tracks.forEach(t => t.notes.forEach(n => { n.tick += shift; }));
    given.forEach(g => { g.tick += shift; });
    tempos.forEach(t => { if (t.tick > 0) t.tick += shift; });
    timeSigs.forEach(t => { if (t.tick > 0) t.tick += shift; });
    end += shift;
  }
  given.sort((a, b) => a.tick - b.tick);
  if (!tracks.length && !given.length) throw new ScoreError('This score has no notes and no chord symbols.');
  return { title, ppq: XML_PPQ, tracks, tempos, timeSigs, end, given, key };
}

/* ---------- .mxl: a zip file with the score inside ---------- */
const u16 = (b: Uint8Array, at: number): number => b[at] | (b[at + 1] << 8);
const u32 = (b: Uint8Array, at: number): number => (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
export const isZip = (b: Uint8Array): boolean => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
/** The files in a zip archive: name → compressed bytes and method (0 = stored, 8 = deflate). */
export function zipEntries(b: Uint8Array): { name: string; method: number; data: Uint8Array }[] {
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new ScoreError('This compressed score (.mxl) is damaged: no file list found.');
  const count = u16(b, eocd + 10), out: { name: string; method: number; data: Uint8Array }[] = [];
  let p = u32(b, eocd + 16);
  for (let i = 0; i < count && u32(b, p) === 0x02014b50; i++) {
    const method = u16(b, p + 10), size = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), local = u32(b, p + 42);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nlen));
    const start = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    out.push({ name, method, data: b.subarray(start, start + size) });
    p += 46 + nlen + xlen + clen;
  }
  return out;
}
async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** The score text inside a file: plain MusicXML as it is, or the root file of a compressed .mxl. */
export async function scoreText(b: Uint8Array): Promise<string> {
  if (!isZip(b)) return new TextDecoder().decode(b);
  const files = zipEntries(b), read = async (f: { method: number; data: Uint8Array }): Promise<string> => {
    if (f.method !== 0 && f.method !== 8) throw new ScoreError('This compressed score (.mxl) uses a compression method that is not supported.');
    return new TextDecoder().decode(f.method === 8 ? await inflate(f.data) : f.data);
  };
  const container = files.find(f => f.name === 'META-INF/container.xml');
  let path = '';
  if (container) path = /full-path\s*=\s*["']([^"']+)["']/.exec(await read(container))?.[1] ?? '';
  const main = files.find(f => f.name === path) ?? files.find(f => !f.name.startsWith('META-INF/') && /\.(musicxml|xml)$/i.test(f.name));
  if (!main) throw new ScoreError('This compressed score (.mxl) has no MusicXML file inside.');
  return read(main);
}
