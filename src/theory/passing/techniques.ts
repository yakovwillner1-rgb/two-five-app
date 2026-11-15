import type { TechniqueId } from '../../data/techniques';
import { fmt, mod, pcOf, transpose } from '../notes';
import { IV, famOfKind, keyRoot, makeChord, romanNumeral, simplifyRoot, type KindId, type PChord } from '../symbols';
import type { Key, Note } from '../types';
import type { Draft, Technique } from './types';

/* The technique catalogue. Each technique is a pure function (from, to, key, ctx) → drafts. */
const T = transpose, { A1, m2, M2, m3, M3, P4, A4, P5, m6, M6, m7, M7 } = IV;
const semis = (a: Note, b: Note): number => mod(pcOf(b) - pcOf(a), 12);
/** TO can be landed on (not diminished / half-diminished). */
const landable = (c: PChord): boolean => !['dim', 'hdim'].includes(famOfKind(c));
const isMinor = (c: PChord): boolean => famOfKind(c) === 'min';
const majorish = (c: PChord): boolean => ['maj', 'aug', 'sus'].includes(famOfKind(c));
const rns = (cs: PChord[], key: Key): string[] => cs.map(c => romanNumeral(c, key));
const names = (cs: PChord[]): string => cs.map(c => c.symbol).join(' → ');
const plain = (c: PChord): PChord => (c.bass ? makeChord(c.root, c.kind) : c);

/** V7 of TO. */
const secDom: Technique = (_from, to, _key, ctx) => {
  if (!landable(to)) return [];
  const V = makeChord(T(to.root, P5), '7');
  return [{
    variant: isMinor(to) ? 'minor' : 'major', chords: [V], romanNumerals: ['V7' + ctx.of],
    fn: `${V.symbol} is the dominant (V7) of ${to.symbol}.`,
    pull: `The root falls a fifth (${fmt(V.root)} → ${fmt(to.root)}) and the tritone ${fmt(V.tones[1])}–${fmt(V.tones[3])} resolves inward.`,
    source: fmt(to.root) + (isMinor(to) ? ' harmonic minor' : ' major'),
  }];
};

/** ii–V of TO: bright (m7 → 7) or dark (m7♭5 → 7). A minor TO gets both. */
const secIIV: Technique = (_from, to, _key, ctx) => {
  if (!landable(to)) return [];
  const V = makeChord(T(to.root, P5), '7'), iiRoot = T(to.root, M2), minor = isMinor(to);
  const mk = (dark: boolean): Draft => {
    const ii = makeChord(iiRoot, dark ? 'm7♭5' : 'm7');
    return {
      variant: dark ? 'dark' : 'bright', variantLabel: dark ? 'dark' : 'bright', chords: [ii, V], romanNumerals: [(dark ? 'iiø7' : 'ii7') + ctx.of, 'V7' + ctx.of],
      fn: `${ii.symbol} → ${V.symbol} is the ii–V of ${to.symbol}: for a moment ${to.symbol} is treated as home.`,
      pull: `Roots fall in fifths (${fmt(ii.root)} → ${fmt(V.root)} → ${fmt(to.root)}), the strongest root motion there is.`,
      source: fmt(to.root) + (dark ? ' harmonic minor' : minor ? ' melodic minor' : ' major'),
    };
  };
  return minor ? [mk(true), mk(false)] : [mk(false)];
};

const subV = (to: PChord): PChord => makeChord(simplifyRoot(T(to.root, m2)), '7');
/** ♭II7 of TO: the dominant a tritone away from V/TO. */
const tritone: Technique = (_from, to, _key, ctx) => {
  if (!landable(to)) return [];
  const sub = subV(to), V = makeChord(T(to.root, P5), '7');
  return [{
    variant: 'sub', chords: [sub], romanNumerals: ['subV7' + ctx.of],
    fn: `${sub.symbol} is the tritone sub of ${V.symbol}, the V7 of ${to.symbol}: a dominant a tritone away that shares its 3rd and 7th.`,
    pull: `The bass slides down a half step (${fmt(sub.root)} → ${fmt(to.root)}) while the shared tritone resolves as it would from ${V.symbol}.`,
  }];
};

