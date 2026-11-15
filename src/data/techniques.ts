/* Technique catalogue: names, and the tension + color of each variant. Plain data, easy to tune. */
export type TechniqueId =
  | 'secDom' | 'secIIV' | 'tritone' | 'iiSubV' | 'backdoor' | 'dimPass' | 'dimCT' | 'chromAbove' | 'chromBelow'
  | 'planing' | 'lineCliche' | 'borrowed' | 'susSub' | 'coltrane' | 'upperStruct' | 'turnaround' | 'gospelWalk';
export type Feel = 'bright' | 'dark' | 'tense' | 'lush' | 'sad' | 'dreamy';
export const FEELS: Feel[] = ['bright', 'dark', 'tense', 'lush', 'sad', 'dreamy'];

export const TECHNIQUES: Record<TechniqueId, { name: string }> = {
  secDom: { name: 'Secondary dominant' },
  secIIV: { name: 'Secondary ii–V' },
  tritone: { name: 'Tritone sub' },
  iiSubV: { name: 'ii–subV' },
  backdoor: { name: 'Backdoor ii–V' },
  dimPass: { name: 'Diminished passing' },
  dimCT: { name: 'Common-tone °7' },
  chromAbove: { name: 'Chromatic approach from above' },
  chromBelow: { name: 'Chromatic approach from below' },
  planing: { name: 'Planing' },
  lineCliche: { name: 'Line cliché' },
  borrowed: { name: 'Modal interchange' },
  susSub: { name: 'Sus / pedal' },
  coltrane: { name: 'Coltrane cycle' },
  upperStruct: { name: 'Upper-structure dominant' },
  turnaround: { name: 'Turnaround' },
  gospelWalk: { name: 'Gospel walk-up' },
};
export const TECHNIQUE_IDS = Object.keys(TECHNIQUES) as TechniqueId[];

/** Tension (0 = plain, 1 = far out) and color tags per variant. Key = "techniqueId.variant". */
export const VARIANTS: Record<string, { tension: number; tags: Feel[] }> = {
  'secDom.major': { tension: 0.3, tags: ['bright'] },
  'secDom.minor': { tension: 0.35, tags: ['dark'] },
  'secIIV.bright': { tension: 0.3, tags: ['bright', 'lush'] },
  'secIIV.dark': { tension: 0.45, tags: ['dark', 'sad'] },
  'tritone.sub': { tension: 0.55, tags: ['tense', 'lush'] },
  'iiSubV.sub': { tension: 0.6, tags: ['tense', 'lush'] },
  'backdoor.iiV': { tension: 0.4, tags: ['lush', 'dark'] },
  'dimPass.up': { tension: 0.5, tags: ['tense', 'dark'] },
  'dimCT.ct': { tension: 0.45, tags: ['tense', 'dreamy'] },
  'chromAbove.above': { tension: 0.5, tags: ['dark', 'tense'] },
  'chromBelow.below': { tension: 0.45, tags: ['bright', 'tense'] },
  'planing.above': { tension: 0.3, tags: ['dreamy', 'lush'] },
  'planing.below': { tension: 0.3, tags: ['dreamy', 'lush'] },
  'lineCliche.minor': { tension: 0.25, tags: ['sad', 'dark'] },
  'borrowed.iv': { tension: 0.35, tags: ['sad', 'dark'] },
  'borrowed.iv6': { tension: 0.35, tags: ['sad', 'dark', 'lush'] },
  'borrowed.bVI': { tension: 0.4, tags: ['dreamy', 'dark', 'sad'] },
  'borrowed.bVII': { tension: 0.35, tags: ['dark', 'lush'] },
  'borrowed.bVI-bVII': { tension: 0.45, tags: ['dreamy', 'lush'] },
  'borrowed.bII': { tension: 0.5, tags: ['dreamy', 'dark'] },
  'borrowed.bIII': { tension: 0.45, tags: ['dreamy', 'lush'] },
  'susSub.sus': { tension: 0.15, tags: ['dreamy', 'lush'] },
  'susSub.slash': { tension: 0.15, tags: ['dreamy', 'lush', 'bright'] },
  'coltrane.cycle': { tension: 0.9, tags: ['tense', 'bright'] },
  'upperStruct.II': { tension: 0.6, tags: ['bright', 'tense', 'lush'] },
  'upperStruct.bVI': { tension: 0.8, tags: ['dark', 'tense'] },
  'upperStruct.bIII': { tension: 0.65, tags: ['dark', 'tense'] },
  'turnaround.vi-ii-V': { tension: 0.15, tags: ['bright'] },
  'turnaround.VI7-ii-V': { tension: 0.3, tags: ['bright', 'lush'] },
  'turnaround.iii-VI7-ii-V': { tension: 0.3, tags: ['bright', 'lush'] },
  'turnaround.dameron': { tension: 0.6, tags: ['dreamy', 'lush'] },
  'turnaround.gospel736': { tension: 0.45, tags: ['dark', 'sad'] },
  'gospelWalk.full': { tension: 0.35, tags: ['bright', 'lush'] },
  'gospelWalk.toIV': { tension: 0.15, tags: ['bright'] },
};
