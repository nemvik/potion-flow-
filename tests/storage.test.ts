import { describe, it, expect } from "vitest";
import {
  decode,
  defaults,
  load,
  persist,
  serialize,
} from "../src/storage/save";
import { initial, play, recordWin, replay, undo, unlocked } from "../src/game/model";
import { levels } from "../src/levels";
import { reducer, type AppState } from "../src/state";
const roundTrip = () => {
  const save = defaults();
  save.settings.symbols = true;
  save.results = recordWin({}, levels[0], 3);
  save.game = play(initial(levels[4]), levels[4], [0, "collector"]);
  return save;
};
describe("odolná persistence", () => {
  it("přidané levely zachovají starý postup i dokončený level 30", () => {
    const save = defaults();
    save.results = Object.fromEntries(levels.slice(0, 30).map(l => [l.id, { stars: 3, bestMoves: l.parMoves }]));
    save.game = replay(levels[29]);
    const restored = decode(serialize(save));
    expect(restored.notice).toBe("");
    expect(restored.save).toEqual(save);
    expect(unlocked(restored.save.results)).toBe(31);
  });
  it.each([31, 40, 50])("nový level %i obnoví výsledky i rozehrání", (id) => {
    const save = defaults();
    const level = levels[id - 1];
    save.results[id] = { stars: 2, bestMoves: level.parMoves + 1 };
    save.game = play(initial(level), level, level.solution[0]);
    expect(decode(serialize(save)).save).toEqual(save);
  });
  it("obnoví sběr i historii a umožní přesné undo", () => {
    const save = roundTrip(),
      result = decode(serialize(save));
    expect(result.notice).toBe("");
    expect(result.save).toEqual(save);
    expect(undo(result.save.game!)).toEqual(initial(levels[4]));
  });
  it.each([
    "{",
    "null",
    "[]",
    "42",
    '{"version":99}',
    JSON.stringify({ version: 1, game: {} }),
  ])("poškozený záznam nespadne: %s", (raw) =>
    expect(() => decode(raw)).not.toThrow(),
  );
  it("uchová nastavení a výsledky při poškozeném boardu/historii", () => {
    const raw = JSON.parse(serialize(roundTrip()));
    raw.game.bottles[0] = ["X"];
    const decoded = decode(JSON.stringify(raw));
    expect(decoded.save.game).toBeNull();
    expect(decoded.save.results[1].stars).toBe(3);
    expect(decoded.save.settings.symbols).toBe(true);
    expect(decoded.notice).not.toBe("");
  });
  it.each(["level", "version", "move", "count", "color"])(
    "odmítne neplatné rozehrání: %s",
    (kind) => {
      const raw = JSON.parse(serialize(roundTrip()));
      if (kind === "level") raw.game.levelId = 999;
      if (kind === "version") raw.game.catalogVersion = 99;
      if (kind === "move") raw.game.moves = [[0, 1]];
      if (kind === "count") raw.game.collectorUnits = -1;
      if (kind === "color") raw.game.bottles[0][0] = "X";
      expect(decode(JSON.stringify(raw)).save.game).toBeNull();
    },
  );
  it("odmítne přes limit historie a nadměrný záznam", () => {
    const raw = JSON.parse(serialize(roundTrip()));
    raw.game.moves = Array(10001).fill([0, 1]);
    expect(decode(JSON.stringify(raw)).save.game).toBeNull();
    expect(decode("x".repeat(2000001)).notice).not.toBe("");
  });
  it("neznámá verze katalogu zachová postup", () => {
    const raw = JSON.parse(serialize(roundTrip()));
    raw.catalogVersion = 2;
    const result = decode(JSON.stringify(raw));
    expect(result.save.game).toBeNull();
    expect(result.save.results[1].stars).toBe(3);
  });
  it("zakázaný storage a quota neukončí hraní", () => {
    const storage = {
      getItem: () => {
        throw Error("denied");
      },
      setItem: () => {
        throw Error("quota");
      },
    };
    expect(load(storage).notice).not.toBe("");
    expect(persist(storage, roundTrip())).toBe(false);
  });
});
describe("reducer a atomické operace", () => {
  const base = (): AppState => ({
    save: defaults(),
    screen: "home",
    notice: "",
  });
  it("neodemčený level nelze spustit ani přes reducer", () => {
    const state = base();
    expect(reducer(state, { type: "start", id: 30 })).toBe(state);
  });
  it("opakovaná akce se starým hashem se neprovede dvakrát", () => {
    let s = reducer(base(), { type: "start", id: 1 });
    const key = s.save.game!.bottles.map((b) => b.join("")).join("|") + "#0";
    s = reducer(s, { type: "move", move: [0, 2], hash: key });
    const again = reducer(s, { type: "move", move: [0, 2], hash: key });
    expect(again).toBe(s);
    expect(s.save.game!.history.length).toBe(1);
  });
  it("restart nevymaže předchozí výsledky a nastaví prázdnou historii", () => {
    const s = base();
    s.save = roundTrip();
    const result = reducer(s, { type: "restart" });
    expect(result.save.results).toEqual(s.save.results);
    expect(result.save.game).toEqual(initial(levels[4]));
  });
});
