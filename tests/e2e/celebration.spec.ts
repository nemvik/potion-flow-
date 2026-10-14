import { test, expect, type Page } from "@playwright/test";
import { levels } from "../../src/levels";
import { defaults, serialize, STORAGE_KEY } from "../../src/storage/save";
import { replay, type Move } from "../../src/game/model";

async function open(page: Page, id = 1, moves: Move[] = [], reduced = false) {
  const save = defaults();
  save.settings = { sound: false, symbols: false, reduced };
  for (let i = 1; i < id; i++) save.results[i] = { stars: 3, bestMoves: levels[i - 1].parMoves };
  save.game = replay(levels[id - 1], moves);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: STORAGE_KEY, value: serialize(save),
  });
  await page.goto("/");
  await page.locator("#start-btn").tap();
}
async function pour(page: Page, [from, to]: Move, wait = true) {
  await page.locator(`[data-bottle="${from}"]`).tap();
  await page.locator(to === "collector" ? "[data-collector]:visible" : `[data-bottle="${to}"]`).tap();
  if (wait) await expect(page.locator(".board")).toHaveAttribute("aria-busy", "false");
}

test.describe("hotové lahve a oslava", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 } });

  test("špunt označí hotovou barvu, pustí další přelití a vrátí se po undo", async ({ page }, info) => {
    await open(page);
    await expect(page.locator(".board .is-corked")).toHaveCount(0);
    await pour(page, [0, 2]);
    await pour(page, [1, 0]);
    const done = page.locator('[data-bottle="0"]');
    await expect(done).toHaveClass(/is-corked/);
    await expect(done.locator(".cork")).toHaveCSS("opacity", "1");
    await expect(done.locator(".bottle-seal")).toBeVisible();
    await page.screenshot({ path: `artifacts/screenshots/completed-bottle-${info.project.name}.png` });
    await done.tap();
    await expect(done.locator(".cork")).toHaveCSS("opacity", "0");
    await page.locator('[data-bottle="3"]').tap();
    await expect(page.locator(".board")).toHaveAttribute("aria-busy", "false");
    await expect(done).not.toHaveClass(/is-corked/);
    await expect(page.locator('[data-bottle="3"]')).toHaveClass(/is-corked/);
    await page.getByRole("button", { name: "Zpět", exact: true }).tap();
    await expect(done).toHaveClass(/is-corked/);
    const game = JSON.parse(await page.evaluate(() => window.render_game_to_text!()));
    expect(game.bottles[0]).toEqual(["R", "R", "R", "R"]);
    expect(game.bottles[3]).toEqual([]);
    expect(game.moves).toBe(2);
    expect(game.won).toBe(false);
  });

  test("konfety začnou po posledním přelití a samy zmizí", async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await open(page, 1, levels[0].solution.slice(0, -1));
    await pour(page, levels[0].solution.at(-1)!, false);
    await expect(page.locator(".pour-fx")).toHaveCount(1);
    await expect(page.locator(".confetti")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator(".confetti span")).toHaveCount(36);
    await expect(page.locator(".confetti")).toHaveCSS("pointer-events", "none");
    await page.evaluate(() => {
      for (const animation of document.getAnimations()) {
        if (animation instanceof CSSAnimation && animation.animationName === "confetti-fall") {
          animation.pause();
          animation.currentTime = 800;
        }
      }
    });
    await page.screenshot({ path: `artifacts/screenshots/confetti-${info.project.name}.png` });
    await expect(page.locator(".confetti")).toHaveCount(0, { timeout: 3500 });
    await page.getByRole("button", { name: "Další level", exact: true }).tap();
    await expect(page.getByRole("region", { name: "Level 2", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("odchod během konfet nezablokuje další level", async ({ page }) => {
    await open(page, 1, levels[0].solution.slice(0, -1));
    await pour(page, levels[0].solution.at(-1)!);
    await expect(page.locator(".confetti")).toHaveCount(1);
    await page.getByRole("button", { name: "Další level", exact: true }).tap();
    await expect(page.locator(".confetti")).toHaveCount(0);
    await pour(page, levels[1].solution[0]);
    expect(JSON.parse(await page.evaluate(() => window.render_game_to_text!())).moves).toBe(1);
  });

  for (const reduced of ["system", "setting"] as const) {
    test(`omezené animace vynechají konfety: ${reduced}`, async ({ page }) => {
      if (reduced === "system") await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page, 1, levels[0].solution.slice(0, -1), reduced === "setting");
      await pour(page, levels[0].solution.at(-1)!);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator(".confetti")).toHaveCount(0);
    });
  }

  test("starý dokončený level 30 naváže na novou kapitolu a zachová postup", async ({ page }, info) => {
    // A persisted v1 save in the exact pre-extension format, loaded only once.
    const save = defaults();
    save.settings.sound = false;
    save.settings.reduced = true;
    save.results = Object.fromEntries(levels.slice(0, 30).map(l => [l.id, { stars: 3, bestMoves: l.parMoves }]));
    save.game = replay(levels[29]);
    await page.goto("/");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: STORAGE_KEY, value: serialize(save) });
    await page.reload();
    await page.locator("#start-btn").tap();
    await expect(page.getByRole("dialog")).toContainText("Lektvary roztříděny!");
    await page.getByRole("button", { name: "Další level", exact: true }).tap();
    await expect(page.getByRole("region", { name: "Level 31", exact: true })).toBeVisible();
    await expect(page.getByText("Kapitola IV · Mistrovská observatoř")).toBeVisible();
    await page.screenshot({ path: `artifacts/screenshots/new-level31-${info.project.name}.png` });
    await pour(page, levels[30].solution[0]);
    await page.reload();
    await page.locator("#start-btn").tap();
    expect(JSON.parse(await page.evaluate(() => window.render_game_to_text!())).moves).toBe(1);
    await page.getByRole("button", { name: "Zpět na levely" }).tap();
    await expect(page.getByRole("button", { name: "Level 31, aktuální", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Level 41, zamčeno", exact: true })).toHaveAttribute("aria-disabled", "true");
    await page.getByRole("button", { name: "Zpět na úvod" }).tap();
    await expect(page.getByText("/ 50 hotovo", { exact: false })).toBeVisible();
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
    expect(Object.keys(stored.results)).toHaveLength(30);
  });
});
