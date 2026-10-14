import {
  applyMove,
  canonical,
  initial,
  isDone,
  isWon,
  legalMoves,
  topRun,
  type Level,
  type Move,
  type Position,
} from "./model";
export type SearchResult =
  | { status: "solved"; solution: Move[]; visited: number }
  | { status: "timeout" | "unknown" | "proven-unsolvable"; visited: number };
interface Node {
  p: Position;
  parent: Node | null;
  move: Move | null;
  depth: number;
  score: number;
}
class Heap {
  items: Node[] = [];
  push(n: Node) {
    const a = this.items;
    let i = a.length;
    a.push(n);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].score <= n.score) break;
      a[i] = a[p];
      i = p;
    }
    a[i] = n;
  }
  pop(): Node | undefined {
    const a = this.items,
      root = a[0],
      last = a.pop();
    if (a.length && last) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let c = i * 2 + 1;
        if (c + 1 < a.length && a[c + 1].score < a[c].score) c++;
        if (a[c].score >= last.score) break;
        a[i] = a[c];
        i = c;
      }
      a[i] = last;
    }
    return root;
  }
}
// Best-first ordering only. No legal move is pruned; bottle permutation is a rule-preserving symmetry.
function estimate(p: Position, level: Level): number {
  let transitions = 0,
    partial = 0;
  for (const b of p.bottles) {
    for (let i = 1; i < b.length; i++) if (b[i] !== b[i - 1]) transitions++;
    if (b.length && !isDone(b)) partial++;
  }
  return (
    transitions * 5 +
    partial * 2 +
    (level.collector ? (8 - p.collectorUnits) * 0.7 : 0)
  );
}
export function solve(
  start: Position,
  level: Level,
  options: { maxMs?: number; maxStates?: number } = {},
): SearchResult {
  const maxMs = options.maxMs ?? 2800,
    maxStates = options.maxStates ?? 60000,
    end = performance.now() + maxMs;
  const heap = new Heap(),
    seen = new Set<string>([canonical(start)]);
  heap.push({
    p: start,
    parent: null,
    move: null,
    depth: 0,
    score: estimate(start, level),
  });
  while (heap.items.length) {
    if (performance.now() >= end)
      return { status: "timeout", visited: seen.size };
    const node = heap.pop()!;
    if (isWon(node.p, level)) {
      const solution: Move[] = [];
      let n = node;
      while (n.parent && n.move) {
        solution.push(n.move);
        n = n.parent;
      }
      return {
        status: "solved",
        solution: solution.reverse(),
        visited: seen.size,
      };
    }
    const moves = legalMoves(node.p, level);
    // Prefer collecting, then merging. Ordering doesn't alter completeness.
    moves.sort((a, b) => priority(b, node.p) - priority(a, node.p));
    for (const move of moves) {
      const p = applyMove(node.p, level, move)!,
        key = canonical(p);
      if (seen.has(key)) continue;
      if (seen.size >= maxStates)
        return { status: "unknown", visited: seen.size };
      seen.add(key);
      heap.push({
        p,
        parent: node,
        move,
        depth: node.depth + 1,
        score: estimate(p, level) + (node.depth + 1) * 0.28,
      });
    }
  }
  return { status: "proven-unsolvable", visited: seen.size };
}
function priority(move: Move, p: Position): number {
  return move[1] === "collector"
    ? 20
    : (p.bottles[move[1]].length ? 10 : 0) + topRun(p.bottles[move[0]])!.amount;
}
export function solveLevel(
  level: Level,
  options?: { maxMs?: number; maxStates?: number },
): SearchResult {
  return solve(initial(level), level, options);
}
