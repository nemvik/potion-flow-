import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  certificateHint,
  checkMove,
  hash,
  isWon,
  legalMoves,
  position,
  starsFor,
  unlocked,
  type Color,
  type Move,
  type Position,
  type Target,
} from "./game/model";
import { getLevel } from "./levels";
import { persist, type Settings } from "./storage/save";
import { useApp, type Action } from "./state";
import { sound } from "./audio/sound";
import {
  Background,
  Bottle,
  BottleVisual,
  CHAPTERS,
  COLORS,
  Collector,
  DecorativeBottle,
  Icon,
  Sprite,
  Stars,
  css,
  targetLabel,
} from "./components/Visuals";
import { Sheet } from "./components/Sheet";
import type { SearchResult } from "./game/solver";
interface Animation {
  before: Position;
  from: number;
  to: Target;
  color: Color;
  amount: number;
  left: number;
  top: number;
  width: number;
  dx: number;
  dy: number;
  tx: number;
  ty: number;
  duration: number;
}
declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}
export default function App() {
  const { state, dispatch } = useApp(),
    { save, screen } = state,
    game = save.game,
    level = game ? getLevel(game.levelId) : null;
  const [selected, setSelected] = useState<number | null>(null),
    [hint, setHint] = useState<Move | null>(null),
    [invalid, setInvalid] = useState<Target | null>(null),
    [message, setMessage] = useState(""),
    [settingsOpen, setSettingsOpen] = useState(false),
    [animation, setAnimation] = useState<Animation | null>(null),
    [searching, setSearching] = useState(false),
    [dismissed, setDismissed] = useState(""),
    [systemReduced, setSystemReduced] = useState(false);
  const busy = useRef(false),
    animationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    ),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    worker = useRef<Worker | null>(null),
    requestId = useRef(0),
    storageWarned = useRef(false),
    gameRef = useRef(game),
    screenRef = useRef(screen),
    settingsRef = useRef(save.settings),
    soundVictory = useRef("");
  gameRef.current = game;
  screenRef.current = screen;
  settingsRef.current = save.settings;
  const reduced = systemReduced || save.settings.reduced,
    key = game ? hash(game) : "";
  const toast = useCallback((text: string) => {
    clearTimeout(toastTimer.current);
    setMessage(text);
    toastTimer.current = setTimeout(() => {
      setMessage("");
      setInvalid(null);
    }, 4200);
  }, []);
  const cancel = useCallback(() => {
    clearTimeout(animationTimer.current);
    animationTimer.current = undefined;
    busy.current = false;
    setAnimation(null);
    setMessage("");
    setSelected(null);
    setHint(null);
    setInvalid(null);
    setSearching(false);
    requestId.current++;
    worker.current?.terminate();
    worker.current = null;
    setDismissed("");
  }, []);
  const act = useCallback(
    (action: Action) => {
      cancel();
      setMessage("");
      setSettingsOpen(false);
      dispatch(action);
    },
    [cancel, dispatch],
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let ok = false;
    try {
      ok = persist(localStorage, save);
    } catch {
      /* Access itself may throw. */
    }
    if (!ok && !storageWarned.current) {
      storageWarned.current = true;
      dispatch({
        type: "notice",
        message:
          "Ukládání není dostupné. Hraješ v paměti; postup po zavření zmizí.",
      });
    }
  }, [save, dispatch]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    const resize = () => {
      if (busy.current) cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize", resize);
    };
  }, [cancel]);
  useEffect(
    () => () => {
      clearTimeout(animationTimer.current);
      clearTimeout(toastTimer.current);
      worker.current?.terminate();
    },
    [],
  );
  // Diagnostic hooks expose visible state, never a backdoor for changing game data.
  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        screen,
        levelId: game?.levelId,
        mode: level?.mode,
        bottles: game?.bottles,
        collectorUnits: game?.collectorUnits,
        moves: game?.history.length,
        selected,
        hint,
        busy: busy.current,
        searching,
        message,
        won: game && level ? isWon(game, level) : false,
        note: "Bottles indexed from 0; units bottom to top; collector is a target only.",
      });
    window.advanceTime = (ms) => {
      if (animation && ms >= animation.duration) {
        clearTimeout(animationTimer.current);
        busy.current = false;
        setAnimation(null);
      }
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [screen, game, level, selected, hint, animation, searching, message]);
  useEffect(() => {
    if (
      game &&
      level &&
      screen === "game" &&
      !animation &&
      isWon(game, level)
    ) {
      const victory = `${game.levelId}:${key}`;
      if (soundVictory.current !== victory) {
        soundVictory.current = victory;
        sound("win", settingsRef.current.sound);
      }
    }
  }, [game, level, screen, animation, key]);
  function startPour(from: number, to: Target) {
    if (!game || !level || busy.current) return;
    const pour = checkMove(game, level, [from, to]);
    if (!pour) {
      setInvalid(to);
      toast(
        to === "collector"
          ? `Sběrná baňka přijímá jen ${COLORS[level.collector!.color].name}.`
          : typeof to === "number" && game.bottles[to].length === 4
            ? "Tahle baňka je plná."
            : "Nahoře musí být stejná barva — nebo prázdná baňka.",
      );
      sound("invalid", save.settings.sound);
      return;
    }
    requestId.current++;
    worker.current?.terminate();
    worker.current = null;
    setSearching(false);
    setHint(null);
    setInvalid(null);
    setMessage("");
    setSelected(null);
    setDismissed("");
    busy.current = true;
    const duration = reduced ? 100 : 360;
    const src = document
      .querySelector(`[data-bottle="${from}"] .bottle-body`)
      ?.getBoundingClientRect();
    const target =
      to === "collector"
        ? [...document.querySelectorAll("[data-collector]")]
            .find((el) => el.getBoundingClientRect().width > 0)
            ?.getBoundingClientRect()
        : document
            .querySelector(`[data-bottle="${to}"] .bottle-body`)
            ?.getBoundingClientRect();
    if (!reduced && src && target) {
      const tx = target.left + target.width / 2,
        ty = target.top + (to === "collector" ? target.height / 2 : 12);
      setAnimation({
        before: position(game),
        from,
        to,
        ...pour,
        left: src.left,
        top: src.top,
        width: src.width,
        dx: tx - src.left - src.width / 2,
        dy: ty - 48 - src.top - src.height * 0.05,
        tx,
        ty,
        duration,
      });
    } else
      setAnimation({
        before: position(game),
        from,
        to,
        ...pour,
        left: 0,
        top: 0,
        width: 0,
        dx: 0,
        dy: 0,
        tx: 0,
        ty: 0,
        duration,
      });
    dispatch({ type: "move", move: [from, to], hash: key });
    sound("pour", save.settings.sound);
    clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => {
      busy.current = false;
      setAnimation(null);
    }, duration);
  }
  function onBottle(index: number) {
    if (busy.current || !game || !level || isWon(game, level)) return;
    setHint(null);
    if (selected === null) {
      if (game.bottles[index].length) {
        setSelected(index);
        sound("select", save.settings.sound);
      }
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    startPour(selected, index);
  }
  function onCollector() {
    if (busy.current) return;
    if (selected === null) {
      toast("Ze sběrné baňky nelze přelévat zpět. Nejdříve vyber zdroj.");
      return;
    }
    startPour(selected, "collector");
  }
  function requestHint() {
    if (!game || !level || busy.current || searching || isWon(game, level))
      return;
    setSelected(null);
    setInvalid(null);
    const quick = certificateHint(level, game);
    const show = (move: Move) => {
      setHint(move);
      toast(
        `Nápověda: přelij z baňky ${move[0] + 1} do ${targetLabel(move[1])}.`,
      );
    };
    if (quick) {
      show(quick);
      return;
    }
    const id = ++requestId.current,
      h = hash(game);
    setSearching(true);
    setMessage("Hledám cestu z aktuálního stavu…");
    try {
      const w = new Worker(
        new URL("./workers/hint.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = w;
      w.onmessage = (
        event: MessageEvent<{
          requestId: number;
          hash: string;
          result: SearchResult;
        }>,
      ) => {
        if (
          event.data.requestId !== requestId.current ||
          !gameRef.current ||
          event.data.hash !== hash(gameRef.current) ||
          screenRef.current !== "game"
        )
          return;
        w.terminate();
        worker.current = null;
        setSearching(false);
        const { result } = event.data;
        if (
          result.status === "solved" &&
          result.solution[0] &&
          checkMove(gameRef.current, level, result.solution[0])
        )
          show(result.solution[0]);
        else if (result.status === "proven-unsolvable")
          toast("Tento stav nemá řešení. Vrať poslední tah nebo začni znovu.");
        else
          toast(
            "Nápovědu se teď nepodařilo spočítat. Zkus vrátit poslední tah.",
          );
      };
      w.onerror = () => {
        if (id !== requestId.current) return;
        w.terminate();
        worker.current = null;
        setSearching(false);
        toast("Nápovědu se teď nepodařilo spočítat. Zkus vrátit poslední tah.");
      };
      w.postMessage({
        requestId: id,
        hash: h,
        position: position(game),
        level,
      });
    } catch {
      setSearching(false);
      toast("Nápovědu se teď nepodařilo spočítat. Zkus vrátit poslední tah.");
    }
  }
  const current = unlocked(save.results),
    total = Object.values(save.results).reduce((n, r) => n + r.stars, 0),
    complete = Object.keys(save.results).length;
  const visual = animation?.before ?? game,
    won = game && level && isWon(game, level),
    stuck = game && level && !won && legalMoves(game, level).length === 0;
  const cols = game
      ? game.bottles.length <= 5
        ? game.bottles.length
        : Math.ceil(game.bottles.length / 2)
      : 4,
    rows = game && game.bottles.length > 5 ? 2 : 1;
  const tutorial =
    game &&
    level &&
    (level.id <= 3 || level.id === 5) &&
    !save.results[level.id] &&
    !won;
  const coachMove =
    tutorial && game && level ? certificateHint(level, game) : null;
  const tutorialText =
    level?.id === 5
      ? "Sběrná baňka přijímá jen jantar. Naplň ji osmi jednotkami a roztřiď ostatní barvy."
      : level?.id === 3
        ? "Stejnou barvu spoj do plné baňky. Celý vrchní blok se přelije v jednom tahu."
        : level?.id === 2
          ? "Nalévat lze na stejnou barvu nebo do prázdné baňky. Tah může přelít více jednotek."
          : selected === null
            ? "Vyber baňku s lektvarem."
            : `Teď vyber vhodný cíl${coachMove ? ` — ${targetLabel(coachMove[1])}` : ""}.`;
  const button = (
    icon: string,
    label: string,
    onClick: () => void,
    primary = false,
  ) => (
    <button
      type="button"
      className={"btn btn-block " + (primary ? "btn-primary" : "")}
      onClick={onClick}
    >
      <Icon name={"i-" + icon} />
      {label}
    </button>
  );
  return (
    <>
      <Sprite />
      <main
        className="app"
        data-chapter={screen === "game" ? level?.chapter : 1}
        data-reduced={reduced}
        data-symbols={save.settings.symbols}
      >
        {screen === "home" && (
          <section className="screen home" aria-label="Úvod">
            <Background showSigil={false} />
            <div className="home-top">
              <button
                type="button"
                className="icon-btn"
                aria-label="Nastavení"
                onClick={(event) => {
                  event.currentTarget.focus();
                  setSettingsOpen(true);
                }}
              >
                <Icon name="i-gear" />
              </button>
            </div>
            <div className="home-hero">
              <div className="hero-bottles" aria-hidden="true">
                <div className="hero-glow" />
                <DecorativeBottle
                  units={["G", "G", "Y"]}
                  className="b-side l"
                />
                <DecorativeBottle
                  units={["B", "V", "P", "O"]}
                  className="b-main"
                />
                <DecorativeBottle
                  units={["R", "W", "W"]}
                  className="b-side r"
                />
              </div>
              <h1 className="wordmark">
                <span className="w1">POTION</span>
                <span className="w2">FLOW</span>
              </h1>
              <p className="tagline">Přelévej, třiď, uzavři každý lektvar.</p>
            </div>
            <div className="home-actions">
              <button
                id="start-btn"
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => act({ type: "resume" })}
              >
                <Icon name="i-play" />
                <span>
                  {game ? "Pokračovat" : "Hrát"}
                  <span className="sub">
                    Level {game?.levelId ?? current} ·{" "}
                    {game
                      ? `${game.history.length} tahů`
                      : current === 1
                        ? "krátký návod"
                        : "další hádanka"}
                  </span>
                </span>
              </button>
              {button("grid", "Levely", () =>
                act({ type: "nav", screen: "levels" }),
              )}
              <div className="resume-meta">
                <span>
                  <b>{complete}</b> / 30 hotovo
                </span>
                <span>
                  <b className="gold">★ {total}</b> / 90
                </span>
                <span>
                  Kapitola{" "}
                  <b>{["I", "II", "III"][Math.ceil(current / 10) - 1]}</b>
                </span>
              </div>
            </div>
          </section>
        )}
        {screen === "levels" && (
          <section className="screen" aria-label="Výběr levelů">
            <header className="levels-head">
              <button
                className="icon-btn"
                aria-label="Zpět na úvod"
                onClick={() => act({ type: "nav", screen: "home" })}
              >
                <Icon name="i-back" />
              </button>
              <h1>Levely</h1>
              <span className="star-total" aria-label={`${total} z 90 hvězd`}>
                <Icon name="i-star" />
                {total}
              </span>
            </header>
            <div className="levels-body">
              {CHAPTERS.map((chapter, c) => {
                const ids = Array.from(
                    { length: 10 },
                    (_, i) => c * 10 + i + 1,
                  ),
                  done = ids.filter((i) => save.results[i]).length,
                  stars = ids.reduce(
                    (n, i) => n + (save.results[i]?.stars ?? 0),
                    0,
                  ),
                  locked = current < ids[0];
                return (
                  <section
                    key={chapter}
                    className={"chapter " + (locked ? "is-locked" : "")}
                    data-chapter={c + 1}
                    aria-label={`Kapitola ${c + 1}`}
                  >
                    <div className="chapter-head">
                      <div>
                        <div className="num">
                          Kapitola {["I", "II", "III"][c]}
                        </div>
                        <h2>{chapter}</h2>
                      </div>
                      <div className="prog">
                        {locked ? (
                          `po levelu ${c * 10}`
                        ) : (
                          <>
                            <b>{done}</b>/10
                            <br />★ {stars}/30
                          </>
                        )}
                      </div>
                    </div>
                    <div className="tiles">
                      {ids.map((id) => {
                        const result = save.results[id],
                          col = id % 5 === 0,
                          isLocked = id > current,
                          isCurrent = id === current && !result;
                        return (
                          <button
                            key={id}
                            type="button"
                            className={[
                              "tile",
                              result ? "is-done" : "",
                              isCurrent ? "is-current" : "",
                              isLocked ? "is-locked" : "",
                              col ? "is-collector" : "",
                            ].join(" ")}
                            aria-label={`Level ${id}${col ? ", Sběr" : ""}${isLocked ? ", zamčeno" : result ? `, hotovo, ${result.stars} hvězd` : ", aktuální"}`}
                            aria-disabled={isLocked}
                            onClick={() => {
                              if (isLocked) {
                                toast("Nejdříve dokonči předchozí level.");
                                return;
                              }
                              if (game?.levelId === id) act({ type: "resume" });
                              else act({ type: "start", id });
                            }}
                          >
                            {col && (
                              <span className="flask">
                                <Icon name="i-flask" />
                              </span>
                            )}
                            {isLocked && (
                              <Icon name="i-lock" className="lock" />
                            )}
                            <span>{id}</span>
                            {result ? (
                              <Stars count={result.stars} />
                            ) : (
                              isCurrent && <span className="play">Hraj</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              <div className="legend" aria-hidden="true">
                <span>
                  <i />
                  Hotovo
                </span>
                <span>
                  <i className="cur" />
                  Aktuální
                </span>
                <span>
                  <i className="lock" />
                  Zamčeno
                </span>
                <span>
                  <i className="col" />
                  Sběr (každý 5.)
                </span>
              </div>
            </div>
          </section>
        )}
        {screen === "game" && game && level && visual && (
          <section
            className={
              "screen game " +
              (level.collector ? "has-collector " : "") +
              (tutorial ? "has-tutorial" : "")
            }
            style={css({ "--cols": cols, "--rows": rows })}
            aria-label={`Level ${level.id}`}
          >
            <div className="motes" aria-hidden="true" />
            <header className="hud">
              <button
                type="button"
                className="icon-btn"
                aria-label="Zpět na levely"
                onClick={() => act({ type: "nav", screen: "levels" })}
              >
                <Icon name="i-back" />
              </button>
              <div className="hud-title">
                <div className="lvl">
                  Level {level.id}
                  <span
                    className={
                      "mode-chip " + (level.collector ? "is-collector" : "")
                    }
                  >
                    {level.collector ? "Sběr" : "Classic"}
                  </span>
                </div>
                <div className="chap">
                  Kapitola {["I", "II", "III"][level.chapter - 1]} ·{" "}
                  {CHAPTERS[level.chapter - 1]}
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Nastavení"
                onClick={(event) => {
                  event.currentTarget.focus();
                  cancel();
                  setSettingsOpen(true);
                }}
              >
                <Icon name="i-gear" />
              </button>
            </header>
            <div className="hud-stats">
              <span className="moves">
                Tahy <b data-moves>{game.history.length}</b>
              </span>
              <span
                className="par"
                aria-label={`Cíl pro 3 hvězdy: nejvýše ${level.parMoves} tahů`}
              >
                Cíl pro <Icon name="i-star" />
                <Icon name="i-star" />
                <Icon name="i-star" /> ≤ {level.parMoves} tahů
              </span>
            </div>
            <div className="stage-row">
              {level.collector && (
                <Collector
                  variant="tall"
                  color={level.collector.color}
                  units={visual.collectorUnits}
                  target={
                    selected !== null &&
                    !!checkMove(game, level, [selected, "collector"])
                  }
                  hint={hint?.[1] === "collector"}
                  invalid={invalid === "collector"}
                  onClick={onCollector}
                />
              )}
              <div className="play-area">
                {level.collector && (
                  <Collector
                    variant="compact"
                    color={level.collector.color}
                    units={visual.collectorUnits}
                    target={
                      selected !== null &&
                      !!checkMove(game, level, [selected, "collector"])
                    }
                    hint={hint?.[1] === "collector"}
                    invalid={invalid === "collector"}
                    onClick={onCollector}
                  />
                )}
                {tutorial && (
                  <div className="tutorial-note" role="status">
                    <span className="coach-bubble">
                      {tutorialText}
                      {coachMove && (
                        <small>
                          {selected === null
                            ? `Začni baňkou ${coachMove[0] + 1}.`
                            : "Zvýrazněné baňky jsou legální cíle."}
                        </small>
                      )}
                    </span>
                  </div>
                )}
                <div className="board-wrap">
                  <Background />
                  <div
                    className="board"
                    role="group"
                    aria-label="Herní plocha"
                    aria-busy={!!animation}
                  >
                    {visual.bottles.map((units, index) => (
                      <Bottle
                        key={index}
                        units={units}
                        index={index}
                        selected={selected === index}
                        target={
                          selected !== null &&
                          selected !== index &&
                          !!checkMove(game, level, [selected, index])
                        }
                        hint={
                          hint?.[0] === index
                            ? 1
                            : hint?.[1] === index
                              ? 2
                              : null
                        }
                        invalid={invalid === index}
                        onClick={() => onBottle(index)}
                        corked={!!won && !animation}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <nav className="actionbar" aria-label="Ovládání levelu">
              <button
                type="button"
                className="act"
                onClick={() => act({ type: "undo" })}
                disabled={!game.history.length}
              >
                <Icon name="i-undo" />
                Zpět
              </button>
              <button
                type="button"
                className="act hint"
                onClick={requestHint}
                disabled={searching || !!won || !!animation}
              >
                <Icon name="i-bulb" />
                {searching ? "Hledám…" : "Nápověda"}
              </button>
              <button
                type="button"
                className="act"
                onClick={() => act({ type: "restart" })}
              >
                <Icon name="i-restart" />
                Znovu
              </button>
            </nav>
          </section>
        )}
        {animation && animation.width > 0 && (
          <div
            className="pour-fx"
            aria-hidden="true"
            style={css({
              "--pour-duration": `${animation.duration}ms`,
              "--dx": `${animation.dx}px`,
              "--dy": `${animation.dy}px`,
              "--angle": `${animation.dx >= 0 ? 65 : -65}deg`,
            })}
          >
            <span
              className="bottle pour-ghost"
              style={
                {
                  left: animation.left,
                  top: animation.top,
                  "--bw": `${animation.width}px`,
                } as CSSProperties
              }
            >
              <BottleVisual units={animation.before.bottles[animation.from]} />
            </span>
            <span
              className="pour-stream"
              style={css({
                left: animation.tx,
                top: animation.ty - 48,
                "--c": `var(--liq-${animation.color})`,
              })}
            />
          </div>
        )}
        {screen === "game" && animation && animation.width > 0 && (
          <style>{`[data-bottle="${animation.from}"] .bottle-body{visibility:hidden}`}</style>
        )}
        {message && (
          <div className="toast is-on" role="status">
            {message}
          </div>
        )}
        {state.notice && (
          <div className="storage-notice" role="status">
            {state.notice}
            <button
              type="button"
              aria-label="Zavřít upozornění"
              onClick={() => dispatch({ type: "notice", message: "" })}
            >
              <Icon name="i-close" />
            </button>
          </div>
        )}
        {settingsOpen && (
          <Sheet title="Nastavení" onClose={() => setSettingsOpen(false)}>
            <div className="set-list">
              {(
                [
                  {
                    key: "sound",
                    icon: "sound",
                    label: "Zvuky",
                    note: "Jemné zvuky výběru a přelití",
                  },
                  {
                    key: "reduced",
                    icon: "motion",
                    label: "Omezené animace",
                    note: systemReduced
                      ? "Systémové omezení pohybu je aktivní"
                      : "Bez letu baněk a částic",
                  },
                  {
                    key: "symbols",
                    icon: "shapes",
                    label: "Symboly barev",
                    note: "Tvary pro snadné rozlišení lektvarů",
                  },
                ] as {
                  key: keyof Settings;
                  icon: string;
                  label: string;
                  note: string;
                }[]
              ).map((s) => (
                <button
                  type="button"
                  className="set-row"
                  key={s.key}
                  role="switch"
                  aria-checked={
                    save.settings[s.key] ||
                    (s.key === "reduced" && systemReduced)
                  }
                  disabled={s.key === "reduced" && systemReduced}
                  onClick={() => {
                    if (s.key === "reduced") cancel();
                    dispatch({ type: "setting", key: s.key });
                  }}
                >
                  <span className="ic">
                    <Icon name={"i-" + s.icon} />
                  </span>
                  <span>
                    <b>{s.label}</b>
                    <small>{s.note}</small>
                  </span>
                  <span className="switch" />
                </button>
              ))}
            </div>
            <div className="swatches" aria-label="Barvy a symboly">
              {Object.entries(COLORS).map(([c, value]) => (
                <span
                  key={c}
                  className="swatch"
                  title={`${value.name}: ${value.symbol}`}
                  style={css({ "--c": `var(--liq-${c})` })}
                >
                  {save.settings.symbols && <Icon name={"pf-sym-" + c} />}
                </span>
              ))}
            </div>
            <p className="set-foot">Postup se ukládá v tomto prohlížeči.</p>
          </Sheet>
        )}
        {!settingsOpen &&
          screen === "game" &&
          won &&
          !animation &&
          game &&
          level && (
            <Sheet
              title={
                level.id === 30 ? "Kampaň dokončena!" : "Lektvary roztříděny!"
              }
              onClose={() => act({ type: "nav", screen: "levels" })}
              className="win"
              closable={false}
            >
              <p className="eyebrow">
                {level.id === 30
                  ? "Všech 30 levelů je hotovo"
                  : `Level ${level.id} dokončen`}
              </p>
              <div
                className="win-stars"
                aria-label={`${starsFor(game.history.length, level.parMoves)} ze 3 hvězd`}
              >
                {[1, 2, 3].map((i) => (
                  <svg
                    key={i}
                    className={
                      i <= starsFor(game.history.length, level.parMoves)
                        ? "on"
                        : ""
                    }
                    aria-hidden="true"
                  >
                    <use href="#i-star" />
                  </svg>
                ))}
              </div>
              <div className="win-stats">
                <div className="stat">
                  <small>Tahy</small>
                  <b>{game.history.length}</b>
                </div>
                <div className="stat best">
                  <small>Cíl pro 3 ★</small>
                  <b>≤ {level.parMoves}</b>
                </div>
              </div>
              <div className="sheet-actions">
                {button(
                  level.id === 30 ? "grid" : "play",
                  level.id === 30 ? "Zpět na levely" : "Další level",
                  () =>
                    act(
                      level.id === 30
                        ? { type: "nav", screen: "levels" }
                        : { type: "start", id: level.id + 1 },
                    ),
                  true,
                )}
                <div className="row">
                  {button("restart", "Znovu", () => act({ type: "restart" }))}
                  {button("grid", "Levely", () =>
                    act({ type: "nav", screen: "levels" }),
                  )}
                </div>
              </div>
            </Sheet>
          )}
        {!settingsOpen &&
          screen === "game" &&
          stuck &&
          !animation &&
          key !== dismissed && (
            <Sheet
              title="Žádné další přelití"
              onClose={() => setDismissed(key)}
            >
              <div className="nomoves-icon">
                <Icon name="i-undo" />
              </div>
              <p>
                Teď nemáš legální tah. Vrať poslední přelití nebo začni tento
                level znovu.
              </p>
              <div className="sheet-actions">
                {button(
                  "undo",
                  "Zpět o tah",
                  () => act({ type: "undo" }),
                  true,
                )}
                {button("restart", "Znovu", () => act({ type: "restart" }))}
              </div>
            </Sheet>
          )}
      </main>
    </>
  );
}
