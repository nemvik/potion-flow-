import { CATALOG_VERSION, COLOR_IDS, isWon, replay, type Color, type Level, type Move } from "../src/game/model";
import { solveLevel } from "../src/game/solver";
import { shapeKey } from "../src/game/catalog-validation";
import { difficultyRating, mixing } from "../src/game/catalog-difficulty";

export function assessDifficulty(level: Level): Level | null {
  const full = level.bottles.length - 2;
  const orders = [
    level.bottles.map((_, i) => i),
    [...Array.from({ length: full }, (_, i) => full - 1 - i), full, full + 1],
    [...Array.from({ length: full }, (_, i) => (i + 3) % full), full, full + 1],
  ];
  let solution: Move[] | undefined;
  let searchStates = Infinity;
  for (const order of orders) {
    const result = solveLevel(
      { ...level, bottles: order.map((i) => level.bottles[i]) },
      { maxStates: 20000, maxMs: 5000 },
    );
    if (result.status !== "solved") return null;
    searchStates = Math.min(searchStates, result.visited);
    if (!solution || result.solution.length < solution.length) {
      solution = result.solution.map(([from, to]) => [order[from], to === "collector" ? to : order[to]]);
    }
  }
  const { transitions, spread } = mixing(level);
  const assessed = {
    ...level, solution: solution!, parMoves: solution!.length,
    difficulty: {
      rating: difficultyRating(solution!.length, searchStates, transitions, spread, level.mode),
      searchStates, transitions, spread,
    },
  };
  if (!isWon(replay(assessed), assessed)) throw Error("Přemapovaný certifikát nevyhrál");
  return assessed;
}

export function generateAdvancedLevels(existing: Level[], seed: number): Level[] {
  let rng = (seed ^ 0x6d2b79f5) >>> 0;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const deadline = performance.now() + 120000;
  const pools: Record<Level["mode"], Level[]> = { classic: [], collector: [] };
  const quotas = new Map([[28, 160], [29, 160], [30, 48]]);
  for (const mode of ["classic", "collector"] as const) {
    const collected = new Map([[28, 0], [29, 0], [30, 0]]);
    for (let attempt = 0; attempt < 120000; attempt++) {
      if ([...quotas].every(([moves, quota]) => collected.get(moves)! >= quota)) break;
      if (performance.now() > deadline) throw Error("Limit přípravy pokročilých levelů vyčerpán; katalog nebyl uložen");
      const colors = COLOR_IDS.slice(0, mode === "classic" ? 8 : 7);
      const units = colors.flatMap((c) => Array<Color>(mode === "collector" && c === "O" ? 8 : 4).fill(c));
      for (let i = units.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [units[i], units[j]] = [units[j], units[i]];
      }
      const bottles: Color[][] = [];
      for (let i = 0; i < units.length; i += 4) bottles.push(units.slice(i, i + 4));
      bottles.push([], []);
      const base: Level = {
        id: mode === "classic" ? 51 : 55, chapter: 6, catalogVersion: CATALOG_VERSION, mode, bottles,
        collector: mode === "collector" ? { color: "O", capacity: 8 } : undefined,
        solution: [], parMoves: 0, difficultyNote: "",
      };
      const { transitions } = mixing(base);
      if (transitions < 22 || colors.some((c) => bottles.filter((b) => b.includes(c)).length < 3)) continue;
      const candidate = assessDifficulty(base);
      if (!candidate || !quotas.has(candidate.parMoves)) continue;
      if (collected.get(candidate.parMoves)! >= quotas.get(candidate.parMoves)!) continue;
      collected.set(candidate.parMoves, collected.get(candidate.parMoves)! + 1);
      pools[mode].push(candidate);
    }
    console.log(`Pokročilí kandidáti ${mode}: ${JSON.stringify(Object.fromEntries(collected))}`);
    if ([...quotas].some(([moves, quota]) => collected.get(moves)! < quota))
      throw Error(`Nedostatek ověřených kandidátů ${mode}; katalog nebyl uložen`);
    pools[mode].sort((a, b) => a.difficulty!.rating - b.difficulty!.rating || JSON.stringify(a.bottles).localeCompare(JSON.stringify(b.bottles), "en"));
    for (const moves of quotas.keys()) {
      const ratings = pools[mode].filter((l) => l.parMoves === moves).map((l) => l.difficulty!.rating);
      console.log(`${mode}, ${moves} tahů: odhad ${Math.min(...ratings)}–${Math.max(...ratings)}`);
    }
  }
  const boundary = assessDifficulty(existing[49]);
  if (!boundary) throw Error("Nelze posoudit návaznost na L50");
  console.log(`Návaznost na L50: odhad ${boundary.difficulty!.rating}`);
  const knownShapes = new Set(existing.map(shapeKey));
  for (const step of [3, 2, 1, 0.1]) {
    const shapes = new Set(knownShapes);
    const selected: Level[] = [];
    let previousRating = boundary.difficulty!.rating;
    for (let id = 51; id <= 100; id++) {
      const mode = id % 5 === 0 ? "collector" : "classic";
      const moves = id <= 60 ? 28 : id <= 80 ? 29 : 30;
      const candidate = pools[mode].find((l) => {
        if (l.parMoves !== moves || l.difficulty!.rating < previousRating + step) return false;
        return !shapes.has(shapeKey(l));
      });
      if (!candidate) {
        console.log(`Krok ${step}: nelze zařadit L${id} nad odhad ${previousRating}`);
        break;
      }
      const level: Level = {
        ...candidate, id, chapter: Math.ceil(id / 10),
        difficultyNote: `Pokročilá kapitola ${Math.ceil(id / 10)}: rozptýlené barvy a postupně náročnější plánování dvou volných baněk.`,
      };
      selected.push(level);
      shapes.add(shapeKey(level));
      previousRating = level.difficulty!.rating;
    }
    if (selected.length === 50) {
      for (const l of selected) console.log(`Level ${l.id}: ${l.parMoves} tahů, odhad ${l.difficulty!.rating}, ${l.difficulty!.searchStates} pozic`);
      return selected;
    }
  }
  throw Error("Z ověřeného poolu nelze sestavit rostoucí obtížnost; katalog nebyl uložen");
}
