import { test, expect, type Page } from "@playwright/test";
import { levels } from "../../src/levels";
import { checkMove, initial, play, type Move } from "../../src/game/model";
import { defaults, serialize, STORAGE_KEY } from "../../src/storage/save";

async function seed(page: Page, id = 1, moves: Move[] = []) {
  const save = defaults();
  save.settings.sound = false;
  for (let i = 1; i < id; i++) save.results[i] = { stars: 3, bestMoves: 1 };
  save.game = initial(levels[id - 1]);
  for (const move of moves) save.game = play(save.game, levels[id - 1], move);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: serialize(save) },
  );
  await page.goto("/");
  await page.locator("#start-btn").click();
  return save.game;
}
async function start(page: Page, [from, to]: Move) {
  await page.locator(`[data-bottle="${from}"]`).tap();
  await page.locator(to === "collector" ? "[data-collector]:visible" : `[data-bottle="${to}"]`).tap();
}
async function sample(page: Page, progress: number) {
  return page.evaluate((progress) => {
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation && animation.animationName.startsWith("pour-")) {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) * progress;
      }
    }
    const read = (selector: string, axis: "x" | "y") => {
      const el = document.querySelector(selector)!;
      const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return axis === "x" ? matrix.a : matrix.d;
    };
    return {
      source: read(".pour-ghost .is-transferring", "y"),
      target: read(".board .is-transferring, .collector.compact .is-transferring", document.querySelector(".collector.compact .is-transferring") ? "x" : "y"),
    };
  }, progress);
}
test.describe("mobilní animace", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  const scenarios: { name: string; id: number; moves: Move[]; move: Move; width?: number }[] = [
    { name: "prázdný cíl", id: 1, moves: [], move: [0, 2] },
    { name: "spojení stejné barvy", id: 1, moves: [[0, 2]], move: [1, 0] },
    { name: "částečný blok", id: 4, moves: [[0, 3], [0, 4], [3, 0], [1, 3]], move: [0, 1] },
    { name: "sběr", id: 5, moves: [], move: [0, "collector"] },
    { name: "levý okraj při šířce 320 px", id: 4, moves: [[0, 3], [0, 4], [3, 0], [1, 3]], move: [0, 1], width: 320 },
  ];
  for (const [index, scenario] of scenarios.entries()) {
    test(`kapalina plynule ubývá i přibývá: ${scenario.name}`, async ({ page }, info) => {
      if (scenario.width) await page.setViewportSize({ width: scenario.width, height: 667 });
      const before = await seed(page, scenario.id, scenario.moves);
      const level = levels[scenario.id - 1];
      const [from, to] = scenario.move;
      const pour = checkMove(before, level, scenario.move)!;
      const after = play(before, level, scenario.move);
      const topCount = (units: string[]) => {
        let count = 0;
        for (let i = units.length - 1; i >= 0 && units[i] === units.at(-1); i--) count++;
        return count;
      };
      const sourceEnd = 1 - pour.amount / topCount(before.bottles[from]);
      const targetEnd = to === "collector" ? after.collectorUnits / 8 : 1;
      const targetStart = to === "collector" ? before.collectorUnits / 8 : 1 - pour.amount / topCount(after.bottles[to]);
      await start(page, scenario.move);
      const initialFrame = await sample(page, 0);
      expect(initialFrame.source).toBeCloseTo(1);
      expect(initialFrame.target).toBeCloseTo(targetStart);
      const middle = await sample(page, 0.5);
      expect(middle.source).toBeCloseTo((1 + sourceEnd) / 2);
      expect(middle.target).toBeCloseTo((targetStart + targetEnd) / 2);
      const bounds = await page.locator(".pour-ghost .bottle-body").boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
      await page.screenshot({ path: `artifacts/screenshots/motion-${info.project.name}-${index}-mid.png` });
      const returning = await sample(page, 0.999);
      expect(returning.source).toBeCloseTo(sourceEnd);
      expect(returning.target).toBeCloseTo(targetEnd);
      const landing = await page.evaluate((from) => ({
        ghost: document.querySelector(".pour-ghost .bottle-body")!.getBoundingClientRect().top,
        base: document.querySelector(`[data-bottle="${from}"]`)!.getBoundingClientRect().top,
      }), from);
      expect(Math.abs(landing.ghost - landing.base)).toBeLessThan(1);
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) {
          if (animation instanceof CSSAnimation && animation.animationName.startsWith("pour-")) animation.play();
        }
      });
      await expect(page.locator(".pour-fx")).toHaveCount(0);
      const result = JSON.parse(await page.evaluate(() => window.render_game_to_text!()));
      expect(result.bottles).toEqual(after.bottles);
      expect(result.collectorUnits).toBe(after.collectorUnits);
      expect(result.moves).toBe(before.history.length + 1);
      expect(result.busy).toBe(false);
      await page.getByRole("button", { name: "Zpět", exact: true }).tap();
      expect(JSON.parse(await page.evaluate(() => window.render_game_to_text!())).bottles).toEqual(before.bottles);
    });
  }

  test("opožděný začátek se nepřeruší původním časovačem", async ({ page }) => {
    await seed(page);
    await page.addStyleTag({ content: ".pour-ghost,.pour-stream,.is-transferring{animation-delay:350ms}" });
    await start(page, [0, 2]);
    const duration = await page.locator(".pour-ghost").evaluate(el => parseFloat(getComputedStyle(el).animationDuration) * 1000);
    expect(duration).toBeGreaterThanOrEqual(800);
    await page.waitForTimeout(duration + 50);
    await expect(page.locator(".pour-fx")).toHaveCount(1);
    await expect(page.getByRole("group", { name: "Herní plocha" })).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".pour-fx")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Herní plocha" })).toHaveAttribute("aria-busy", "false");
  });

  test("změna systémového omezení pohybu dokončí tah bez zámku", async ({ page }) => {
    await seed(page);
    await start(page, [0, 2]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".pour-fx")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Herní plocha" })).toHaveAttribute("aria-busy", "false");
    await start(page, [1, 0]);
    await expect(page.getByRole("group", { name: "Herní plocha" })).toHaveAttribute("aria-busy", "false");
    expect(JSON.parse(await page.evaluate(() => window.render_game_to_text!())).moves).toBe(2);
  });

  test("chybějící dokončovací událost nezanechá zamčený board", async ({ page }) => {
    await seed(page);
    await page.addStyleTag({ content: ".pour-ghost{animation:none!important}" });
    await start(page, [0, 2]);
    await expect(page.getByRole("group", { name: "Herní plocha" })).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".pour-fx")).toHaveCount(0, { timeout: 4000 });
    await expect(page.getByRole("group", { name: "Herní plocha" })).toHaveAttribute("aria-busy", "false");
    const result = JSON.parse(await page.evaluate(() => window.render_game_to_text!()));
    expect(result.moves).toBe(1);
    expect(result.bottles[2]).toEqual(["B", "B"]);
    await page.getByRole("button", { name: "Zpět", exact: true }).tap();
    expect(JSON.parse(await page.evaluate(() => window.render_game_to_text!())).moves).toBe(0);
  });
});
