import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
it("sdílený lokální SVG sprite má jedinečná ID a platné reference", () => {
  const svg = readFileSync(
    new URL("../src/components/sprite.svg", import.meta.url),
    "utf8",
  );
  const ids = [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  expect(new Set(ids).size).toBe(ids.length);
  const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
  for (const id of refs) expect(ids).toContain(id);
});
