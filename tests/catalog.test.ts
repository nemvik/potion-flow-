import { describe, it, expect } from "vitest";
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
    "všech 30 levelů je unikátních a dopředně vyhrává",
    () => validateCatalog(levels),
    20000,
  );
  it("Sběr je přesně každý pátý level", () =>
    expect(
      levels.filter((l) => l.mode === "collector").map((l) => l.id),
    ).toEqual([5, 10, 15, 20, 25, 30]));
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
