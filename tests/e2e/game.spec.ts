import { test, expect, type Page } from "@playwright/test";
import { levels } from "../../src/levels";
import { STORAGE_KEY, defaults, serialize } from "../../src/storage/save";
import { initial, play, type Move } from "../../src/game/model";
async function state(page: Page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text!()));
}
async function pour(page: Page, move: Move, advanceAnimation = false) {
  await page.locator(`[data-bottle="${move[0]}"]`).click();
  await page
    .locator(
      move[1] === "collector"
        ? "[data-collector]:visible"
        : `[data-bottle="${move[1]}"]`,
    )
    .click();
  // Campaign coverage uses the existing time-step hook only to finish its reduced
  // animation. Every move and win still comes from the real UI and engine.
  if (advanceAnimation) await page.evaluate(() => window.advanceTime!(100));
  await expect(
    page.getByRole("group", { name: "Herní plocha" }),
  ).toHaveAttribute("aria-busy", "false");
}
async function seed(page: Page, id = 1, moves: Move[] = [], reduced = false) {
  const save = defaults();
  save.settings = { sound: false, reduced, symbols: false };
  for (let i = 1; i < id; i++)
    save.results[i] = { stars: 3, bestMoves: levels[i - 1].parMoves };
  save.game = initial(levels[id - 1]);
  for (const m of moves) save.game = play(save.game, levels[id - 1], m);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: serialize(save) },
  );
  await page.goto("/");
  await page.locator("#start-btn").click();
}
test("celá kampaň skutečnými UI tahy, hvězdy, postup a finále", async ({
  page,
}) => {
  test.setTimeout(900000);
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4174/") &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Nastavení", exact: true }).click();
  await page.getByRole("switch", { name: "Omezené animace" }).click();
  await page.getByRole("switch", { name: "Zvuky" }).click();
  await page.getByRole("button", { name: "Zavřít", exact: true }).click();
  await page.locator("#start-btn").click();
  for (const level of levels) {
    for (const m of level.solution) await pour(page, m, true);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(
      level.id === levels.length ? "Kampaň dokončena!" : "Lektvary roztříděny!",
    );
    expect((await state(page)).moves).toBe(level.parMoves);
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: level.id === levels.length ? "Zpět na levely" : "Další level",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("button", { name: /Level 100, Sběr, hotovo, 3 hvězd/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Level 101,/ })).toHaveCount(0);
  await expect(page.locator(".star-total")).toHaveAttribute("aria-label", "300 z 300 hvězd");
  const raw = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(Object.keys(raw.results)).toHaveLength(levels.length);
  expect(
    Object.values(raw.results).every(
      (r) => (r as { stars: number }).stars === 3,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test("rychlé vstupy a undo/restart/navigace/skrytí bezpečně přeruší animaci", async ({
  page,
}) => {
  await seed(page);
  await page.locator('[data-bottle="0"]').click();
  await page.locator('[data-bottle="2"]').click();
  await page.locator('[data-bottle="1"]').dispatchEvent("click");
  await page.locator('[data-bottle="0"]').dispatchEvent("click");
  expect((await state(page)).moves).toBe(1);
  await page.getByRole("button", { name: "Zpět", exact: true }).click();
  expect((await state(page)).moves).toBe(0);
  await expect(page.locator(".pour-fx")).toHaveCount(0);
  await page.locator('[data-bottle="0"]').click();
  await page.locator('[data-bottle="2"]').click();
  await page.getByRole("button", { name: "Znovu", exact: true }).click();
  expect((await state(page)).moves).toBe(0);
  await page.locator('[data-bottle="0"]').click();
  await page.locator('[data-bottle="2"]').click();
  await page.getByRole("button", { name: "Zpět na levely" }).click();
  await expect(page.locator(".pour-fx")).toHaveCount(0);
  await page.getByRole("button", { name: "Zpět na úvod" }).click();
  await page.locator("#start-btn").click();
  expect((await state(page)).moves).toBe(1);
  await page.getByRole("button", { name: "Znovu", exact: true }).click();
  await page.locator('[data-bottle="0"]').click();
  await page.locator('[data-bottle="2"]').click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });
  await expect(page.locator(".pour-fx")).toHaveCount(0);
  expect((await state(page)).busy).toBe(false);
  expect((await state(page)).moves).toBe(1);
  await pour(page, [1, 0]);
});
test("refresh obnoví sběr, tahy i vratnou historii; restart zachová postup", async ({
  page,
}) => {
  // Only seed once: reload must read the actual new persisted move.
  const save = defaults();
  save.settings.sound = false;
  for (let i = 1; i < 5; i++) save.results[i] = { stars: 2, bestMoves: 9 };
  save.game = initial(levels[4]);
  await page.goto("/");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: STORAGE_KEY,
    value: serialize(save),
  });
  await page.reload();
  await page.locator("#start-btn").click();
  await pour(page, [0, "collector"]);
  await page.reload();
  await page.locator("#start-btn").click();
  expect((await state(page)).collectorUnits).toBe(2);
  expect((await state(page)).moves).toBe(1);
  await page.getByRole("button", { name: "Zpět", exact: true }).click();
  expect((await state(page)).collectorUnits).toBe(0);
  await page.getByRole("button", { name: "Znovu", exact: true }).click();
  expect(
    await page.evaluate(
      (key) =>
        Object.keys(JSON.parse(localStorage.getItem(key)!).results).length,
      STORAGE_KEY,
    ),
  ).toBe(4);
});
test("hint mimo certifikát běží ve workeru a vrací cestu ze skutečného boardu", async ({
  page,
}) => {
  await seed(page, 1, [], true);
  await pour(page, [1, 3]);
  await page.getByRole("button", { name: "Nápověda", exact: true }).click();
  await expect(page.locator(".is-hint-from")).toHaveCount(1);
  let s = await state(page);
  expect(s.hint).not.toBeNull();
  for (let i = 0; i < 10 && !s.won; i++) {
    await pour(page, s.hint);
    s = await state(page);
    if (!s.won) {
      await page.getByRole("button", { name: "Nápověda", exact: true }).click();
      await expect(page.locator(".is-hint-from")).toHaveCount(1);
      s = await state(page);
    }
  }
  expect(s.won).toBe(true);
});
test("zastaralý worker nesmí změnit hint po tahu, undo, restartu ani změně levelu", async ({
  page,
}) => {
  // Delayed, intentionally uncancellable worker tests the request ID/hash checks independently of terminate().
  await page.addInitScript(() => {
    class DelayedWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      onerror = null;
      postMessage(data: { requestId: number; hash: string }) {
        setTimeout(
          () =>
            this.onmessage?.({
              data: {
                ...data,
                result: { status: "solved", solution: [[0, 2]], visited: 1 },
              },
            } as MessageEvent),
          600,
        );
      }
      terminate() {}
    }
    window.Worker = DelayedWorker as unknown as typeof Worker;
  });
  await seed(page, 1, [[1, 3]], true);
  for (const action of ["move", "undo", "restart", "level"]) {
    if (action !== "move") {
      await page.getByRole("button", { name: "Znovu", exact: true }).click();
      await pour(page, [1, 3]);
    }
    await page.getByRole("button", { name: "Nápověda", exact: true }).click();
    if (action === "move") await pour(page, [0, 2]);
    if (action === "undo")
      await page.getByRole("button", { name: "Zpět", exact: true }).click();
    if (action === "restart")
      await page.getByRole("button", { name: "Znovu", exact: true }).click();
    if (action === "level") {
      await page.getByRole("button", { name: "Zpět na levely" }).click();
      await page.getByRole("button", { name: /Level 1, aktuální/ }).click();
    }
    await page.waitForTimeout(700);
    expect((await state(page)).hint).toBeNull();
    expect((await state(page)).searching).toBe(false);
  }
});
test("poškozená i nedostupná persistence dovolí pokračovat ve hře", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "{invalid"),
    STORAGE_KEY,
  );
  await page.goto("/");
  await expect(
    page.getByText("Uložená data nelze načíst.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zavřít upozornění" }).click();
  await page.locator("#start-btn").click();
  await pour(page, [0, 2]);
  expect((await state(page)).moves).toBe(1);
  const denied = await page.context().newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("blocked");
      },
    });
    Object.defineProperty(window, "AudioContext", {
      get() {
        throw Error("blocked audio");
      },
    });
  });
  await denied.goto("/");
  await denied.getByRole("button", { name: "Zavřít upozornění" }).click();
  await denied.locator("#start-btn").click();
  await pour(denied, [0, 2]);
  expect((await state(denied)).moves).toBe(1);
  await denied.close();
});
test("klávesnice, focus trap, skutečné přepínače a nelegální cíl", async ({
  page,
}) => {
  await seed(page);
  await page.locator('[data-bottle="0"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-bottle="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-bottle="1"]').click();
  expect((await state(page)).moves).toBe(0);
  expect((await state(page)).selected).toBe(0);
  await expect(page.locator(".toast")).toContainText("plná");
  await page.locator('[data-bottle="2"]').focus();
  await page.keyboard.press("Space");
  await expect(page.locator("[data-moves]")).toHaveText("1");
  await page.getByRole("button", { name: "Nastavení" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
  }
  await page.getByRole("switch", { name: "Symboly barev" }).click();
  await expect(page.locator(".unit svg:visible").first()).toBeVisible();
  await page.getByRole("switch", { name: "Omezené animace" }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-reduced", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nastavení" })).toBeFocused();
});
test("systémové omezení pohybu se respektuje", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page);
  await expect(page.locator(".app")).toHaveAttribute("data-reduced", "true");
  await page.getByRole("button", { name: "Nastavení" }).click();
  await expect(
    page.getByRole("switch", { name: "Omezené animace" }),
  ).toHaveAttribute("aria-checked", "true");
});
for (const [width, height] of [
  [375, 667],
  [390, 844],
  [360, 800],
  [320, 568],
  [768, 1024],
  [1440, 900],
]) {
  for (const id of [99, 100])
    test(`layout ${width}×${height}, level ${id}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await seed(page, id, [], true);
      const check = await page.evaluate(() => {
        const buttons = [
          ...document.querySelectorAll(
            ".board button,.actionbar button,.hud button",
          ),
        ].map((el) => {
          const r = el.getBoundingClientRect();
          return { width: r.width, height: r.height };
        });
        const bar = document
          .querySelector(".actionbar")!
          .getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          buttons,
          barBottom: bar.bottom,
          screen: innerHeight,
        };
      });
      expect(check.overflow).toBe(false);
      expect(check.buttons.every((b) => b.width >= 48 && b.height >= 48)).toBe(
        true,
      );
      if (width >= 360 && width < 600)
        expect(check.barBottom).toBeLessThanOrEqual(check.screen + 1);
      await page.screenshot({
        path: `artifacts/screenshots/${test.info().project.name}-${width}x${height}-level${id}.png`,
        fullPage: true,
      });
    });
}

test("částečné nalití je přesné a skutečný pat nabídne vratný tah", async ({
  page,
}) => {
  await seed(
    page,
    4,
    [
      [0, 3],
      [0, 4],
      [3, 0],
      [1, 3],
    ],
    true,
  );
  const before = await state(page);
  await pour(page, [0, 1]);
  const after = await state(page);
  expect(before.bottles[0]).toHaveLength(3);
  expect(after.bottles[0]).toHaveLength(2);
  expect(after.bottles[1]).toHaveLength(4);
  expect(after.moves).toBe(5);
  const other = await page.context().newPage();
  await seed(
    other,
    16,
    [
      [1, 6],
      [5, 7],
      [5, 6],
    ],
    true,
  );
  await expect(other.getByRole("dialog")).toContainText("Žádné další přelití");
  await other.screenshot({
    path: `artifacts/screenshots/${test.info().project.name}-no-moves.png`,
  });
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Zpět o tah" })
    .click();
  expect((await state(other)).moves).toBe(2);
  await expect(other.getByRole("dialog")).toHaveCount(0);
  await other.close();
});
test("tutorial nepřekrývá baňky a zvětšený text ponechá přístupné ovládání", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await seed(page, 5, [], true);
  const boxes = await page.evaluate(() => ({
    note: document.querySelector(".tutorial-note")!.getBoundingClientRect()
      .bottom,
    bottle: document
      .querySelector("[data-bottle] .bottle-body")!
      .getBoundingClientRect().top,
    bar: document.querySelector(".actionbar")!.getBoundingClientRect().bottom,
  }));
  expect(boxes.note).toBeLessThan(boxes.bottle);
  expect(boxes.bar).toBeLessThanOrEqual(668);
  await page.addStyleTag({
    content:
      ":root { --pf-fs-sm:21px; --pf-fs-xs:18px; --pf-fs-md:24px; --pf-fs-xl:36px } .act{font-size:20px}",
  });
  await expect(
    page.getByRole("button", { name: "Znovu", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Znovu", exact: true }).click();
});

test("audio začne po interakci a mute zastaví nové tóny", async ({ page }) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext;
    const stats = { contexts: 0, tones: 0 };
    Object.assign(window, { audioQA: stats });
    window.AudioContext = class extends Original {
      constructor() {
        super();
        stats.contexts++;
      }
      createOscillator() {
        stats.tones++;
        return super.createOscillator();
      }
    };
  });
  await page.goto("/");
  const audio = () =>
    page.evaluate(
      () =>
        (window as unknown as { audioQA: { contexts: number; tones: number } })
          .audioQA,
    );
  expect((await audio()).contexts).toBe(0);
  await page.locator("#start-btn").click();
  await page.locator('[data-bottle="0"]').click();
  expect((await audio()).contexts).toBe(1);
  expect((await audio()).tones).toBe(1);
  await page.getByRole("button", { name: "Nastavení" }).click();
  await page.getByRole("switch", { name: "Zvuky" }).click();
  await page.getByRole("button", { name: "Zavřít", exact: true }).click();
  await pour(page, [0, 2]);
  expect((await audio()).tones).toBe(1);
  await page.getByRole("button", { name: "Nastavení" }).click();
  await page.getByRole("switch", { name: "Zvuky" }).click();
  await page.getByRole("button", { name: "Zavřít", exact: true }).click();
  await page.locator('[data-bottle="1"]').click();
  expect((await audio()).tones).toBe(2);
});

test.describe("dotykový viewport", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 375, height: 667 },
  });
  test("skutečné touch tapy vyberou a přelijí bez dvojího tahu", async ({
    page,
  }) => {
    await seed(page);
    await page.locator('[data-bottle="0"]').tap();
    await expect(page.locator('[data-bottle="0"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator('[data-bottle="2"]').tap();
    await page.locator('[data-bottle="1"]').tap();
    await page.locator('[data-bottle="0"]').tap();
    expect((await state(page)).moves).toBe(1);
    await page.getByRole("button", { name: "Zpět", exact: true }).tap();
    expect((await state(page)).moves).toBe(0);
  });
});
