/*
 * Motion. Everything animates transform / opacity only (Web Animations API + CSS), no libraries.
 * All of it is skipped under prefers-reduced-motion. Rules and timings: docs/DESIGN.md.
 */
import { S } from '../state';

export const reduced = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPRING = 'cubic-bezier(.34,1.56,.64,1)', OUT = 'cubic-bezier(.22,1,.36,1)';
const css = (n: string): string => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const cssMs = (n: string, d: number): number => { const v = parseFloat(css(n)); return Number.isFinite(v) ? v : d; };

/* ---- FLIP: elements marked data-flip slide from where they were; new ones pop in ---- */
let shown = '';
let snap: { tab: string; rects: Map<string, DOMRect>; text: Map<string, string> } | null = null;
export function flipSnapshot(root: HTMLElement): void {
  snap = { tab: shown, rects: new Map(), text: new Map() };
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach(e => {
    snap!.rects.set(e.dataset.flip!, e.getBoundingClientRect());
    snap!.text.set(e.dataset.flip!, e.querySelector('.bs')?.textContent ?? '');
  });
}
export function flipPlay(root: HTMLElement): void {
  const s = snap; snap = null;
  const same = !!s && s.tab === S.tab; shown = S.tab;
  if (!s || !same || reduced()) return;
  root.querySelectorAll<HTMLElement>('[data-flip]').forEach(e => {
    const k = e.dataset.flip!, old = s.rects.get(k);
    if (!old) { if (s.rects.size) e.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: cssMs('--t-slow', 420), easing: SPRING }); return; }
    const now = e.getBoundingClientRect(), dx = old.left - now.left, dy = old.top - now.top;
    const label = e.querySelector('.bs')?.textContent;
    if (label !== undefined && label !== null && s.text.get(k) !== label)
      e.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.09)', offset: .55 }, { transform: 'none' }], { duration: cssMs('--t-slow', 420) + 80, easing: SPRING });
    else if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
      e.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: cssMs('--t-slow', 420) + 120, easing: OUT });
  });
}

/* ---- effects layer ---- */
function layer(): HTMLElement {
  let f = document.getElementById('fx');
  if (!f) { f = document.createElement('div'); f.id = 'fx'; f.className = 'fx'; f.setAttribute('aria-hidden', 'true'); document.body.appendChild(f); }
  return f;
}
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
/** A small burst of dots from a point (viewport px) in one colour (plus lighter shades). */
export function burst(x: number, y: number, color: string, n = 16): void {
  if (reduced()) return;
  const L = layer();
  for (let i = 0; i < n; i++) {
    const e = document.createElement('i'), sz = rnd(7, 14), ang = (i / n) * Math.PI * 2 + rnd(-.2, .2), d = rnd(60, 130);
    e.style.cssText = `width:${sz}px;height:${sz}px;margin:${-sz / 2}px;border-radius:${Math.random() < .35 ? '3px' : '50%'};background:${i % 4 === 3 ? '#fff' : color};box-shadow:0 0 10px ${color}`;
    L.appendChild(e);
    const a = e.animate([{ transform: `translate(${x}px,${y}px) scale(.4)`, opacity: 1 }, { transform: `translate(${x + Math.cos(ang) * d}px,${y + Math.sin(ang) * d}px) scale(1)`, opacity: 1, offset: .55 }, { transform: `translate(${x + Math.cos(ang) * d * 1.15}px,${y + Math.sin(ang) * d * 1.15 + 24}px) scale(.2)`, opacity: 0 }], { duration: rnd(520, 760), easing: OUT });
    a.onfinish = () => e.remove();
  }
}
export function burstAt(el: Element | null, color: string, n = 16): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, n);
}
/** Confetti falling from above the viewport. */
export function confetti(n = 70): void {
  if (reduced()) return;
  const L = layer(), cols = ['var(--c0)', 'var(--c2)', 'var(--c5)', 'var(--gold)', 'var(--accent)'];
  for (let i = 0; i < n; i++) {
    const e = document.createElement('i'), w = rnd(8, 14), h = rnd(10, 20), x = rnd(0, innerWidth), drift = rnd(-140, 140), dur = rnd(1500, 2600);
    e.style.cssText = `width:${w}px;height:${h}px;background:${cols[i % cols.length]};border-radius:2px`;
    L.appendChild(e);
    const a = e.animate([{ transform: `translate(${x}px,-30px) rotate(0deg)`, opacity: 1 }, { transform: `translate(${x + drift}px,${innerHeight * .55}px) rotate(${rnd(240, 720)}deg)`, opacity: 1, offset: .7 }, { transform: `translate(${x + drift * 1.3}px,${innerHeight + 40}px) rotate(${rnd(500, 1000)}deg)`, opacity: 0 }], { duration: dur, delay: rnd(0, 380), easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'backwards' });
    a.onfinish = () => e.remove();
  }
}
/** A ring that expands from a key (position relative to the positioned wrapper). */
export function ripple(wrap: HTMLElement, target: Element | null, color: string): void {
  if (reduced() || !target) return;
  const w = wrap.getBoundingClientRect(), r = target.getBoundingClientRect(), e = document.createElement('i');
  e.className = 'ripple'; e.style.cssText = `left:${r.left - w.left + r.width / 2}px;top:${r.bottom - w.top - Math.min(34, r.height * .3)}px;--rp:${color}`;
  wrap.appendChild(e);
  const a = e.animate([{ transform: 'scale(.4)', opacity: .95 }, { transform: 'scale(2.8)', opacity: 0 }], { duration: 480, easing: OUT });
  a.onfinish = () => e.remove();
}
/** Count a number up (ease-out) into an element's text. */
export function countUp(el: HTMLElement | null, to: number, ms: number, fmt: (v: number) => string, delay = 0): void {
  if (!el) return;
  if (reduced()) { el.textContent = fmt(to); return; }
  const t0 = performance.now() + delay;
  el.textContent = fmt(0);
  const step = (t: number) => {
    const p = Math.min(1, Math.max(0, (t - t0) / ms));
    el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---- playback: the path lights up in time with the beat ---- */
/** Called by the player when a chord starts: `id` is its data-ev, `dur` its length in seconds. */
function onPlayEvent(ev: Event): void {
  const { id, dur } = (ev as CustomEvent<{ id: string; dur: number }>).detail;
  const beat = 60 / S.tempo;
  document.documentElement.style.setProperty('--beat', beat + 's');
  const els = document.querySelectorAll<HTMLElement>('[data-ev="' + id + '"]');
  if (!reduced()) els.forEach(e => {
    if (e.classList.contains('blk') || e.classList.contains('half') || e.classList.contains('bar')) e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .3 }, { transform: 'scale(1)' }], { duration: Math.min(beat * 800, 600), easing: SPRING });
    /* the light that travels along the arrow after this card, arriving exactly as the next chord starts */
    const ar = e.nextElementSibling;
    if (ar?.classList.contains('ar')) {
      const dot = ar.querySelector<HTMLElement>('i');
      if (dot) {
        const w = Math.max(0, (ar as HTMLElement).clientWidth - 28), ms = Math.min(dur * 1000, beat * 1000), delay = Math.max(0, dur * 1000 - ms);
        dot.animate([{ transform: 'translateX(0) scale(.6)', opacity: 0 }, { transform: 'translateX(' + w * .15 + 'px) scale(1)', opacity: 1, offset: .15 }, { transform: 'translateX(' + w + 'px) scale(1)', opacity: 1, offset: .85 }, { transform: 'translateX(' + w + 'px) scale(.6)', opacity: 0 }], { duration: ms, delay, easing: 'ease-in-out', fill: 'backwards' });
      }
    }
  });
  vlGo(id, dur);
}

