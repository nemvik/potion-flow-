import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { levels } from "../src/levels";
import { shapeKey, validateCatalog } from "../src/game/catalog-validation";
import {
  certificateHint,
  checkMove,
  initial,
  isWon,
  replay,
} from "../src/game/model";
describe("stabilní katalog", () => {
  it(
    "všech 50 levelů je unikátních a dopředně vyhrává",
    () => validateCatalog(levels),
    20000,
  );
  it("Sběr je přesně každý pátý level", () =>
    expect(
      levels.filter((l) => l.mode === "collector").map((l) => l.id),
    ).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]));
  it("původních 30 zadání a certifikátů se nezměnilo", () => {
    expect(createHash("sha256").update(JSON.stringify(levels.slice(0, 30))).digest("hex"))
      .toBe("533360d2cbfa81aea84d8d886ab1a1f91aa351d3717af906adc02e4501402053");
  });
  it("nové kapitoly používají rozptýlené barvy a hustší střídání vrstev", () => {
    expect(levels).toHaveLength(50);
    for (const level of levels.slice(30)) {
      const colors = [...new Set(level.bottles.flat())];
      expect(colors).toHaveLength(level.collector ? 7 : 8);
      const transitions = level.bottles.reduce((sum, b) => sum + b.filter((c, i) => i > 0 && b[i - 1] !== c).length, 0);
      expect(transitions).toBeGreaterThanOrEqual(level.id <= 40 ? 22 : 23);
      expect(level.parMoves).toBeGreaterThanOrEqual(level.id <= 40 ? 30 : 31);
      for (const color of colors) expect(level.bottles.filter((b) => b.includes(color)).length).toBeGreaterThanOrEqual(3);
    }
  });
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