/** The related ii of the tritone sub, then the sub. */
const iiSubV: Technique = (_from, to, key, ctx) => {
  if (!landable(to)) return [];
  const sub = subV(to), ii = makeChord(simplifyRoot(T(sub.root, P5)), 'm7');
  return [{
    variant: 'sub', chords: [ii, sub], romanNumerals: [romanNumeral(ii, key), 'subV7' + ctx.of],
    fn: `${sub.symbol} is the tritone sub of the V7 of ${to.symbol}; ${ii.symbol} is the ii chord that belongs with it.`,
    pull: `A ii–V from a key a tritone away, then the bass drops a half step (${fmt(sub.root)} → ${fmt(to.root)}).`,
  }];
};

/** iv7 → ♭VII7 → TO (TO major or dominant). */
const backdoor: Technique = (_from, to, _key, ctx) => {
  if (!majorish(to) && famOfKind(to) !== 'dom') return [];
  const bVII = makeChord(simplifyRoot(T(to.root, m7)), '7'), iv = makeChord(simplifyRoot(T(bVII.root, P5)), 'm7');
  return [{
    variant: 'iiV', chords: [iv, bVII], romanNumerals: ['iv7' + ctx.of, '♭VII7' + ctx.of],
    fn: `${iv.symbol} → ${bVII.symbol} is the backdoor ii–V: the iv and ♭VII7 of ${to.symbol}, a ii–V borrowed from ${fmt(to.root)} minor's relative major.`,
    pull: `${bVII.symbol} resolves up a whole step into ${to.symbol} instead of down a fifth, so it arrives softly, "through the back door".`,
    source: fmt(to.root) + ' minor',
  }];
};

/** ♯°7 between two chords whose roots (bass, for a slash chord) are a whole step apart, going up. */
const dimPass: Technique = (from, to, key) => {
  const target = to.bass ?? to.root;
  if (semis(from.root, target) !== 2) return [];
  const d = makeChord(T(from.root, A1), '°7'), line = `${fmt(from.root)} → ${fmt(d.root)} → ${fmt(target)}`;
  const V = makeChord(T(to.root, P5), '7♭9');
  return [{
    variant: 'up', chords: [d], romanNumerals: [romanNumeral(d, key)],
    fn: `${d.symbol} fills the whole step between ${from.symbol} and ${to.symbol} with a chromatic bass line: ${line}.`,
    pull: to.bass
      ? `${fmt(d.root)} is a leading tone into the bass note ${fmt(target)}; the other voices close in by half steps.`
      : `${d.symbol} is ${V.symbol} without its root (${d.tones.map(fmt).join(' ')}), so it pulls into ${to.symbol} like a dominant.`,
  }];
};

/** °7 on the root of TO (TO major or dominant). */
const dimCT: Technique = (_from, to, key) => {
  if (!majorish(to) && famOfKind(to) !== 'dom') return [];
  const d = makeChord(to.root, '°7');
  return [{
    variant: 'ct', chords: [d], romanNumerals: [romanNumeral(d, key)],
    fn: `${d.symbol} is a common-tone diminished chord: it shares its root with ${to.symbol}.`,
    pull: `The root ${fmt(to.root)} stays put while the other voices open out by half and whole steps into ${to.symbol}.`,
  }];
};

/** Same quality as TO, a half step above / below. */
const chrom = (above: boolean): Technique => (_from, to, key) => {
  const t = plain(to), c = makeChord(simplifyRoot(T(t.root, above ? m2 : M7)), t.kind);
  return [{
    variant: above ? 'above' : 'below', chords: [c], romanNumerals: [romanNumeral(c, key)],
    fn: `${c.symbol} is ${t.symbol} moved a half step ${above ? 'up' : 'down'}: a chromatic approach chord.`,
    pull: `Every voice slides ${above ? 'down' : 'up'} a half step into ${t.symbol} at the same time.`,
  }];
};

/** The TO shape moved in parallel from a whole step above / below. */
const planing: Technique = (_from, to, key) => {
  const t = plain(to);
  return [true, false].map(above => {
    const c = makeChord(simplifyRoot(T(t.root, above ? M2 : m7)), t.kind);
    return {
      variant: above ? 'above' : 'below', variantLabel: above ? 'from above' : 'from below', chords: [c], romanNumerals: [romanNumeral(c, key)],
      fn: `${c.symbol} is the same shape as ${t.symbol}, a whole step ${above ? 'higher' : 'lower'}. Keep the voicing and slide it (planing).`,
      pull: `All voices move in parallel by a whole step, so the ear follows the shape rather than a functional pull.`,
    };
  });
};

