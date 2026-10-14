import {
  CATALOG_VERSION,
  COLOR_IDS,
  assertPosition,
  canonical,
  counts,
  initial,
  isWon,
  replay,
  type Level,
} from "./model";
import { LEVEL_COUNT, LEVELS_PER_CHAPTER } from "./campaign";
import { difficultyRating, mixing } from "./catalog-difficulty";
// Exhaust all <= 8! color renamings, sorting bottles each time: exact duplicate check up to both symmetries.
export function shapeKey(level: Level): string {
  const colors = [...new Set(level.bottles.flat())];
  let best: string | undefined;
  const visit = (remaining: string[], order: string[]) => {
    if (!remaining.length) {
      const map = Object.fromEntries(order.map((c, i) => [c, String(i)]));
      const key =
        level.bottles
          .map((b) => b.map((c) => map[c]).join(""))
          .sort()
          .join("|") +
        "#" +
        (level.collector ? map[level.collector.color] : "-");
      if (best === undefined || key < best) best = key;
      return;
    }
    for (let i = 0; i < remaining.length; i++)
      visit(
        remaining.filter((_, j) => i !== j),
        [...order, remaining[i]],
      );
  };
  visit(colors, []);
  return best!;
}
export function validateLevel(level: Level): void {
  if (
    level.catalogVersion !== CATALOG_VERSION ||
    !Number.isInteger(level.id) ||
    level.id < 1 ||
    level.id > LEVEL_COUNT ||
    level.chapter !== Math.ceil(level.id / LEVELS_PER_CHAPTER)
  )
    throw Error("Neplatná metadata levelu");
  if (
    (level.id % 5 === 0) !== (level.mode === "collector") ||
    (level.mode === "collector") !== !!level.collector
  )
    throw Error("Nesprávný režim");
  if (
    level.collector &&
    (level.collector.capacity !== 8 ||
      !COLOR_IDS.includes(level.collector.color))
  )
    throw Error("Neplatný sběr");
  const p = initial(level);
  assertPosition(p, level);
  const cs = counts(p, level),
    n = Object.keys(cs).length;
  const min = level.id <= 3 ? 2 : level.id <= 10 ? 3 : level.id <= 20 ? 5 : 6;
  const max =
    level.id <= 3
      ? 3
      : level.id <= 10
        ? 4
        : level.id <= 20
          ? 6
          : level.collector
            ? 7
            : 8;
  if (
    n < min ||
    n > max ||
    p.bottles.length !== n + (level.collector ? 3 : 2) ||
    p.bottles.length > 10
  )
    throw Error(`Level ${level.id}: počty baněk/barev`);
  if (level.id > 30 && n !== (level.collector ? 7 : 8))
    throw Error("Pokročilé kapitoly vyžadují plný počet barev");
  if (
    p.bottles.filter((b) => b.length === 0).length !== 2 ||
    p.bottles.some((b) => b.length !== 0 && b.length !== 4)
  )
    throw Error("Počáteční zaplnění");
  for (const [c, count] of Object.entries(cs))
    if (count !== (c === level.collector?.color ? 8 : 4))
      throw Error("Počet jednotek barvy");
  if (isWon(p, level)) throw Error("Start je již vyhraný");
  if (!level.solution.length || level.parMoves !== level.solution.length)
    throw Error("Neplatný par");
  const finish = replay(level);
  assertPosition(finish, level);
  if (!isWon(finish, level))
    throw Error(`Level ${level.id}: certifikát nevyhrál`);
  if (level.id > 50) {
    const d = level.difficulty;
    const actual = mixing(level);
    if (!d || !Number.isInteger(d.searchStates) || d.searchStates < 1 ||
      d.searchStates > 20000 || d.transitions !== actual.transitions ||
      d.spread !== actual.spread || actual.transitions < 22 ||
      Object.keys(cs).some((c) => level.bottles.filter((b) => b.some((unit) => unit === c)).length < 3) ||
      d.rating !== difficultyRating(level.parMoves, d.searchStates, actual.transitions, actual.spread, level.mode))
      throw Error(`Level ${level.id}: neplatný profil obtížnosti`);
  }
}
export function validateCatalog(levels: Level[], expected = LEVEL_COUNT): void {
  if (levels.length !== expected) throw Error(`Očekáváno ${expected} levelů`);
  const shapes = new Set<string>(),
    ids = new Set<number>();
  for (const [index, l] of levels.entries()) {
    if (l.id !== index + 1) throw Error("Nesouvislé pořadí levelů");
    validateLevel(l);
    if (l.id > 51 && (l.difficulty!.rating <= levels[index - 1].difficulty!.rating ||
      l.parMoves < levels[index - 1].parMoves))
      throw Error(`Level ${l.id}: obtížnost není rostoucí`);
    const key = shapeKey(l);
    if (shapes.has(key) || ids.has(l.id))
      throw Error(`Duplicitní level ${l.id}`);
    shapes.add(key);
    ids.add(l.id);
  }
  if (canonical(initial(levels[0])) === "") throw Error("Prázdný katalog");
}
