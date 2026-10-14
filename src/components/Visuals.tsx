import { type CSSProperties } from "react";
import sprite from "./sprite.svg?raw";
import { isDone, type Color, type Target } from "../game/model";
export const COLORS: Record<Color, { name: string; symbol: string }> = {
  R: { name: "Rubín", symbol: "kruh" },
  O: { name: "Jantar", symbol: "trojúhelník" },
  Y: { name: "Citrín", symbol: "hvězda" },
  G: { name: "Smaragd", symbol: "kosočtverec" },
  B: { name: "Azurit", symbol: "čtverec" },
  V: { name: "Ametyst", symbol: "kříž" },
  P: { name: "Růženín", symbol: "srdce" },
  W: { name: "Perla", symbol: "prsten" },
};
export const CHAPTERS = [
  "Učňovská dílna",
  "Měsíční laboratoř",
  "Hvězdná destilerie",
];
export function css(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}
export function Sprite() {
  return (
    <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />
  );
}
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg aria-hidden="true" className={className}>
      <use href={"#" + name} />
    </svg>
  );
}
export function Stars({ count }: { count: number }) {
  return (
    <span className="stars" aria-label={`${count} ze 3 hvězd`}>
      {[1, 2, 3].map((i) => (
        <svg
          key={i}
          aria-hidden="true"
          style={{
            color: i <= count ? "var(--pf-star)" : "var(--pf-star-off)",
          }}
        >
          <use href="#i-star" />
        </svg>
      ))}
    </span>
  );
}
export function LiquidLayer({ color, count }: { color: Color; count: number }) {
  return (
    <span
      className="seg"
      data-color={color}
      style={css({ "--c": `var(--liq-${color})`, height: `${count * 25}%` })}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="unit">
          <Icon name={"pf-sym-" + color} />
        </span>
      ))}
    </span>
  );
}
export function BottleVisual({ units }: { units: Color[] }) {
  const groups: { color: Color; count: number }[] = [];
  for (const color of units) {
    const last = groups.at(-1);
    if (last?.color === color) last.count++;
    else groups.push({ color, count: 1 });
  }
  return (
    <>
      <span className="bottle-body">
        <Icon name="pf-glass-back" />
        <span className="liquid">
          {groups.map((g, i) => (
            <LiquidLayer key={i} {...g} />
          ))}
        </span>
        <Icon name="pf-glass-front" />
        <Icon name="pf-cork" className="cork" />
      </span>
      <span className="pad" />
    </>
  );
}
export function DecorativeBottle({
  units,
  className = "",
}: {
  units: Color[];
  className?: string;
}) {
  return (
    <span className={"bottle " + className} aria-hidden="true">
      <BottleVisual units={units} />
    </span>
  );
}
export function Bottle({
  units,
  index,
  selected,
  target,
  hint,
  invalid,
  onClick,
  corked = false,
}: {
  units: Color[];
  index: number;
  selected: boolean;
  target: boolean;
  hint: 1 | 2 | null;
  invalid: boolean;
  onClick: () => void;
  corked?: boolean;
}) {
  const description = units.length
    ? "odspodu " + units.map((c) => COLORS[c].name).join(", ")
    : "prázdná";
  return (
    <button
      type="button"
      data-bottle={index}
      aria-label={`Baňka ${index + 1}: ${description}, volno ${4 - units.length}${isDone(units) ? ", hotová" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "bottle",
        selected ? "is-selected" : "",
        target ? "is-target" : "",
        hint === 1 ? "is-hint-from" : hint === 2 ? "is-hint-to" : "",
        invalid ? "is-invalid" : "",
        isDone(units) ? "is-done" : "",
        corked ? "is-corked" : "",
      ].join(" ")}
      style={css({ "--done-c": `var(--liq-${units[0] ?? "R"})` })}
    >
      <BottleVisual units={units} />
      {hint && (
        <span className="badge n" aria-hidden="true">
          {hint}
        </span>
      )}
      {invalid && (
        <span className="badge x" aria-hidden="true">
          ×
        </span>
      )}
    </button>
  );
}
export function Collector({
  color,
  units,
  variant,
  target,
  hint,
  invalid,
  onClick,
}: {
  color: Color;
  units: number;
  variant: "compact" | "tall";
  target: boolean;
  hint: boolean;
  invalid: boolean;
  onClick: () => void;
}) {
  const label = (
    <span className="col-label">
      <span className="col-drop">
        <Icon name="i-drop" />
        <Icon name={"pf-sym-" + color} className="sym-inline" />
      </span>
      <span className="col-text">
        <small>Sběr · {COLORS[color].name}</small>
        <b>
          {units}
          <span>/8</span>
        </b>
      </span>
    </span>
  );
  return (
    <button
      type="button"
      data-collector={variant}
      aria-label={`Sběrná baňka: ${COLORS[color].name}, ${units} z 8. Přijímá jen ${COLORS[color].name}.`}
      onClick={onClick}
      className={[
        "collector",
        variant,
        target ? "is-target" : "",
        hint ? "is-hint-to" : "",
        invalid ? "is-invalid" : "",
        units === 8 ? "is-full" : units === 0 ? "is-empty" : "",
      ].join(" ")}
      style={css({ "--fill": units / 8, "--cc": `var(--liq-${color})` })}
    >
      {variant === "compact" ? (
        <>
          {label}
          <span className="tube">
            <span className="tube-liquid" />
            <span className="tube-ticks" />
          </span>
        </>
      ) : (
        <>
          <span className="tall-body">
            <Icon name="pf-col-back" />
            <span className="tall-liquid">
              <span className="tall-fill" />
            </span>
            <span className="tall-liquid tall-units">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i}>
                  <Icon
                    name={"pf-sym-" + color}
                    className={i < units ? "on" : ""}
                  />
                </span>
              ))}
            </span>
            <Icon name="pf-col-front" />
          </span>
          {label}
        </>
      )}
    </button>
  );
}
export function Background({ showSigil = true }: { showSigil?: boolean } = {}) {
  return (
    <>
      <div className="motes" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            style={css({
              left: `${(i * 37) % 100}%`,
              "--s": `${2 + (i % 3)}px`,
              "--d": `${12 + ((i * 7) % 10)}s`,
              "--delay": `${-i * 1.7}s`,
              "--dx": `${i % 2 ? 20 : -20}px`,
            })}
          />
        ))}
      </div>
      {showSigil && <Icon name="pf-sigil" className="sigil" />}
    </>
  );
}
export function targetLabel(t: Target): string {
  return t === "collector" ? "sběrné baňky" : `baňky ${t + 1}`;
}