/** One inner voice walks down chromatically over a minor chord: m, m(maj7), m7, m6. */
const lineCliche: Technique = (from, _to, key) => {
  if (!isMinor(from)) return [];
  const r = from.root, kinds: KindId[] = ['m', 'm(maj7)', 'm7', 'm6'], cs = kinds.map(k => makeChord(r, k));
  const voice = [r, T(r, M7), T(r, m7), T(r, M6)].map(fmt).join(' → ');
  return [{
    variant: 'minor', chords: cs, romanNumerals: rns(cs, key), replacesFrom: true,
    fn: `Line cliché on ${fmt(r)} minor, played in place of ${from.symbol}: ${names(cs)}. The chord stays, one voice moves.`,
    pull: `One inner voice walks down by half steps (${voice}) and keeps the harmony moving toward the next chord.`,
    source: fmt(r) + ' melodic minor',
  }];
};

/** Chords borrowed from the parallel minor (major home keys only). */
const borrowed: Technique = (_from, to, key, ctx) => {
  if (key.mode !== 'major' || !landable(to)) return [];
  const I = key.tonic, par = fmt(I) + ' minor';
  const mk = (variant: string, label: string, cs: PChord[], targets: number[], fn: string, pull: string, source = par): Draft | null =>
    targets.includes(ctx.toSemis) ? { variant, variantLabel: label, chords: cs, romanNumerals: rns(cs, key), fn, pull, source } : null;
  const iv = makeChord(T(I, P4), 'm7'), iv6 = makeChord(T(I, P4), 'm6'), bVI = makeChord(T(I, m6), 'maj7'), bVII = makeChord(T(I, m7), '7');
  const bII = makeChord(T(I, m2), 'maj7'), bIII = makeChord(T(I, m3), 'maj7');
  const home = ctx.toSemis === 0;
  return [
    mk('iv', 'minor iv', [iv], [0, 7], `${iv.symbol} is the iv chord of ${par}, the parallel minor.${home ? ' Going iv → I is the minor plagal cadence.' : ''}`,
      `Its ♭6 (${fmt(iv.tones[1])}) leans down a half step${home ? ` to ${fmt(T(I, P5))}, the 5th of ${to.symbol}` : ` to ${fmt(to.root)}`}.`),
    mk('iv6', 'minor iv6', [iv6], [0], `${iv6.symbol} is the iv chord of ${par} with an added 6th: the minor plagal cadence.`,
      `Its ♭6 (${fmt(iv6.tones[1])}) falls a half step to ${fmt(T(I, P5))}, and ${fmt(iv6.tones[3])} is already the 2nd of the key.`),
    mk('bVI', '♭VI', [bVI], [0, 7], `${bVI.symbol} is the ♭VI chord of ${par}.`,
      home ? `It shares ${fmt(I)} with ${to.symbol}, so the tonic rings through while the color changes.` : `Its root ${fmt(bVI.root)} drops a half step to ${fmt(to.root)}.`),
    mk('bVII', '♭VII', [bVII], [0], `${bVII.symbol} is the ♭VII chord of ${par}.`, `It steps up a whole step into ${to.symbol}: a softer arrival than V7.`),
    mk('bVI-bVII', '♭VI–♭VII', [bVI, bVII], [0], `${bVI.symbol} → ${bVII.symbol} are the ♭VI and ♭VII of ${par}.`,
      `The bass climbs by whole steps (${fmt(bVI.root)} → ${fmt(bVII.root)} → ${fmt(I)}) into ${to.symbol}.`),
    mk('bII', '♭II', [bII], [0], `${bII.symbol} is the ♭II chord, borrowed from ${fmt(I)} Phrygian.`,
      `The whole chord sits a half step above ${to.symbol} and settles down into it.`, fmt(I) + ' Phrygian'),
    mk('bIII', '♭III', [bIII], [2, 5], `${bIII.symbol} is the ♭III chord of ${par}.`,
      ctx.toSemis === 2 ? `Its root ${fmt(bIII.root)} drops a half step to ${fmt(to.root)}.` : `It steps up a whole step into ${to.symbol}.`),
  ].filter((d): d is Draft => d !== null);
};

