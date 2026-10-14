import { levels } from "../src/levels";
import { validateCatalog } from "../src/game/catalog-validation";
validateCatalog(levels);
console.log(
  "PASS: 30 jedinečných levelů, počty/kapacity, 6 Sběrů a každý legální certifikát končí výhrou.",
);
