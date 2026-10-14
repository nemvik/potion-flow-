import { useEffect, useState } from "react";
import { css } from "./Visuals";

// One short, bounded CSS burst. No canvas, frame loop, or extra dependency.
export function Confetti() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2400);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          style={css({
            left: `${4 + ((i * 29) % 92)}%`,
            "--confetti-color": ["#ffe08a", "#9ff0d6", "#ff829e", "#8fcfff", "#c9acff"][i % 5],
            "--drift": `${(i % 2 ? 1 : -1) * (18 + (i * 17) % 70)}px`,
            "--spin": `${(i % 2 ? 1 : -1) * (240 + (i % 4) * 90)}deg`,
            "--fall": `${1500 + (i % 5) * 120}ms`,
            "--delay": `${(i % 8) * 45}ms`,
          })}
        />
      ))}
    </div>
  );
}
