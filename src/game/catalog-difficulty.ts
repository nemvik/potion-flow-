import type { Level } from "./model";

export function mixing(level: Level) {
  const colors = [...new Set(level.bottles.flat())];
  return {
    transitions: level.bottles.reduce(
      (sum, b) => sum + b.filter((c, i) => i > 0 && c !== b[i - 1]).length,
      0,
    ),
    spread: colors.reduce(
      (sum, c) => sum + level.bottles.filter((b) => b.includes(c)).length,
      0,
    ),
  };
}

// A reproducible design estimate, not an optimal-distance or human difficulty claim.
// Search work is the minimum across three bottle orders, reducing tie-order bias.
export function difficultyRating(moves: number, searchStates: number, transitions: number, spread: number, mode: Level["mode"]) {
  // Collector adds a dedicated destination, so its raw search fan-out is larger.
  const normalizedSearch = searchStates / (mode === "collector" ? 1.6 : 1);
  return Math.round((moves * 10 + Math.log2(normalizedSearch) * 100 + transitions * 10 + spread * 5) * 10) / 10;
}
