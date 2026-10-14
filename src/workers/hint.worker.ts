/// <reference lib="webworker" />
import { solve } from "../game/solver";
import type { Level, Position } from "../game/model";
export interface HintRequest {
  requestId: number;
  hash: string;
  position: Position;
  level: Level;
}
self.onmessage = (event: MessageEvent<HintRequest>) => {
  const { requestId, hash, position, level } = event.data;
  try {
    self.postMessage({
      requestId,
      hash,
      result: solve(position, level, { maxMs: 2800, maxStates: 60000 }),
    });
  } catch {
    self.postMessage({
      requestId,
      hash,
      result: { status: "unknown", visited: 0 },
    });
  }
};