/** V7sus4, or IV over V in the bass, in place of the V of TO. */
const susSub: Technique = (_from, to, _key, ctx) => {
  if (!landable(to)) return [];
  const vRoot = T(to.root, P5), sus = makeChord(vRoot, '7sus4');
  const out: Draft[] = [{
    variant: 'sus', variantLabel: 'V7sus4', chords: [sus], romanNumerals: ['V7sus4' + ctx.of],
    fn: `${sus.symbol} is the V of ${to.symbol} with the 4th in place of the 3rd.`,
    pull: `The bass still falls a fifth, but the 4th (${fmt(sus.tones[1])}) is already ${to.symbol}'s root, so it arrives without the usual tension.`,
  }];
  if (majorish(to) || famOfKind(to) === 'dom') {
    const slash = makeChord(T(to.root, P4), '', vRoot);
    out.push({
      variant: 'slash', variantLabel: 'IV over V', chords: [slash], romanNumerals: ['V9sus4' + ctx.of],
      fn: `${slash.symbol} is the IV triad of ${to.symbol} over its V in the bass: a 9sus4 sound.`,
      pull: `The V in the bass falls a fifth to ${fmt(to.root)}; the triad on top moves like a plagal (IV → I) cadence.`,
    });
  }
  return out;
};

/** Major-third key cycle inserted into the ii–V–I of a major TO. */
const coltrane: Technique = (_from, to, key) => {
  if (famOfKind(to) !== 'maj') return [];
  const r = to.root, c1 = keyRoot(T(r, m6)), c2 = keyRoot(T(r, M3));
  const cs = [makeChord(T(r, M2), 'm7'), makeChord(T(c1, P5), '7'), makeChord(c1, 'maj7'), makeChord(T(c2, P5), '7'), makeChord(c2, 'maj7'), makeChord(T(r, P5), '7')];
  return [{
    variant: 'cycle', chords: cs, romanNumerals: rns(cs, key),
    fn: `Coltrane changes: the ii–V into ${to.symbol} is stretched through two more keys a major third apart, ${fmt(c1)} and ${fmt(c2)}, each set up by its own V7.`,
    pull: `Three key centers (${fmt(c1)}, ${fmt(c2)}, ${fmt(r)}) split the octave evenly; every V7 → I inside the cycle resolves down a fifth.`,
  }];
};

/** V7 of TO with a major triad on top. */
const UPPER: { variant: string; label: string; iv: typeof M2; kind: KindId; labels: string[] }[] = [
  { variant: 'II', label: 'II triad (13♯11)', iv: M2, kind: '13♯11', labels: ['9', '♯11', '13'] },
  { variant: 'bVI', label: '♭VI triad (♯9♭13)', iv: m6, kind: '7♯9♭13', labels: ['♭13', 'R', '♯9'] },
  { variant: 'bIII', label: '♭III triad (♯9)', iv: m3, kind: '7♯9', labels: ['♯9', '5', '♭7'] },
];
export function upperStructure(vRoot: Note, variant: string): PChord {
  const u = UPPER.find(x => x.variant === variant)!;
  const shell = makeChord(vRoot, '7'), triad = makeChord(simplifyRoot(T(vRoot, u.iv)), '');
  return {
    root: vRoot, kind: u.kind, tones: [shell.tones[0], shell.tones[1], shell.tones[3], ...triad.tones], labels: ['R', '3', '♭7', ...u.labels],
    upper: { root: triad.root, tones: triad.tones }, symbol: fmt(vRoot) + u.kind,
  };
}
const upperStruct: Technique = (_from, to, _key, ctx) => {
  if (!landable(to)) return [];
  const vRoot = T(to.root, P5);
  return UPPER.map(u => {
    const c = upperStructure(vRoot, u.variant), tri = c.upper!;
    return {
      variant: u.variant, variantLabel: u.label, chords: [c], romanNumerals: ['V' + u.kind + ctx.of],
      fn: `${c.symbol} is the V7 of ${to.symbol} played as a ${fmt(tri.root)} major triad over the ${fmt(vRoot)}7 shell (${[c.tones[0], c.tones[1], c.tones[2]].map(fmt).join(' ')}).`,
      pull: `The shell's tritone resolves as usual; the triad on top adds ${u.labels.filter(l => l !== 'R' && l !== '5' && l !== '♭7').join(' and ')} as color.`,
    };
  });
};

