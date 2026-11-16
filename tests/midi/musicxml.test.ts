import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ScoreError, harmonyChord, isZip, parseMusicXml, parseXml, scoreText, zipEntries } from '../../src/midi/musicxml';

/* Hand-written MusicXML: every note and chord symbol is known. 480 ticks = one quarter note. */
const Q = 480;
const note = (step: string, oct: number, dur: number, extra = '', alter = 0) => `<note>${extra.includes('<chord/>') ? '<chord/>' : ''}<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${oct}</octave></pitch><duration>${dur}</duration>${extra.replace('<chord/>', '')}</note>`;
const rest = (dur: number) => `<note><rest/><duration>${dur}</duration></note>`;
const harm = (step: string, kind: string, opts: { alter?: number; text?: string; bass?: string; degrees?: [number, number, string][] } = {}) =>
  `<harmony><root><root-step>${step}</root-step>${opts.alter ? `<root-alter>${opts.alter}</root-alter>` : ''}</root><kind${opts.text ? ` text="${opts.text}"` : ''}>${kind}</kind>${opts.bass ? `<bass><bass-step>${opts.bass}</bass-step></bass>` : ''}${(opts.degrees ?? []).map(([v, a, t]) => `<degree><degree-value>${v}</degree-value><degree-alter>${a}</degree-alter><degree-type>${t}</degree-type></degree>`).join('')}</harmony>`;
