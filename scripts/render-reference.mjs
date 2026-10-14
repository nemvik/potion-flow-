import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
for (const [w, h, label] of [
  [390, 844, "mobile"],
  [1440, 900, "desktop"],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto("http://127.0.0.1:4173/design/design.html");
  await page.evaluate(() => {
    S.viewport = "fill";
    applyViewport();
    document.querySelector(".preview").style.display = "none";
    document.querySelector(".pv-tab").style.display = "none";
  });
  for (const state of [
    "home-first",
    "classic",
    "collector",
    "max",
    "levels",
    "win",
    "settings",
    "tutorial",
  ]) {
    await page.evaluate((s) => setPreview(s), state);
    await page.waitForTimeout(850);
    await page.screenshot({
      path: `artifacts/screenshots/reference-${label}-${state}.png`,
    });
  }
  console.log(label, await page.locator("#app").boundingBox());
  await page.close();
}
await browser.close();
