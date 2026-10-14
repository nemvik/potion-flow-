import { readFileSync, writeFileSync } from "node:fs";
import {
  CATALOG_VERSION,
  COLOR_IDS,
  initial,
  isWon,
  replay,
  type Color,
  type Level,
} from "../src/game/model";
import { solveLevel } from "../src/game/solver";
import { shapeKey, validateCatalog } from "../src/game/catalog-validation";
const seed = Number(
  process.argv.find((a) => a.startsWith("--seed="))?.split("=")[1] ?? 74129,
);
const count = Number(
  process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] ?? 30,
);
if (!Number.isSafeInteger(seed) || ![5, 30].includes(count))
  throw Error("Použij --seed=<celé číslo> a --count=5|30");
let rng = seed >>> 0;
function random() {
  rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  return rng / 4294967296;
}
const handcrafted: Partial<Level>[] = [
  {
    bottles: [["R", "R", "B", "B"], ["B", "B", "R", "R"], [], []],
    solution: [
      [0, 2],
      [1, 0],
      [1, 2],
    ],
    difficultyNote: "Vyber zdroj, volné místo, pak spoj stejnou barvu.",
  },
  {
    bottles: [["R", "R", "R", "B"], ["B", "B", "B", "R"], [], []],
    difficultyNote:
      "Jednotlivá vrstva a souvislý blok se přelévají v jednom tahu.",
  },
  {
    bottles: [
      ["R", "R", "B", "B"],
      ["B", "B", "G", "G"],
      ["G", "G", "R", "R"],
      [],
      [],
    ],
    difficultyNote: "Tři barvy: nejdříve odkryj barvu, kterou chceš spojit.",
  },
  {
    bottles: [
      ["R", "B", "R", "B"],
      ["B", "G", "B", "G"],
      ["G", "R", "G", "R"],
      [],
      [],
    ],
    difficultyNote: "Střídání vrstev vyžaduje myslet několik tahů dopředu.",
  },
  {
    bottles: [
      ["R", "R", "O", "O"],
      ["B", "B", "R", "R"],
      ["G", "G", "B", "B"],
      ["O", "O", "G", "G"],
      ["O", "O", "O", "O"],
      [],
      [],
    ],
    collector: { color: "O", capacity: 8 },
    difficultyNote: "První Sběr: jantar odebírej výslovně do nádrže.",
  },
];
const levels: Level[] = [],
  shapes = new Set<string>();
for (let id = 1; id <= count; id++) {
  const mode = id % 5 === 0 ? "collector" : "classic",
    chapter = Math.ceil(id / 10);
  let accepted: Level | undefined;
  for (let attempt = 0; attempt < 100 && !accepted; attempt++) {
    const n =
      id <= 3
        ? id === 3
          ? 3
          : 2
        : id <= 10
          ? id <= 6
            ? 3
            : 4
          : id <= 20
            ? id < 16
              ? 5
              : 6
            : mode === "collector"
              ? id === 30
                ? 7
                : 6
              : id < 24
                ? 6
                : id < 28
                  ? 7
                  : 8;
    const colors = COLOR_IDS.slice(0, n),
      collector =
        mode === "collector"
          ? { color: "O" as Color, capacity: 8 as const }
          : undefined;
    const units = colors.flatMap((c) =>
      Array<Color>(c === collector?.color ? 8 : 4).fill(c),
    );
    // Mild paired layers early; full seeded shuffle later. Every candidate must be solved and replayed.
    if (id < 8) {
      const blocks = colors.flatMap(
        (c) => Array(c === collector?.color ? 4 : 2).fill(c) as Color[],
      );
      for (let i = blocks.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      }
      units.splice(0, units.length, ...blocks.flatMap((c) => [c, c]));
    } else
      for (let i = units.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [units[i], units[j]] = [units[j], units[i]];
      }
    const bottles: Color[][] = [];
    for (let i = 0; i < units.length; i += 4)
      bottles.push(units.slice(i, i + 4));
    bottles.push([], []);
    const base: Level = {
      id,
      catalogVersion: CATALOG_VERSION,
      chapter,
      mode,
      bottles,
      collector,
      solution: [],
      parMoves: 0,
      difficultyNote:
        id <= 10
          ? "Volné místo a skládání bloků."
          : id <= 20
            ? "Více střídání vrstev a volba pořadí."
            : "Plánování osmi barev; ponech si volný buffer.",
      ...(handcrafted[id - 1] ?? {}),
    };
    if (isWon(initial(base), base)) continue;
    if (!base.solution.length) {
      const found = solveLevel(base, { maxMs: 1800, maxStates: 100000 });
      if (found.status !== "solved") continue;
      base.solution = found.solution;
    }
    base.parMoves = base.solution.length;
    if (!isWon(replay(base), base))
      throw Error("Generátor našel chybný certifikát");
    const shape = shapeKey(base);
    if (shapes.has(shape)) continue;
    shapes.add(shape);
    accepted = base;
  }
  if (!accepted)
    throw Error(
      `Level ${id}: limit 100 kandidátů vyčerpán; neověřená data nebyla uložena`,
    );
  levels.push(accepted);
  console.log(
    `Level ${id}: ${accepted.bottles.length} baněk, ${accepted.solution.length} ověřených tahů`,
  );
}
validateCatalog(levels, count);
const destination = new URL("../src/levels/catalog.json", import.meta.url);
const encoded = JSON.stringify(levels, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(destination, "utf8") !== encoded)
    throw Error("Katalog neodpovídá deterministickému výstupu tohoto seedu.");
} else writeFileSync(destination, encoded);
console.log(
  `${process.argv.includes("--check") ? "Zkontrolováno" : "Uloženo"} ${levels.length} certifikátů, seed ${seed}. Ověřené cesty nejsou důkazem optima.`,
);
