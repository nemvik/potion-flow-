// Interactive, agent-operated player QA. Reads only visible diagnostic state; never reads certificates.
import { chromium } from "@playwright/test";
import { createInterface } from "node:readline";
import { appendFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:4174");
let shot = 0;
async function output() {
  const s = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  console.log(JSON.stringify(s));
  appendFileSync(
    "artifacts/PLAYER_LOG.jsonl",
    JSON.stringify({ time: new Date().toISOString(), state: s, errors }) + "\n",
  );
}
console.log(
  'Commands: play, next, hint, undo, restart, levels, home, settings, symbols, mute, close, shot; or JSON [from,to] (0-based, "collector" allowed), or {"resumeLevel":16}.',
);
await output();
for await (const line of createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
})) {
  try {
    const text = line.trim();
    if (!text) continue;
    if (text === "exit") break;
    if (text === "shot") {
      const path = `artifacts/screenshots/player-${++shot}.png`;
      await page.screenshot({ path });
      console.log(path);
    } else if (text === "play") await page.locator("#start-btn").click();
    else if (text === "next")
      await page
        .getByRole("button", { name: "Další level", exact: true })
        .click();
    else if (text === "hint") {
      await page.getByRole("button", { name: "Nápověda", exact: true }).click();
      await page.waitForTimeout(500);
    } else if (text === "undo")
      await page.getByRole("button", { name: "Zpět", exact: true }).click();
    else if (text === "restart")
      await page.getByRole("button", { name: "Znovu", exact: true }).click();
    else if (text === "levels")
      await page
        .getByRole("button", { name: "Zpět na levely", exact: true })
        .click();
    else if (text === "home")
      await page
        .getByRole("button", { name: "Zpět na úvod", exact: true })
        .click();
    else if (text === "settings")
      await page
        .getByRole("button", { name: "Nastavení", exact: true })
        .click();
    else if (text === "symbols")
      await page.getByRole("switch", { name: "Symboly barev" }).click();
    else if (text === "mute")
      await page.getByRole("switch", { name: "Zvuky" }).click();
    else if (text === "close")
      await page.getByRole("button", { name: "Zavřít", exact: true }).click();
    else {
      const command = JSON.parse(text);
      if (Array.isArray(command)) {
        await page.locator(`[data-bottle="${command[0]}"]`).click();
        await page
          .locator(
            command[1] === "collector"
              ? "[data-collector]:visible"
              : `[data-bottle="${command[1]}"]`,
          )
          .click();
        await page.waitForTimeout(440);
      } else if (command.resumeLevel) {
        // Navigation fixture only: previously completed levels. New board is started through level selector.
        await page.evaluate(
          ({ key, id }) => {
            const s = JSON.parse(localStorage.getItem(key));
            for (let i = 1; i < id; i++)
              s.results[i] = { stars: 1, bestMoves: 100 };
            s.game = null;
            localStorage.setItem(key, JSON.stringify(s));
          },
          { key: "potion-flow:save:v1", id: command.resumeLevel },
        );
        await page.reload();
        await page.getByRole("button", { name: "Levely", exact: true }).click();
        await page
          .getByRole("button", {
            name: `Level ${command.resumeLevel}${command.resumeLevel % 5 === 0 ? ", Sběr" : ""}, aktuální`,
            exact: true,
          })
          .click();
      }
    }
    await output();
  } catch (error) {
    console.log("COMMAND ERROR", String(error));
  }
}
await browser.close();
