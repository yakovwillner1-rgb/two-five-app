import { SOURCES } from '../../data/sources';
import { S } from '../../state';
import { keyName } from '../../theory/home';
import { fmt } from '../../theory/notes';
import { TYPES } from '../../theory/scales';
import { makeChord } from '../../theory/symbols';
import { SCALES, chordScale, leadsTo, type ScaleId } from '../../theory/tensions';
import { optionChip, scaleChips, seqId, tensionLine } from '../extensions';
import { cache } from '../pieces';

/* Reference page: every chord type with its scale, its extensions, and the chord it leads to. */
const GROUPS: [string, string, ScaleId[]][] = [
  ['Major chords', 'Home chords take Ionian; any other major chord takes Lydian.', ['ionian', 'lydian', 'lydianAug']],
  ['Minor chords', 'The scale that fits depends on the chord\'s job: a ii, iii or vi chord, or a minor home chord.', ['dorian', 'phrygian', 'aeolian', 'melodicMinor']],
  ['Dominant chords', 'The scale that fits depends on where the chord goes next. The extra notes (9, 11, 13) point at that next chord.', ['mixolydian', 'phrygianDominant', 'mixolydianb13', 'lydianDominant', 'altered', 'halfWhole', 'wholeTone', 'mixolydianSus']],
  ['Half-diminished and diminished', '', ['locrian', 'locrianNat2', 'wholeHalf']],
];
const USE: Record<ScaleId, string> = {
  ionian: 'The I chord.', lydian: 'The IV chord and any major chord that is not home.', lydianAug: 'maj7♯5 chords.',
  dorian: 'A m7 chord that leads to a five chord (a "two" chord).', phrygian: 'The iii chord.', aeolian: 'The vi chord, or the home chord of a minor key.', melodicMinor: 'A minor home chord with a 6th or major 7th.',
  mixolydian: 'A dominant (7) chord that drops a fifth to a major chord.', phrygianDominant: 'A dominant (7) chord that drops a fifth to a minor chord.', mixolydianb13: 'The choice in Berklee books for the five chord that leads to a ii chord: natural 9 and ♭13.',
  lydianDominant: 'A dominant that does not drop a fifth: tritone subs, the backdoor ♭VII7, the IV7 in a blues.', altered: 'A dominant right before it lands, on a major or minor chord: the most pull.', halfWhole: 'A dominant with ♭9 and a natural 13.', wholeTone: 'A dominant with a ♯5 / ♭13 and a natural 9.', mixolydianSus: 'Sus chords.',
  locrian: 'The ii of a minor two-five; the vii of a major key.', locrianNat2: 'The same chords with a natural 9: a softer color.', wholeHalf: 'Diminished 7 chords.',
};

export function viewExt(): string {
  const root = keyName(S.pc, TYPES.major.keys);
  const card = (id: ScaleId) => {
    const s = chordScale(id, root);
    cache.scales[id] = s.notes.map(n => n.note);
    const opts = SCALES[id].options.map((k, j) => optionChip({ chord: makeChord(root, k), scale: s, why: '', moves: [] }, `x_${id}_${j}`, null)).join('');
    const leads = leadsTo(id, root).map((l, j) => `<button class="extopt" data-a="seq" data-id="${seqId(`l_${id}_${j}`, [s.chord, ...l.chords])}" aria-label="Play ${s.chord.symbol} into ${l.chords.map(c => c.symbol).join(', ')}"><span class="eo"><span class="wc">→ ${l.chords.map(c => c.symbol).join(' → ')}</span></span><span class="em">${l.why}</span></button>`).join('');
    return `<article class="card r2 extcard"><div class="ch"><span class="cs">${s.chord.symbol}</span><span class="cn">${s.name}</span></div>
      <div class="small">${USE[id]} <span style="opacity:.75">(${s.parent})</span></div>
      ${scaleChips(s)}${tensionLine(s)}
      ${opts ? `<div><div class="lbl">With extensions</div><div class="extopts">${opts}</div></div>` : ''}
      ${leads ? `<div><div class="lbl">Leads to</div><div class="extopts">${leads}</div></div>` : ''}
      <div class="btns"><button class="hear" data-a="extscale" data-id="${id}">▶ Scale</button><button class="hear" data-a="seq" data-id="${seqId('c_' + id, [s.chord])}">▶ Chord</button></div></article>`;
  };
  return `<div class="stack">
   <div style="text-align:center"><div class="eyebrow">Reference · chord scales and extensions</div><h2>What fits on a <em>${fmt(root)}</em> chord, and where it leads</h2></div>
   <div class="panel"><h3>The rule behind every row</h3>
     <p class="small" style="max-width:76ch;margin:4px 0">Every chord has a scale. Its notes fall into three groups: <span class="n ct r2" style="display:inline-grid">chord tones</span> <span class="n tn" style="display:inline-grid">extra notes that fit</span> <span class="n av" style="display:inline-grid">notes to avoid</span></p>
     <ul class="small" style="max-width:76ch;margin:6px 0;padding-left:1.2em">
       <li>A scale note a <b>whole step above a chord tone</b> is an available tension: the 9, 11 or 13 you can add.</li>
       <li>A scale note a <b>half step above a chord tone</b> is one to avoid: fine as a passing note in a melody, but crunchy if you hold it in the chord.</li>
       <li><b>Dominant (7) chords are the exception:</b> ♭9, ♯9 and ♭13 are fine, which is why a dominant has so many colors. Only the 11 is avoided.</li>
       <li>The extra notes on a dominant <b>point at the next chord</b>: 9 and 13 suit a major chord, ♭9 and ♭13 suit a minor chord, and ♯11 suits a dominant that does not drop a fifth.</li>
     </ul></div>
   ${GROUPS.map(([title, sub, ids]) => `<div><h3 style="margin-bottom:2px">${title}</h3>${sub ? `<p class="small" style="margin:0 0 10px">${sub}</p>` : ''}<div class="cards extcards">${ids.map(card).join('')}</div></div>`).join('')}
   <div class="panel"><h3>Sources</h3><p class="small" style="margin:0 0 8px">Checked against these. Where books disagree (the 13 on a Dorian chord, the V7 of ii) both views are shown. Full notes: <code>docs/THEORY_SOURCES.md</code> in the project.</p>
     <ul class="small srcs">${SOURCES.map(x => `<li><b>${x.url ? `<a href="${x.url}" target="_blank" rel="noopener">${x.title}</a>` : x.title}</b><br>${x.note}</li>`).join('')}</ul></div>
   <p class="hint">The root follows the home key. Swipe sideways or use ← → to change it.</p></div>`;
}
