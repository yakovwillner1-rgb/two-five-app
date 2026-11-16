/** Role colour class of a chord symbol: Hookpad-style, colour = harmonic function. */
export type RoleCls = 'r0' | 'r1' | 'r2' | 'r5';
export function roleOfSymbol(sym: string): RoleCls {
  const rest = sym.replace(/^[A-G][♭♯𝄪𝄫]*/, '').replace(/\/.*$/, '');
  if (/^(maj|M|Δ)/.test(rest) || /^(6|69|6\/9|add9)?$/.test(rest)) return 'r1';
  if (/^(m|min|-|ø|°)/.test(rest) && !/^maj/.test(rest)) return 'r2';
  if (/^(7|9|11|13|alt|sus|\+)/.test(rest)) return 'r5';
  return 'r0';
}
export const ROLE_VAR: Record<RoleCls, string> = { r0: 'var(--c0)', r1: 'var(--gold)', r2: 'var(--c2)', r5: 'var(--c5)' };