/* ---- voice leading: the 3rd and 7th dots slide from chord to chord ---- */
interface VL { ids: string[]; pos: ({ x: number; y: number; n: string } | null)[][] }
function vlData(el: HTMLElement): VL | null { try { return JSON.parse(el.dataset.vl || ''); } catch { return null; } }
export function vlSet(stage: HTMLElement, idx: number, dur: number): void {
  const d = vlData(stage); if (!d || !d.pos[idx]) return;
  stage.style.setProperty('--vl', Math.max(.18, Math.min(.7, dur * .35)) + 's');
  stage.querySelectorAll<SVGGElement>('.vl-dot').forEach((g, k) => {
    const p = d.pos[idx][k];
    if (!p) { g.classList.add('gone'); return; }
    g.classList.remove('gone');
    g.style.transform = `translate(${p.x}px,${p.y}px)`;
    const t = g.querySelector('text'); if (t) t.textContent = p.n;
  });
}
function vlGo(id: string, dur: number): void {
  document.querySelectorAll<HTMLElement>('.vl[data-vl]').forEach(st => { const d = vlData(st); const i = d ? d.ids.indexOf(id) : -1; if (d && i >= 0) vlSet(st, i, dur); });
}
export function vlReset(): void { document.querySelectorAll<HTMLElement>('.vl[data-vl]').forEach(st => { st.style.setProperty('--vl', '0s'); vlSet(st, 0, 0); void st.getBoundingClientRect(); st.style.removeProperty('--vl'); }); }

export function initMotion(): void { document.addEventListener('twofive:ev', onPlayEvent); }

/* ---- circle of fifths: the ring turns to put the tapped key on top, its neighbours pulse, then the key changes ---- */
let turning = false;
export function rotateCircle(key: Element, then: () => void): boolean {
  const ring = key.closest('.cof')?.querySelector<SVGGElement>('.ring');
  if (!ring || reduced() || turning) return false;
  const pt = (k: Element) => { const c = k.querySelector('circle')!; return { x: +c.getAttribute('cx')! - 180, y: +c.getAttribute('cy')! - 180 }; };
  const p = pt(key), ang = (Math.atan2(p.y, p.x) * 180) / Math.PI + 90;   /* degrees clockwise from the top */
  const turn = ((ang + 180) % 360 + 360) % 360 - 180;                     /* shortest way round */
  turning = true;
  const dur = 520;
  ring.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${-turn}deg)` }], { duration: dur, easing: SPRING, fill: 'forwards' });
  ring.querySelectorAll<SVGGElement>('.ck').forEach(k => {
    k.style.transformBox = 'fill-box'; k.style.transformOrigin = 'center';
    k.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${turn}deg)` }], { duration: dur, easing: SPRING, fill: 'forwards' });
  });
  /* the keys next to it on the circle (one fifth either side, and its relative minor) pulse */
  const all = [...ring.querySelectorAll<SVGGElement>('.ck:not(.mi)')], i = all.indexOf(key as SVGGElement);
  if (i >= 0) [-1, 1].forEach(dx => {
    const c = all[(i + dx + 12) % 12].querySelector('circle')!;
    c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
    c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.28)', offset: .6 }, { transform: 'scale(1)' }], { duration: 640, delay: dur * .5, easing: SPRING });
  });
  setTimeout(() => { turning = false; then(); }, dur + 140);
  return true;
}
