/**
 * Counts finger presses per pitch. Two positions on a guitar neck can sound the same note: that note must keep sounding until the
 * LAST finger on it lifts, not the first. down() says whether a note should start; up() whether it should stop.
 */
export class PressTracker {
  private count = new Map<number, number>();
  private byPointer = new Map<number, number>();
  down(pointer: number, note: number): boolean {
    this.byPointer.set(pointer, note);
    const c = (this.count.get(note) ?? 0) + 1;
    this.count.set(note, c);
    return c === 1;
  }
  /** The note to stop (when this was its last finger), null otherwise or when the pointer was not tracked. */
  up(pointer: number): { note: number; last: boolean } | null {
    const n = this.byPointer.get(pointer);
    if (n == null) return null;
    this.byPointer.delete(pointer);
    const c = (this.count.get(n) ?? 1) - 1;
    if (c <= 0) { this.count.delete(n); return { note: n, last: true }; }
    this.count.set(n, c);
    return { note: n, last: false };
  }
  noteOf(pointer: number): number | undefined { return this.byPointer.get(pointer); }
}
