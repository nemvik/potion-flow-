import { describe, it, expect } from "vitest";
import {
  applyMove,
  assertPosition,
  certificateHint,
  counts,
  hash,
  initial,
  isWon,
  legalMoves,
  play,
  recordWin,
  replay,
  starsFor,
  status,
  undo,
  unlocked,
  type Level,
  type Move,
  type Position,
} from "../src/game/model";
import { solve } from "../src/game/solver";
const classic: Level = {
  id: 1,
  catalogVersion: 1,
  chapter: 1,
  mode: "classic",
  bottles: [["R", "R", "B", "B"], ["B", "B", "R", "R"], [], []],
  solution: [
    [0, 2],
    [1, 0],
    [1, 2],
  ],
  parMoves: 3,
  difficultyNote: "",
};
const collector: Level = {
  ...classic,
  id: 5,
  mode: "collector",
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
  solution: [
    [0, "collector"],
    [1, 0],
    [2, 1],
    [3, 2],
    [3, "collector"],
    [4, "collector"],
  ],
  parMoves: 6,
};
describe("přesný kontrakt přelévání", () => {
  it("přesune celý vrchní blok a zachová původní snapshot", () => {
    const g = initial(classic),
      n = play(g, classic, [0, 2]);
    expect(n.bottles[0]).toEqual(["R", "R"]);
    expect(n.bottles[2]).toEqual(["B", "B"]);
    expect(g.bottles[0]).toHaveLength(4);
    expect(n.history).toHaveLength(1);
  });
  it("slévá shodné barvy a respektuje částečnou kapacitu", () => {
    const p: Position = {
      bottles: [["R", "B", "B", "B"], ["R", "B", "B"], [], []],
      collectorUnits: 0,
    };
    expect(applyMove(p, classic, [0, 1])?.bottles).toEqual([
      ["R", "B", "B"],
      ["R", "B", "B", "B"],
      [],
      [],
    ]);
  });
  it.each<Move>([
    [2, 0],
    [0, 0],
    [0, 1],
    [-1, 2],
    [0, 100],
    [NaN, 2],
    [0, 1.2],
  ])("odmítá neplatný tah %j bez historie", (...move) => {
    const g = initial(classic);
    expect(play(g, classic, move)).toBe(g);
  });
  it("plný jednobarevný zdroj zůstává hratelný", () => {
    const p = {
      bottles: [["R", "R", "R", "R"], ["B", "R"], [], []],
      collectorUnits: 0,
    } as Position;
    expect(applyMove(p, classic, [0, 2])?.bottles[2]).toHaveLength(4);
  });
  it("Classic vyžaduje plné jednobarevné baňky", () => {
    expect(
      isWon(
        {
          bottles: [["R", "R"], ["R", "R"], ["B", "B", "B", "B"], []],
          collectorUnits: 0,
        },
        classic,
      ),
    ).toBe(false);
    expect(isWon(replay(classic), classic)).toBe(true);
  });
  it("přehraje referenční 4barevný příklad", () => {
    const l: Level = {
      ...classic,
      bottles: [
        ["R", "R", "B", "B"],
        ["B", "B", "G", "G"],
        ["G", "G", "Y", "Y"],
        ["Y", "Y", "R", "R"],
        [],
        [],
      ],
      solution: [
        [0, 4],
        [3, 0],
        [2, 3],
        [1, 2],
        [1, 4],
      ],
    };
    expect(isWon(replay(l), l)).toBe(true);
  });
  it("Sběr přijímá jen cílovou barvu a je vratný", () => {
    const g = initial(collector);
    expect(play(g, collector, [1, "collector"])).toBe(g);
    const n = play(g, collector, [0, "collector"]);
    expect(n.collectorUnits).toBe(2);
    expect(undo(n)).toEqual(g);
    expect(counts(n, collector)).toEqual(counts(g, collector));
    expect(isWon(replay(collector), collector)).toBe(true);
  });
  it("Sběr nemůže být zdroj; kapacita nepřeteče", () => {
    const p = initial(collector);
    p.collectorUnits = 7;
    expect(applyMove(p, collector, [0, "collector"])?.collectorUnits).toBe(8);
    expect(
      applyMove(p, collector, ["collector" as unknown as number, 0]),
    ).toBeNull();
  });
  it("plná nádrž sama nevyhrává a bez nádrže Sběr nekončí", () => {
    const p = replay(collector);
    p.bottles[1] = ["B", "G"];
    expect(isWon(p, collector)).toBe(false);
    expect(
      isWon(
        {
          bottles: [
            ["O", "O", "O", "O"],
            ["O", "O", "O", "O"],
            ["R", "R", "R", "R"],
            [],
            [],
          ],
          collectorUnits: 0,
        },
        collector,
      ),
    ).toBe(false);
  });
  it.each([classic, collector])(
    "náhodné legální sekvence zachovají invarianty a celou historii lze vrátit: $mode",
    (l) => {
      let g = initial(l),
        seed = 42;
      for (let i = 0; i < 200; i++) {
        const moves = legalMoves(g, l);
        if (!moves.length) break;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        g = play(g, l, moves[seed % moves.length]);
        assertPosition(g, l);
        expect(counts(g, l)).toEqual(counts(initial(l), l));
      }
      while (g.history.length) g = undo(g);
      expect(g).toEqual(initial(l));
    },
  );
  it("výhra má přednost před no-legal-moves", () =>
    expect(status(replay(classic), classic)).toBe("won"));
  it("přehrání odmítne poškozenou historii", () =>
    expect(() => replay(classic, [[0, 1]])).toThrow());
  it("kontroluje neznámé barvy a kapacity", () => {
    const p = initial(classic);
    p.bottles[0] = ["X" as "R"];
    expect(() => assertPosition(p, classic)).toThrow();
  });
});
describe("aktuální nápověda a skóre", () => {
  it("certifikát se hledá podle boardu", () => {
    let g = initial(classic);
    expect(certificateHint(classic, g)).toEqual([0, 2]);
    g = play(g, classic, [0, 2]);
    expect(certificateHint(classic, g)).toEqual([1, 0]);
  });
  it("solver najde a přehraje řešení po odbočení", () => {
    const g = play(initial(classic), classic, [1, 3]),
      key = hash(g);
    const r = solve(g, classic);
    expect(r.status).toBe("solved");
    if (r.status === "solved") {
      let p: Position = g;
      for (const m of r.solution) p = applyMove(p, classic, m)!;
      expect(isWon(p, classic)).toBe(true);
    }
    expect(hash(g)).toBe(key);
  });
  it("timeout a paměťový limit nejsou důkaz neřešitelnosti", () => {
    expect(solve(initial(classic), classic, { maxMs: 0 }).status).toBe(
      "timeout",
    );
    expect(solve(initial(classic), classic, { maxStates: 1 }).status).toBe(
      "unknown",
    );
  });
  it("úplné vyčerpání prostoru prokáže neřešitelnost", () => {
    expect(
      solve(
        {
          bottles: [
            ["R", "B", "R", "B"],
            ["B", "R", "B", "R"],
          ],
          collectorUnits: 0,
        },
        classic,
      ).status,
    ).toBe("proven-unsolvable");
  });
  it("hvězdy na všech hranicích", () => {
    for (let par = 1; par <= 50; par++) {
      expect(starsFor(par, par)).toBe(3);
      expect(starsFor(par + 1, par)).toBe(2);
      expect(starsFor(Math.ceil(par * 1.35), par)).toBe(2);
      expect(starsFor(Math.ceil(par * 1.35) + 1, par)).toBe(1);
    }
  });
  it("výsledky jsou idempotentní, nezhoršují se a neodemknou 101", () => {
    const a = recordWin({}, classic, 3),
      b = recordWin(a, classic, 6);
    expect(b).toBe(a);
    expect(unlocked(b)).toBe(2);
    expect(recordWin(a, classic, 3)).toBe(a);
    expect(
      unlocked(
        Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            i + 1,
            { stars: 1, bestMoves: 999 },
          ]),
        ),
      ),
    ).toBe(100);
  });
  it("původně dokončená kampaň nově odemkne level 31", () => {
    expect(unlocked(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, { stars: 3, bestMoves: 30 }])))).toBe(31);
  });
  it("dokončení původních 50 levelů odemkne 51", () => {
    expect(unlocked(Object.fromEntries(Array.from({ length: 50 }, (_, i) => [i + 1, { stars: 3, bestMoves: 30 }])))).toBe(51);
  });
});
