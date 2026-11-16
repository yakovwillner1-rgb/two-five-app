import { HOME, approach, homeChords, homeKey } from '../../theory/home';
import { fmt, note, pcOf } from '../../theory/notes';
import type { HomeMode } from '../../theory/types';
import { cref } from '../pieces';

export function viewGuide(): string {
  const e = (k: string, d: number, mode: HomeMode) => {
    const t = homeChords(homeKey(pcOf(note(k)), mode))[d], ap = approach(t, 'auto')!;
    return `<div><span class="k">${fmt(note(k))} ${HOME[mode].name}: ${HOME[mode].rn[d]} (${t.symbol})</span><span class="c r2" data-chord="${cref(ap.ii)}">${ap.ii.symbol}</span><span class="c r5" data-chord="${cref(ap.V)}">${ap.V.symbol}</span><span class="c r1" data-chord="${cref(t)}">${t.symbol}</span></div>`;
  };
  return`<div class="guide">
  <h3>The idea</h3>
  <p>A 2‑5‑1 is the strongest way to arrive at a chord. You can use it to arrive at any chord in a key, not only the home chord. You briefly treat the target as if it were "1", play the 2 and 5 of its key, then land.</p>
  <p>In C major, to go from C to F, pretend F is home. In F major the 2 is Gm7 and the 5 is C7. So you play C → Gm7 → C7 → F. Those two borrowed chords are the passing chords.</p>
  <div class="eg">${e('C',3,'major')}${e('C',5,'major')}${e('C',1,'major')}${e('A',3,'minor')}</div>
  <h3>How to name them</h3>
  <p>Players write these as <b>ii/IV</b> and <b>V/IV</b>, read "two of four" and "five of four". The V on its own is called a secondary dominant. On a lead sheet you will see them all the time. Most jazz standards are chains of these moves.</p>
  <h3>Which chart to use</h3>
  <ul>
   <li><b>Target is major or dominant</b> (maj7 or 7): use the <b>Major</b> chart for the target's key. Rows 2 and 5 give m7 → 7.</li>
   <li><b>Target is minor</b> (m7): use the <b>Harmonic Minor</b> chart. Rows 2 and 5 give m7♭5 → 7, with a ♭9 sound on the V. That's the "Dark" setting.</li>
   <li>For a smoother minor approach, use the <b>Melodic Minor</b> chart: m7 → 7. That's the "Bright" setting on a minor target.</li>
   <li><b>Natural Minor</b> is the chart for the home key itself when you are in a minor key. Its own v chord is minor, so for the V you borrow from Harmonic Minor.</li>
   <li>Skip half‑diminished targets (the vii in major, the ii in minor). They are unstable, so they don't work as a landing spot.</li>
  </ul>
  <h3>Why it works</h3>
  <ul>
   <li>The roots fall in fifths: G → C → F. That is the strongest root movement in tonal music.</li>
   <li>The V's 3rd is a half step under the target root and rises into it. In C7 → F, the E goes up to F.</li>
   <li>The V's 7th steps down to the target's 3rd. In C7 → F, the B♭ goes down to A.</li>
   <li>The borrowed note (B♭ in this example) is outside the home key, so the ear hears a short trip away and back.</li>
  </ul>
  <h3>Melody on top</h3>
  <p>A voicing is the same chord with its notes placed in a chosen order. When a tune has a melody, the melody note goes on top and the rest of the chord is built under it. The <b>Melody</b> tab does this: pick a chord and a melody note and it lists the voicings, from close position to rootless left-hand shapes and upper structures.</p>
  <ul>
   <li>It first checks the note. A chord tone or an available tension is fine. An avoid note (like F on top of Cmaj7) sits a half step above a chord tone and blurs the chord, so the tab offers fixes.</li>
   <li>Keep a voicing and move to the next chord: the list is then ordered by the smoothest voice leading, the least movement from the voicing you kept.</li>
   <li>Send the kept voicings to Play it to practise them note for note.</li>
  </ul>
  <h3>Your own tunes</h3>
  <p>The <b>Reharm</b> tab takes a tune you bring: a MIDI file from Logic, a score or lead sheet exported as MusicXML, or a chord chart you type. It shows the chords, a voicing for each one with the voice leading between them, and three reharmonizations. A reharm here means adding passing chords between your chords. Under a melody, a new chord is only used when the melody note over it is one of its chord tones or available tensions.</p>
  <h3>Practice path</h3>
  <ol>
   <li>On the Move tab, start on I and land on IV. Play and loop it until the move feels automatic.</li>
   <li>Go through every target in the key. The Cheat sheet tab lists them all.</li>
   <li>On the Progression tab, load I → vi → ii → V and switch the 2‑5 on in front of each chord. That's the sound of most standards.</li>
   <li>Swipe through all 12 home keys, then switch to Minor.</li>
   <li>Use the Drill tab to spell 2‑5s without looking.</li>
   <li>On the Melody tab, voice ii → V → I under one held melody note, keep the smoothest voicing each time, then play the line in Play it.</li>
  </ol>
  <h3>Source</h3>
  <p class="small">Built from the Major, Natural Minor, Melodic Minor and Harmonic Minor editions of Jeff Schneider's <i>The Last Chord/Scale Chart You'll Ever Need</i>. The chords and scales here are worked out from the scale formulas, so in rare keys you'll see correct but unusual spellings like E♯ or 𝄪.</p></div>`;
}
