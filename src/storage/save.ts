import {
  CATALOG_VERSION,
  hash,
  initial,
  isWon,
  play,
  type Game,
  type Move,
  type Result,
} from "../game/model";
import { getLevel } from "../levels";
import { LEVEL_COUNT } from "../game/campaign";
export interface Settings {
  sound: boolean;
  reduced: boolean;
  symbols: boolean;
}
export interface Save {
  settings: Settings;
  results: Record<number, Result>;
  game: Game | null;
}
export const STORAGE_KEY = "potion-flow:save:v1";
export const defaults = (): Save => ({
  settings: { sound: true, reduced: false, symbols: false },
  results: {},
  game: null,
});
const object = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);
export function serialize(save: Save): string {
  return JSON.stringify({
    version: 1,
    catalogVersion: CATALOG_VERSION,
    settings: save.settings,
    results: save.results,
    game: save.game
      ? {
          levelId: save.game.levelId,
          catalogVersion: save.game.catalogVersion,
          bottles: save.game.bottles,
          collectorUnits: save.game.collectorUnits,
          moves: save.game.history.map((h) => h.move),
        }
      : null,
  });
}
export function decode(raw: string | null): { save: Save; notice: string } {
  const save = defaults();
  if (!raw) return { save, notice: "" };
  try {
    if (raw.length > 2_000_000) throw Error("Uložená data jsou příliš velká.");
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.version !== 1)
      throw Error("Neznámý formát uložení.");
    if (object(value.settings))
      for (const key of ["sound", "reduced", "symbols"] as const)
        if (typeof value.settings[key] === "boolean")
          save.settings[key] = value.settings[key];
    if (object(value.results))
      for (let id = 1; id <= LEVEL_COUNT; id++) {
        const r = value.results[id];
        if (
          object(r) &&
          typeof r.stars === "number" &&
          Number.isInteger(r.stars) &&
          r.stars >= 1 &&
          r.stars <= 3 &&
          typeof r.bestMoves === "number" &&
          Number.isInteger(r.bestMoves) &&
          r.bestMoves > 0 &&
          r.bestMoves <= 10000
        )
          save.results[id] = { stars: r.stars, bestMoves: r.bestMoves };
      }
    if (value.catalogVersion !== CATALOG_VERSION)
      return {
        save,
        notice:
          "Katalog se změnil. Postup zůstal zachován, rozehrání začíná znovu.",
      };
    if (value.game !== null && value.game !== undefined) {
      try {
        const g = value.game;
        if (
          !object(g) ||
          g.catalogVersion !== CATALOG_VERSION ||
          typeof g.levelId !== "number" ||
          !Number.isInteger(g.levelId) ||
          !Array.isArray(g.moves) ||
          g.moves.length > 10000
        )
          throw Error();
        const level = getLevel(g.levelId);
        let game = initial(level);
        for (const m of g.moves) {
          if (
            !Array.isArray(m) ||
            m.length !== 2 ||
            typeof m[0] !== "number" ||
            (typeof m[1] !== "number" && m[1] !== "collector")
          )
            throw Error();
          if (isWon(game, level)) throw Error();
          const next = play(game, level, m as unknown as Move);
          if (next === game) throw Error();
          game = next;
        }
        if (
          !Array.isArray(g.bottles) ||
          JSON.stringify(game.bottles) !== JSON.stringify(g.bottles) ||
          game.collectorUnits !== g.collectorUnits ||
          !hash(game)
        )
          throw Error();
        save.game = game;
      } catch {
        return {
          save,
          notice:
            "Poškozenou rozehranou hru nelze obnovit. Platný postup a nastavení zůstaly zachovány.",
        };
      }
    }
    return { save, notice: "" };
  } catch {
    return {
      save,
      notice: "Uložená data nelze načíst. Můžeš začít novou hru.",
    };
  }
}
export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}
export function load(storage: StorageLike): { save: Save; notice: string } {
  try {
    return decode(storage.getItem(STORAGE_KEY));
  } catch {
    return {
      save: defaults(),
      notice:
        "Ukládání není dostupné. Hraješ v paměti; postup po zavření zmizí.",
    };
  }
}
export function persist(storage: StorageLike, save: Save): boolean {
  try {
    storage.setItem(STORAGE_KEY, serialize(save));
    return true;
  } catch {
    return false;
  }
}
