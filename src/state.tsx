import {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  hash,
  initial,
  isWon,
  play,
  recordWin,
  undo,
  unlocked,
  type Move,
} from "./game/model";
import { getLevel } from "./levels";
import { defaults, load, type Save, type Settings } from "./storage/save";
export interface AppState {
  save: Save;
  screen: "home" | "levels" | "game";
  notice: string;
}
export type Action =
  | { type: "nav"; screen: AppState["screen"] }
  | { type: "start"; id: number }
  | { type: "resume" }
  | { type: "move"; move: Move; hash: string }
  | { type: "undo" }
  | { type: "restart" }
  | { type: "setting"; key: keyof Settings }
  | { type: "notice"; message: string };
function settle(save: Save): Save {
  if (!save.game) return save;
  const level = getLevel(save.game.levelId);
  return isWon(save.game, level)
    ? {
        ...save,
        results: recordWin(save.results, level, save.game.history.length),
      }
    : save;
}
export function reducer(state: AppState, a: Action): AppState {
  const { save } = state;
  switch (a.type) {
    case "nav":
      return { ...state, screen: a.screen };
    case "notice":
      return { ...state, notice: a.message };
    case "start":
      if (a.id > unlocked(save.results)) return state;
      return {
        ...state,
        screen: "game",
        save: settle({ ...save, game: initial(getLevel(a.id)) }),
      };
    case "resume":
      return {
        ...state,
        screen: "game",
        save: settle({
          ...save,
          game: save.game ?? initial(getLevel(unlocked(save.results))),
        }),
      };
    case "move": {
      if (
        !save.game ||
        hash(save.game) !== a.hash ||
        isWon(save.game, getLevel(save.game.levelId))
      )
        return state;
      const game = play(save.game, getLevel(save.game.levelId), a.move);
      if (game === save.game) return state;
      return { ...state, save: settle({ ...save, game }) };
    }
    case "undo":
      return save.game
        ? { ...state, save: { ...save, game: undo(save.game) } }
        : state;
    case "restart":
      return save.game
        ? {
            ...state,
            save: { ...save, game: initial(getLevel(save.game.levelId)) },
          }
        : state;
    case "setting":
      return {
        ...state,
        save: {
          ...save,
          settings: { ...save.settings, [a.key]: !save.settings[a.key] },
        },
      };
  }
}
export function boot(): AppState {
  try {
    const loaded = load(localStorage);
    return { save: settle(loaded.save), screen: "home", notice: loaded.notice };
  } catch {
    return {
      save: defaults(),
      screen: "home",
      notice:
        "Ukládání není dostupné. Hraješ v paměti; postup po zavření zmizí.",
    };
  }
}
const Context = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | null>(null);
export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, boot);
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw Error("Chybí StateProvider");
  return context;
}
