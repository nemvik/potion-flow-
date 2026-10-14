import { levels } from "../src/levels";
import { validateCatalog } from "../src/game/catalog-validation";
validateCatalog(levels);
console.log(
  `PASS: ${levels.length} jedinečných levelů, počty/kapacity, ${levels.filter((l) => l.collector).length} Sběrů a každý legální certifikát končí výhrou.`,
);
