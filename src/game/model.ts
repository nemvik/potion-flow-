import { LEVEL_COUNT } from "./campaign";
export const COLOR_IDS = ["R", "O", "Y", "G", "B", "V", "P", "W"] as const;
export type Color = (typeof COLOR_IDS)[number];
export type Target = number | "collector";
export type Move = readonly [number, Target];
export interface Position {
  bottles: Color[][];
  collectorUnits: number;
}
export interface Level {
  id: number;
  catalogVersion: number;
  chapter: number;
  mode: "classic" | "collector";
  bottles: Color[][];
  collector?: { color: Color; capacity: 8 };
  solution: Move[];
  parMoves: number;
  difficultyNote: string;
  difficulty?: {
    rating: number;
    searchStates: number;
    transitions: number;
    spread: number;
  };
}
export interface HistoryEntry {
  move: Move;
  before: Position;
}
export interface Game extends Position {
  levelId: number;
  catalogVersion: number;
  history: HistoryEntry[];
}
export interface Pour {
  color: Color;
  amount: number;
}
export const CAPACITY = 4;
export const CATALOG_VERSION = 1;
export function initial(level: Level): Game {
  return {
    levelId: level.id,
    catalogVersion: level.catalogVersion,
    bottles: level.bottles.map((b) => [...b]),
    collectorUnits: 0,
    history: [],
  };
}
export function position(p: Position): Position {
  return {
    bottles: p.bottles.map((b) => [...b]),
    collectorUnits: p.collectorUnits,
  };
}
export function hash(p: Position): string {
  return p.bottles.map((b) => b.join("")).join("|") + "#" + p.collectorUnits;
}
export function canonical(p: Position): string {
  return (
    p.bottles
      .map((b) => b.join(""))
      .sort()
      .join("|") +
    "#" +
    p.collectorUnits
  );
}
export function topRun(b: readonly Color[]): Pour | null {
  const color = b.at(-1);
  if (!color) return null;
  let amount = 1;
  while (b[b.length - 1 - amount] === color) amount++;
  return { color, amount };
}
export function isDone(b: readonly Color[]): boolean {
  return b.length === 4 && b.every((c) => c === b[0]);
}
export function checkMove(
  p: Position,
  level: Pick<Level, "collector">,
  move: Move,
): Pour | null {
  const [from, to] = move;
  if (
    !Number.isInteger(from) ||
    from < 0 ||
    from >= p.bottles.length ||
    from === to
  )
    return null;
  const run = topRun(p.bottles[from]);
  if (!run) return null;
  if (to === "collector") {
    if (
      !level.collector ||
      run.color !== level.collector.color ||
      p.collectorUnits >= 8
    )
      return null;
    return { ...run, amount: Math.min(run.amount, 8 - p.collectorUnits) };
  }
  if (!Number.isInteger(to) || to < 0 || to >= p.bottles.length) return null;
  const target = p.bottles[to];
  if (target.length >= 4 || (target.length > 0 && target.at(-1) !== run.color))
    return null;
  return { ...run, amount: Math.min(run.amount, 4 - target.length) };
}
export function applyMove(
  p: Position,
  level: Pick<Level, "collector">,
  move: Move,
): Position | null {
  const pour = checkMove(p, level, move);
  if (!pour) return null;
  const next = position(p);
  const [from, to] = move;
  next.bottles[from].splice(-pour.amount);
  if (to === "collector") next.collectorUnits += pour.amount;
  else next.bottles[to].push(...Array<Color>(pour.amount).fill(pour.color));
  return next;
}
export function play(game: Game, level: Level, move: Move): Game {
  const next = applyMove(game, level, move);
  if (!next) return game;
  return {
    ...game,
    ...next,
    history: [...game.history, { move, before: position(game) }],
  };
}
export function undo(game: Game): Game {
  const last = game.history.at(-1);
  if (!last) return game;
  return {
    ...game,
    ...position(last.before),
    history: game.history.slice(0, -1),
  };
}
export function isWon(p: Position, level: Pick<Level, "collector">): boolean {
  if (
    level.collector &&
    (p.collectorUnits !== 8 ||
      p.bottles.some((b) => b.includes(level.collector!.color)))
  )
    return false;
  return p.bottles.every((b) => b.length === 0 || isDone(b));
}
export function legalMoves(
  p: Position,
  level: Pick<Level, "collector">,
): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < p.bottles.length; from++) {
    for (let to = 0; to < p.bottles.length; to++)
      if (checkMove(p, level, [from, to])) moves.push([from, to]);
    if (checkMove(p, level, [from, "collector"]))
      moves.push([from, "collector"]);
  }
  return moves;
}
export function status(
  p: Position,
  level: Level,
): "won" | "playing" | "no-legal-moves" {
  return isWon(p, level)
    ? "won"
    : legalMoves(p, level).length
      ? "playing"
      : "no-legal-moves";
}
export function counts(
  p: Position,
  level: Pick<Level, "collector">,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const b of p.bottles)
    for (const c of b) result[c] = (result[c] ?? 0) + 1;
  if (level.collector)
    result[level.collector.color] =
      (result[level.collector.color] ?? 0) + p.collectorUnits;
  return result;
}
export function assertPosition(p: Position, level: Level): void {
  if (
    p.bottles.length !== level.bottles.length ||
    !Number.isInteger(p.collectorUnits) ||
    p.collectorUnits < 0 ||
    p.collectorUnits > 8 ||
    (!level.collector && p.collectorUnits !== 0)
  )
    throw Error("Neplatný tvar herního stavu");
  if (
    p.bottles.some(
      (b) =>
        !Array.isArray(b) ||
        b.length > 4 ||
        b.some((c) => !COLOR_IDS.includes(c)),
    )
  )
    throw Error("Neplatný obsah baňky");
  const expected = counts(initial(level), level),
    actual = counts(p, level);
  if (
    Object.keys(actual).length !== Object.keys(expected).length ||
    Object.entries(expected).some(([c, n]) => actual[c] !== n)
  )
    throw Error("Nesouhlasí počty jednotek");
}
export function replay(
  level: Level,
  moves: readonly Move[] = level.solution,
): Game {
  let game = initial(level);
  for (const move of moves) {
    const next = play(game, level, move);
    if (next === game)
      throw Error(`Level ${level.id}: nelegální tah ${JSON.stringify(move)}`);
    game = next;
  }
  return game;
}
export function certificateHint(level: Level, p: Position): Move | null {
  let current: Position = initial(level);
  const key = hash(p);
  for (const move of level.solution) {
    if (hash(current) === key) return move;
    const next = applyMove(current, level, move);
    if (!next) return null;
    current = next;
  }
  return null;
}
export function starsFor(moves: number, par: number): number {
  return moves <= par ? 3 : moves <= Math.ceil(par * 1.35) ? 2 : 1;
}
export interface Result {
  stars: number;
  bestMoves: number;
}
export function recordWin(
  results: Record<number, Result>,
  level: Level,
  moves: number,
): Record<number, Result> {
  const old = results[level.id],
    stars = Math.max(old?.stars ?? 0, starsFor(moves, level.parMoves)),
    bestMoves = Math.min(old?.bestMoves ?? Infinity, moves);
  if (old?.stars === stars && old.bestMoves === bestMoves) return results;
  return { ...results, [level.id]: { stars, bestMoves } };
}
export function unlocked(results: Record<number, Result>): number {
  let n = 1;
  while (n < LEVEL_COUNT && results[n]) n++;
  return n;
}