const score = (measures: string[], attrs = '<divisions>2</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time>') =>
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
  <score-partwise version="3.1"><work><work-title>Test &amp; Tune</work-title></work><part-list><score-part id="P1"><part-name>Lead</part-name></score-part></part-list>
  <part id="P1">${measures.map((m, i) => `<measure number="${i + 1}">${i === 0 ? `<attributes>${attrs}</attributes>` : ''}${m}</measure>`).join('')}</part></score-partwise>`;
const sym = (xml: string) => { const h = harmonyChord(parseXml(xml).kids[0]); return h ? h.chord.symbol + (h.approx ? ' ~' : '') : 'none'; };

describe('XML reader', () => {
  it('elements, attributes, text, entities; comments and the DOCTYPE are skipped', () => {
    const d = parseXml('<?xml version="1.0"?><!-- hi --><a x="1" y=\'two\'><b>R&amp;B</b><c/><b>&#9837;</b></a>');
    expect(d.kids).toHaveLength(1);
    expect(d.kids[0].attrs).toEqual({ x: '1', y: 'two' });
    expect(d.kids[0].kids.map(k => [k.tag, k.text])).toEqual([['b', 'R&B'], ['c', ''], ['b', '♭']]);
  });
});

describe('chord symbols (<harmony>)', () => {
  it('the common kinds', () => {
    expect(sym(harm('C', 'major-seventh'))).toBe('Cmaj7');
    expect(sym(harm('D', 'minor-seventh'))).toBe('Dm7');
    expect(sym(harm('G', 'dominant'))).toBe('G7');
    expect(sym(harm('B', 'half-diminished'))).toBe('Bm7♭5');
    expect(sym(harm('C', 'diminished-seventh', { alter: 1 }))).toBe('C♯°7');
    expect(sym(harm('E', 'major', { alter: -1 }))).toBe('E♭');
    expect(sym(harm('A', 'minor'))).toBe('Am');
    expect(sym(harm('F', 'major-sixth'))).toBe('F6');
    expect(sym(harm('G', 'dominant-13th'))).toBe('G13');
    expect(sym(harm('D', 'minor-ninth'))).toBe('Dm9');
    expect(sym(harm('G', 'suspended-fourth'))).toBe('Gsus4');
  });
  it('altered and added notes', () => {
    expect(sym(harm('G', 'dominant', { degrees: [[9, -1, 'add']] }))).toBe('G7♭9');
    expect(sym(harm('G', 'dominant', { degrees: [[9, 1, 'add'], [13, -1, 'add']] }))).toBe('G7♯9♭13');
    expect(sym(harm('C', 'major-seventh', { degrees: [[11, 1, 'add']] }))).toBe('Cmaj7♯11');
    expect(sym(harm('G', 'dominant', { degrees: [[13, 0, 'add']] }))).toBe('G13');
    expect(sym(harm('D', 'minor-seventh', { degrees: [[11, 0, 'add']] }))).toBe('Dm7add11'); // an 11 with no 9
    expect(sym(harm('C', 'major', { degrees: [[9, 0, 'add']] }))).toBe('Cadd9');
    expect(sym(harm('B', 'minor-seventh', { degrees: [[5, -1, 'alter']] }))).toBe('Bm7♭5');
  });
  it('slash chords', () => {
    expect(sym(harm('C', 'major', { bass: 'G' }))).toBe('C/G');
    expect(sym(harm('F', 'major', { bass: 'G' }))).toBe('F/G');
  });
  it('a symbol the app has no chord type for falls back to the nearest plain chord, marked as approximate', () => {
    expect(sym(harm('G', 'dominant', { degrees: [[5, 1, 'alter'], [9, 1, 'add']] }))).toBe('G7 ~');
    expect(sym('<harmony><root><root-step>C</root-step></root><kind>none</kind></harmony>')).toBe('none');
  });
});

describe('reading a lead sheet', () => {
  /* | Cmaj7: E half, D quarter, C quarter | Dm7: F half  G7: B half | Cmaj7: C whole (tied over two bars) | */
  const xml = score([
    `<direction><sound tempo="96"/></direction>${harm('C', 'major-seventh')}${note('E', 5, 4)}${note('D', 5, 2)}${note('C', 5, 2)}`,
    `${harm('D', 'minor-seventh')}${note('F', 5, 4)}${harm('G', 'dominant')}${note('B', 4, 4)}`,
    `${harm('C', 'major-seventh')}${note('C', 5, 8, '<tie type="start"/>')}`,
    `${note('C', 5, 8, '<tie type="stop"/>')}`,
  ]);
  const s = parseMusicXml(xml);
  it('title, key, time signature and tempo', () => {
    expect(s.title).toBe('Test & Tune');
    expect(s.key).toEqual({ pc: 0, mode: 'major' });
    expect(s.timeSigs).toEqual([{ tick: 0, num: 4, den: 4 }]);
    expect(s.tempos).toEqual([{ tick: 0, us: 625000 }]);
    expect(s.end).toBe(16 * Q);
  });
  it('notes with their start and length in ticks; a tie makes one long note', () => {
    expect(s.tracks).toHaveLength(1);
    expect(s.tracks[0].name).toBe('Lead');
    expect(s.tracks[0].notes.map(n => [n.tick, n.dur, n.midi])).toEqual([[0, 2 * Q, 76], [2 * Q, Q, 74], [3 * Q, Q, 72], [4 * Q, 2 * Q, 77], [6 * Q, 2 * Q, 71], [8 * Q, 8 * Q, 72]]);
  });
  it('chord symbols at the beat where they are written', () => {
    expect(s.given.map(g => [g.tick, g.chord.symbol])).toEqual([[0, 'Cmaj7'], [4 * Q, 'Dm7'], [6 * Q, 'G7'], [8 * Q, 'Cmaj7']]);
  });
});

describe('piano scores', () => {
  it('chords, two staves with <backup>, rests and accidentals', () => {
    const m = `${note('E', 4, 4, '<staff>1</staff>')}${note('G', 4, 4, '<chord/><staff>1</staff>')}${note('B', 4, 4, '<chord/><staff>1</staff>', -1)}${rest(4)}<backup><duration>8</duration></backup>${note('C', 3, 8, '<staff>2</staff>')}`;
    const s = parseMusicXml(score([m]));
    expect(s.tracks.map(t => t.name)).toEqual(['Lead · upper staff', 'Lead · lower staff']);
    expect(s.tracks[0].notes.map(n => [n.tick, n.dur, n.midi])).toEqual([[0, 2 * Q, 64], [0, 2 * Q, 67], [0, 2 * Q, 70]]);
    expect(s.tracks[1].notes.map(n => [n.tick, n.dur, n.midi])).toEqual([[0, 4 * Q, 48]]);
    expect(s.given).toEqual([]);
  });
  it('keys: three flats = E♭ major; one sharp in minor = E minor', () => {
    const k = (fifths: number, mode: string) => parseMusicXml(score([note('C', 4, 8)], `<divisions>2</divisions><key><fifths>${fifths}</fifths><mode>${mode}</mode></key>`)).key;
    expect(k(-3, 'major')).toEqual({ pc: 3, mode: 'major' });
    expect(k(1, 'minor')).toEqual({ pc: 4, mode: 'minor' });
    expect(k(2, 'major')).toEqual({ pc: 2, mode: 'major' });
  });
  it('a pickup bar ends on a bar line: one quarter of pickup starts on beat 4', () => {
    const s = parseMusicXml(score([note('G', 4, 2), `${harm('C', 'major')}${note('C', 5, 8)}`]));
    expect(s.tracks[0].notes.map(n => [n.tick, n.midi])).toEqual([[3 * Q, 67], [4 * Q, 72]]);
    expect(s.given[0].tick).toBe(4 * Q);
    expect(s.end).toBe(8 * Q);
  });
  it('3/4 and grace notes (grace notes take no time)', () => {
    const s = parseMusicXml(score([`<note><grace/><pitch><step>D</step><octave>5</octave></pitch></note>${note('E', 5, 6)}`], '<divisions>2</divisions><time><beats>3</beats><beat-type>4</beat-type></time>'));
    expect(s.timeSigs).toEqual([{ tick: 0, num: 3, den: 4 }]);
    expect(s.tracks[0].notes.map(n => [n.tick, n.dur, n.midi])).toEqual([[0, 3 * Q, 76]]);
  });
  it('says what is wrong with files it cannot read', () => {
    expect(() => parseMusicXml('<html><body>hello</body></html>')).toThrow(ScoreError);
    expect(() => parseMusicXml('<score-timewise></score-timewise>')).toThrow(/timewise/);
    expect(() => parseMusicXml('<score-partwise><part id="P1"><measure number="1"></measure></part></score-partwise>')).toThrow(/no notes/);
  });
});

describe('compressed scores (.mxl)', () => {
  /* a zip with a container file and one deflated score, built by hand */
  const enc = new TextEncoder();
  function zip(files: { name: string; text: string; store?: boolean }[]): Uint8Array {
    const le16 = (v: number) => [v & 255, (v >> 8) & 255], le32 = (v: number) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
    const out: number[] = [], central: number[] = [];
    files.forEach(f => {
      const raw = enc.encode(f.text), data = f.store ? raw : new Uint8Array(deflateRawSync(raw)), name = enc.encode(f.name), at = out.length;
      const common = [...le16(20), ...le16(0), ...le16(f.store ? 0 : 8), ...le16(0), ...le16(0), ...le32(0), ...le32(data.length), ...le32(raw.length), ...le16(name.length), ...le16(0)];
      out.push(0x50, 0x4b, 3, 4, ...common, ...name, ...data);
      central.push(0x50, 0x4b, 1, 2, ...le16(20), ...common, ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(at), ...name);
    });
    const cd = out.length;
    out.push(...central, 0x50, 0x4b, 5, 6, ...le16(0), ...le16(0), ...le16(files.length), ...le16(files.length), ...le32(central.length), ...le32(cd), ...le16(0));
    return new Uint8Array(out);
  }
  const xml = score([`${harm('F', 'major-seventh')}${note('A', 4, 8)}`]);
  const mxl = zip([{ name: 'META-INF/container.xml', text: '<container><rootfiles><rootfile full-path="tune.musicxml"/></rootfiles></container>', store: true }, { name: 'tune.musicxml', text: xml }]);
  it('lists the files and reads the score the container points to', async () => {
    expect(isZip(mxl)).toBe(true);
    expect(zipEntries(mxl).map(f => [f.name, f.method])).toEqual([['META-INF/container.xml', 0], ['tune.musicxml', 8]]);
    const s = parseMusicXml(await scoreText(mxl));
    expect(s.given.map(g => g.chord.symbol)).toEqual(['Fmaj7']);
    expect(s.tracks[0].notes[0].midi).toBe(69);
  });
  it('plain MusicXML text passes straight through', async () => {
    expect(isZip(enc.encode(xml))).toBe(false);
    expect(await scoreText(enc.encode(xml))).toBe(xml);
  });
});
