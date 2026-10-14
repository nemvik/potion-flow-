import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const levels = JSON.parse(
  readFileSync(new URL("../src/levels/catalog.json", import.meta.url)),
);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.screenshot({ path: "artifacts/screenshots/m1-home.png" });
await page.locator("#start-btn").click();
await page.screenshot({ path: "artifacts/screenshots/m1-tutorial.png" });
for (const level of levels.slice(0, 5)) {
  for (const [from, to] of level.solution) {
    await page.locator(`[data-bottle="${from}"]`).click();
    await page
      .locator(
        to === "collector"
          ? '[data-collector="compact"]'
          : `[data-bottle="${to}"]`,
      )
      .click();
    await page.locator('.board[aria-busy="false"]').waitFor();
  }
  await page.getByRole("dialog").waitFor();
  console.log(
    "UI win",
    level.id,
    await page.locator("[data-moves]").textContent(),
  );
  await page.screenshot({
    path: `artifacts/screenshots/m1-win-${level.id}.png`,
  });
  if (level.id < 5)
    await page.getByRole("button", { name: "Další level" }).click();
}
console.log({ errors });
if (errors.length) throw Error(errors.join("\n"));
await browser.close();
