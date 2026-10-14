import data from "./catalog.json" with { type: "json" };
import type { Level } from "../game/model";
export const levels = data as unknown as Level[];
export const getLevel = (id: number): Level => {
  const level = levels.find((l) => l.id === id);
  if (!level) throw Error("Neznámý level");
  return level;
};
