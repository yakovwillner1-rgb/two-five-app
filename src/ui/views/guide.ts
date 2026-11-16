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
  <h3>What this app does</h3>
  <p>When a song goes from one chord to the next, you can add chords in between. They are called <b>passing chords</b>. They make the move smoother, or more exciting. This app shows you the options, plays them, and tells you why they work.</p>
  <p>Use <b>Piano</b> or <b>Guitar</b> at the top: every chord shape in the app switches to the one you play.</p>
  <h3>Words you will see</h3>
  <ul>
   <li><b>Chord</b>: notes played together. <b>Cmaj7</b> is a chord. <b>C</b> is its <b>root</b>, the note it is named after.</li>
   <li><b>3rd and 7th</b>: the third and seventh notes of a chord, counting up from the root. They give the chord its sound (happy, sad, tense). So they matter most.</li>
   <li><b>Half step</b>: the smallest step. One key on the piano, one fret on the guitar. A <b>whole step</b> is two half steps.</li>
   <li><b>Key</b>: the home base of a song. In "C major", C is home.</li>
   <li><b>Voicing</b>: the same chord with its notes arranged in a different way. On guitar I call it a <b>shape</b>.</li>
   <li><b>Smooth voice leading</b>: moving from one chord to the next while most notes stay put or move just a little.</li>
   <li><b>Two-five</b> (written ii–V): two chords in a row that lead strongly to a third chord. For example, Dm7 then G7 leads to C.</li>
  </ul>
  <h3>The idea</h3>
  <p>The most famous passing move is the two-five. It works on any chord in the key, not only the home chord. Pretend the chord you want to reach is home for a moment. Play the "two" chord and the "five" chord of that mini key. Then land.</p>
  <p>In C major, to go from C to F, pretend F is home. In F, the two chord is Gm7 and the five chord is C7. So you play C, Gm7, C7, then F. Gm7 and C7 are the passing chords.</p>
  <div class="eg">${e('C',3,'major')}${e('C',5,'major')}${e('C',1,'major')}${e('A',3,'minor')}</div>
  <h3>How people write them</h3>
  <p>On a lead sheet you will see <b>ii/IV</b> and <b>V/IV</b>. Read them as "two of four" and "five of four": the two and five chords of the IV chord. Most jazz standards are chains of these moves.</p>
  <h3>Which chart to use</h3>
  <ul>
   <li><b>The chord you want to reach is major or a 7 chord</b> (maj7 or 7): use the <b>Major</b> chart for that chord's key. The two and five chords come out as m7 then 7.</li>
   <li><b>The chord is minor</b> (m7): use the <b>Harmonic Minor</b> chart. You get m7♭5 then 7, a darker sound with a ♭9 on the five chord. The app calls this "Dark".</li>
   <li>For a softer minor approach, use the <b>Melodic Minor</b> chart. You get m7 then 7. The app calls this "Bright" on a minor chord.</li>
   <li><b>Natural Minor</b> is the chart for the home key itself when the song is in a minor key. Its own five chord is minor, so for a real five chord you borrow from Harmonic Minor.</li>
   <li>The app does not try to reach half-diminished chords (the vii in a major key, the ii in a minor key). The two-five does not work well on them. That is a limit of this exercise, not a rule of music.</li>
  </ul>
  <h3>Why it works</h3>
  <ul>
   <li>The bass keeps dropping a fifth: G, C, F. Your ear hears this pattern everywhere, so it feels like it is going somewhere.</li>
   <li>The 3rd of the five chord sits one half step below the chord you land on, and steps up into it. In C7 to F, the E steps up to F.</li>
   <li>The 7th of the five chord steps down to the 3rd of the landing chord. In C7 to F, the B♭ steps down to A.</li>
   <li>The borrowed note (B♭ in this example) is not in the home key. You hear a quick trip away from home, and back.</li>
  </ul>
  <h3>Hear the notes that move</h3>
  <p>On the <b>Move</b> tab, the "Listen for this" line points at one note that moves between the last two chords. Press <b>Hear just this line</b> to play only those two notes. On piano the keyboard shows it. On guitar it tells you the string and fret.</p>
  <h3>Compare two routes</h3>
  <p>Press <b>Save as A</b>, pick a different route, and press <b>A, then B</b>. You hear the first, then the second, so you can pick the one you like.</p>
  <h3>Melody on top</h3>
  <p>A song has a melody. If you play chords under it, the melody note should be the top note of each chord. The <b>Melody</b> tab does this. Pick a chord and a melody note, and it lists ways to play the chord with that note on top.</p>
  <ul>
   <li>First it checks the note. A note from the chord is safe. Some other notes fit and add color. An "avoid note" sits right next to a chord note and can sound crunchy when you hold it. The tab suggests fixes.</li>
   <li>Keep a voicing, then move to the next chord. The list puts the smoothest choice first (the one that moves your hands the least).</li>
   <li>Send your kept voicings to Play it to practice them.</li>
   <li>On guitar, the list shows shapes where the melody note is the highest string you play.</li>
  </ul>
  <h3>Piano or guitar</h3>
  <p>The same chord can be played many ways. On guitar the app shows <b>easy shapes</b> (open chords, barre chords, 3-note chords) and <b>jazz shapes</b> (drop 2, drop 3, no-root, fourths). An <b>×</b> above a string means "do not play that string". A <b>○</b> means play the string open. The number on the left of a chord box is the fret where the shape starts.</p>
  <p>Not sure which to pick? Start with the first one in the list. It is the easiest one for the style you chose.</p>
  <h3>Your own tunes</h3>
  <p>The <b>Reharm</b> tab takes a tune you bring: a MIDI file from Logic, a score or lead sheet saved as MusicXML, or a chord chart you type. It shows the chords, a voicing for each one, and three versions with different passing chords. With a melody, the app only uses a new chord when the melody note fits it.</p>
  <h3>A practice path</h3>
  <ol>
   <li>On the Move tab, start on I and land on IV. Play it and loop it until it feels easy.</li>
   <li>Try every landing chord in the key. The Cheat sheet lists them all.</li>
   <li>On the Progression tab, load I, vi, ii, V and add a two-five in front of each chord. That is the sound of most standards.</li>
   <li>Swipe through all 12 keys, then try Minor.</li>
   <li>Use the Drill tab to spell two-fives without looking.</li>
   <li>On the Melody tab, voice ii, V, I under one held melody note. Keep the smoothest voicing each time, then play the line in Play it.</li>
  </ol>
  <h3>Where the charts come from</h3>
  <p class="small">The Major, Natural Minor, Melodic Minor and Harmonic Minor charts follow Jeff Schneider's <i>The Last Chord/Scale Chart You'll Ever Need</i>. The app works out every chord from the scale formulas. In rare keys you may see correct but unusual note names like E♯ or 𝄪. Guitar shapes follow standard jazz and pop guitar teaching; the sources are listed in docs/THEORY_SOURCES.md.</p></div>`;
}
