import { chromium, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { levels } from "../src/levels";
import { initial, play, type Move } from "../src/game/model";
import { defaults, serialize, STORAGE_KEY } from "../src/storage/save";
const browser = await chromium.launch({ headless: true });
const errors: string[] = [],
  requests: string[] = [];
async function pageFor(id = 1, width = 390, height = 844, moves: Move[] = []) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`);
  });
  page.on("request", (r) => requests.push(r.url()));
  const save = defaults();
  save.settings.sound = false;
  for (let n = 1; n < id; n++)
    save.results[n] = { stars: 3, bestMoves: levels[n - 1].parMoves };
  save.game = initial(levels[id - 1]);
  for (const move of moves) save.game = play(save.game, levels[id - 1], move);
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: serialize(save) },
  );
  await page.goto("http://127.0.0.1:4174");
  return page;
}
async function shot(page: Page, name: string) {
  await page.waitForTimeout((await page.locator("dialog").count()) ? 850 : 180);
  await page.screenshot({
    path: `artifacts/screenshots/final-${name}.png`,
    fullPage: true,
  });
}
let p = await pageFor();
await shot(p, "home");
await p.locator("#start-btn").click();
await shot(p, "tutorial");
await p.locator('[data-bottle="0"]').click();
await shot(p, "selected");
await p.locator('[data-bottle="1"]').click();
await shot(p, "invalid");
await p.locator('[data-bottle="2"]').click();
await p.locator('.board[aria-busy="false"]').waitFor();
await p.getByRole("button", { name: "Nápověda", exact: true }).click();
await shot(p, "hint");
for (const move of [
  [1, 0],
  [1, 2],
] as Move[]) {
  await p.locator(`[data-bottle="${move[0]}"]`).click();
  await p.locator(`[data-bottle="${move[1]}"]`).click();
  await p.locator('.board[aria-busy="false"]').waitFor();
}
await shot(p, "win");
await p
  .getByRole("dialog")
  .getByRole("button", { name: "Levely", exact: true })
  .click();
await shot(p, "levels");
await p.close();
p = await pageFor(5);
await p.locator("#start-btn").click();
await shot(p, "collector-tutorial");
await p.getByRole("button", { name: "Nastavení", exact: true }).click();
await p.getByRole("switch", { name: "Symboly barev" }).click();
await shot(p, "settings");
await p.getByRole("button", { name: "Zavřít", exact: true }).click();
await shot(p, "collector-symbols");
await p.close();
p = await pageFor(8);
await p.locator("#start-btn").click();
await shot(p, "classic");
await p.close();
p = await pageFor(16, 390, 844, [
  [1, 6],
  [5, 7],
  [5, 6],
]);
await p.locator("#start-btn").click();
await shot(p, "no-moves");
await p.close();
for (const [w, h] of [
  [375, 667],
  [390, 844],
  [360, 800],
  [320, 568],
  [768, 1024],
  [1440, 900],
]) {
  for (const id of [28, 30]) {
    p = await pageFor(id, w, h);
    await p.locator("#start-btn").click();
    await shot(p, `${w}x${h}-level${id}`);
    await p.close();
  }
}
// Pause all pour effects at the same midpoint for a repeatable visual check.
p = await browser.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://127.0.0.1:4174");
await p.locator("#start-btn").click();
await p.locator('[data-bottle="0"]').click();
await p.locator('[data-bottle="2"]').click();
await p.evaluate(() => {
  for (const animation of document.getAnimations()) {
    if (animation instanceof CSSAnimation && animation.animationName.startsWith("pour-")) {
      animation.pause();
      animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
    }
  }
});
await p.screenshot({ path: "artifacts/screenshots/final-pouring-slowed.png" });
await p.close();
p = await pageFor(1, 390, 844, [[1, 3]]);
await p.locator("#start-btn").click();
await p.getByRole("button", { name: "Nápověda", exact: true }).click();
await p.locator(".is-hint-from").waitFor();
await shot(p, "worker-hint");
await p.close();
const browserVersion = browser.version();
await browser.close();
writeFileSync(
  "artifacts/ASSET_CHECK.json",
  JSON.stringify(
    {
      browserVersion,
      errors,
      uniqueRequests: [...new Set(requests)],
      externalRequests: requests.filter(
        (r) =>
          !r.startsWith("http://127.0.0.1:4174/") &&
          !r.startsWith("data:") &&
          !r.startsWith("blob:"),
      ),
    },
    null,
    2,
  ) + "\n",
);
if (errors.length) throw Error(errors.join("\n"));
console.log("PASS: final screenshots captured; no console/page/asset errors.");