/** Turnarounds back to the tonic (major keys), and the gospel 7-3-6 into vi. */
const turnaround: Technique = (_from, to, key, ctx) => {
  if (key.mode !== 'major') return [];
  const I = key.tonic, d = (ivl: typeof M2, k: KindId) => makeChord(T(I, ivl), k);
  const mk = (variant: string, label: string, cs: PChord[], fn: string, pull: string, source?: string): Draft => ({ variant, variantLabel: label, chords: cs, romanNumerals: rns(cs, key), fn, pull, source });
  if (ctx.toSemis === 0 && famOfKind(to) === 'maj') {
    const vi = d(M6, 'm7'), ii = d(M2, 'm7'), V = d(P5, '7'), VI7 = d(M6, '7'), iii = d(M3, 'm7');
    const dam = [d(m3, 'maj7'), d(m6, 'maj7'), d(m2, 'maj7')];
    return [
      mk('vi-ii-V', 'I–vi–ii–V', [vi, ii, V], `${names([vi, ii, V])} is the plain turnaround back to ${to.symbol}: every chord is in the key.`, `Roots fall in fifths: ${[vi, ii, V, to].map(c => fmt(c.root)).join(' → ')}.`),
      mk('VI7-ii-V', 'I–VI7–ii–V7', [VI7, ii, V], `${VI7.symbol} replaces vi: it is the V7 of ${ii.symbol}, so the turnaround gets a secondary dominant.`, `Roots fall in fifths and ${fmt(VI7.tones[1])} leads up a half step to ${fmt(ii.root)}.`, fmt(ii.root) + ' harmonic minor'),
      mk('iii-VI7-ii-V', 'iii–VI7–ii–V7', [iii, VI7, ii, V], `${iii.symbol} stands in for I (they share three notes), then ${VI7.symbol} is the V7 of ${ii.symbol}.`, `A chain of fifths from ${fmt(iii.root)} all the way home: ${[iii, VI7, ii, V, to].map(c => fmt(c.root)).join(' → ')}.`, fmt(ii.root) + ' harmonic minor'),
      mk('dameron', 'Tadd Dameron', dam, `The Tadd Dameron turnaround: ${names(dam)}, the tritone subs of VI7, II7 and V7, all played as maj7 chords.`, `The last chord, ${dam[2].symbol}, sits a half step above ${to.symbol} and slides down into it.`),
    ];
  }
  if (ctx.toSemis === 9 && isMinor(to)) {
    const vii = d(M7, 'm7♭5'), III7 = d(M3, '7');
    return [mk('gospel736', 'gospel 7-3-6', [vii, III7], `The gospel "7-3-6": ${vii.symbol} → ${III7.symbol} → ${to.symbol}, scale degrees 7, 3 and 6. It is the minor ii–V of ${to.symbol}.`,
      `Roots fall in fifths (${fmt(vii.root)} → ${fmt(III7.root)} → ${fmt(to.root)}) and ${fmt(III7.tones[1])} leads up a half step to ${fmt(to.root)}.`, fmt(to.root) + ' harmonic minor')];
  }
  return [];
};

/** I → I/3 → IV → ♯IV°7 → I/5 (major keys, starting on I). */
const gospelWalk: Technique = (from, _to, key, ctx) => {
  if (key.mode !== 'major' || ctx.fromSemis !== 0 || famOfKind(from) !== 'maj') return [];
  const I = key.tonic, I3 = makeChord(I, '', T(I, M3)), IVc = makeChord(T(I, P4), ''), dim = makeChord(T(I, A4), '°7'), I5 = makeChord(I, '', T(I, P5));
  const bass = (cs: PChord[]) => cs.map(c => fmt(c.bass ?? c.root)).join(' → ');
  if (ctx.toSemis === 5) {
    return [{ variant: 'toIV', variantLabel: 'I/3 → IV', chords: [I3], romanNumerals: rns([I3], key),
      fn: `${I3.symbol} is the I chord with its 3rd in the bass: the first step of the gospel walk-up.`,
      pull: `The bass walks up by step: ${fmt(I)} → ${fmt(T(I, M3))} → ${fmt(T(I, P4))}.` }];
  }
  if (ctx.toSemis !== 7 && ctx.toSemis !== 0) return [];
  const cs = [I3, IVc, dim, I5];
  return [{ variant: 'full', chords: cs, romanNumerals: rns(cs, key),
    fn: `The gospel walk-up: ${names(cs)}. The I chord returns over its 5th at the top.`,
    pull: `The bass climbs ${fmt(I)} → ${bass(cs)}; ${dim.symbol} pushes it the last half step up to ${fmt(T(I, P5))}.` }];
};

export const TECHNIQUE_FNS: Record<TechniqueId, Technique> = {
  secDom, secIIV, tritone, iiSubV, backdoor, dimPass, dimCT, chromAbove: chrom(true), chromBelow: chrom(false),
  planing, lineCliche, borrowed, susSub, coltrane, upperStruct, turnaround, gospelWalk,
};
