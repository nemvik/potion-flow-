import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { levels } from "../src/levels";
import { shapeKey, validateCatalog } from "../src/game/catalog-validation";
import { assessDifficulty } from "../scripts/advanced-levels";
import {
  certificateHint,
  checkMove,
  initial,
  isWon,
  replay,
} from "../src/game/model";
describe("stabilní katalog", () => {
  it(
    "všech 100 levelů je unikátních a dopředně vyhrává",
    () => validateCatalog(levels),
    20000,
  );
  it("Sběr je přesně každý pátý level", () =>
    expect(
      levels.filter((l) => l.mode === "collector").map((l) => l.id),
    ).toEqual(Array.from({ length: 20 }, (_, i) => (i + 1) * 5)));
  it("původních 50 zadání a certifikátů se nezměnilo", () => {
    expect(createHash("sha256").update(JSON.stringify(levels.slice(0, 50))).digest("hex"))
      .toBe("2e1bd3463dc900bbf9d97c33ca4ee6c264948c809998c856020cf15a0f3ec038");
  });
  it("nové kapitoly používají rozptýlené barvy a hustší střídání vrstev", () => {
    expect(levels).toHaveLength(100);
    for (const level of levels.slice(30, 50)) {
      const colors = [...new Set(level.bottles.flat())];
      expect(colors).toHaveLength(level.collector ? 7 : 8);
      const transitions = level.bottles.reduce((sum, b) => sum + b.filter((c, i) => i > 0 && b[i - 1] !== c).length, 0);
      expect(transitions).toBeGreaterThanOrEqual(level.id <= 40 ? 22 : 23);
      expect(level.parMoves).toBeGreaterThanOrEqual(level.id <= 40 ? 30 : 31);
      for (const color of colors) expect(level.bottles.filter((b) => b.includes(color)).length).toBeGreaterThanOrEqual(3);
    }
  });
  it("dalších 50 levelů má rostoucí hodnocení a neklesající délku ověřených cest", () => {
    const added = levels.slice(50);
    expect(added).toHaveLength(50);
    const boundary = assessDifficulty(levels[49])!;
    let rating = boundary.difficulty!.rating;
    let moves = 0;
    for (const level of added) {
      const assessed = assessDifficulty(level)!;
      expect(assessed.difficulty).toEqual(level.difficulty);
      expect(assessed.solution).toEqual(level.solution);
      expect(level.difficulty!.rating).toBeGreaterThan(rating);
      expect(level.parMoves).toBeGreaterThanOrEqual(moves);
      rating = level.difficulty!.rating;
      moves = level.parMoves;
    }
  }, 20000);
  it.each(levels)("Level $id má okamžitý legální hint i certifikát", (l) => {
    expect(
      checkMove(initial(l), l, certificateHint(l, initial(l))!),
    ).not.toBeNull();
    expect(isWon(replay(l), l)).toBe(true);
  });
  it("kanonické duplikáty odhalí i přejmenování a prohození baněk", () => {
    const l = levels[2];
    const map = { R: "B", B: "G", G: "R" } as const;
    const renamed = {
      ...l,
      bottles: l.bottles
        .map((b) => b.map((c) => map[c as keyof typeof map]))
        .reverse(),
    };
    expect(shapeKey(l)).toBe(shapeKey(renamed));
  });
});
