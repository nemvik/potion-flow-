# POTION FLOW

Mobile-first logická hra v češtině: 50 konkrétních hádanek, Classic a Sběr každý pátý level. React, strict TypeScript, Vite, čistý TypeScript engine, lokální SVG/CSS a zvuky syntetizované přes Web Audio. Bez backendu a externích runtime požadavků.

## Spuštění

Node.js 22.12+ a pnpm 11 (verze je uvedena v package.json):

```sh
pnpm install
pnpm dev
```

Otevři adresu vypsanou Vite (výchozí http://127.0.0.1:5173).

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm levels:validate
pnpm build
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

E2E spouští lokální preview **produkčního** buildu na portu 4174. Před E2E spusť build. `pnpm exec playwright show-report artifacts/playwright-report` otevře HTML report. Playwright instalace je potřeba jen jednou na daném počítači.

## Statický build

```sh
pnpm build
pnpm preview
```

Výstup `dist/` lze obsluhovat libovolným statickým serverem. Vite používá relativní asset cesty a navigace mezi obrazovkami je uvnitř aplikace; není nutný serverový routing ani SPA fallback pro další URL. Veřejný deployment není součástí projektu. Service worker a PWA nejsou implementované.

## Ovládání

Klepni na zdroj a pak na cíl. Přelévá se celý souvislý vrchní blok, případně jen tolik, kolik se vejde. Stejná barva nebo prázdná baňka jsou platné cíle. Opětovným klepnutím na zdroj výběr zrušíš. Na klávesnici použij Tab/Shift+Tab a Enter/mezerník. Dialogy drží focus; Escape je zavře nebo vrátí na levely po výhře.

Zpět a Znovu jsou neomezené. Hotovou běžnou baňku můžeš během levelu dál přelévat. Ve Sběru přesouvej jantar do samostatné nádrže, ze které lze vracet jen přes Zpět. Nápověda hledá skutečnou cestu z aktuálního stavu, stojí nula tahů a nesnižuje hvězdy. Výpočet ve workeru má časový i paměťový limit; vypršení není prohra.

Nastavení nabízí zvuk, omezené animace a symboly jednotlivých barev. Systémové omezení pohybu má přednost. Zvuk se inicializuje až po interakci. Pokračovat obnoví rozehraný board a celou uloženou historii.

## Katalog a architektura

- `src/game/`: pravidla, historie, invarianty, skóre, replay, validátor a bounded best-first solver bez Reactu/DOM/storage/audio.
- `src/levels/catalog.json`: stabilní katalog s verzí, difficulty poznámkami a dopřednými certifikáty. `parMoves` je délka ověřené cesty, nikoli důkaz matematického optima.
- `scripts/generate-levels.ts`: deterministický generátor s počátečními tutorialy, seedovanými kandidáty a limitem pokusů. Přijímá jen solverem nalezené a znovu přehrané řešení; zamítá symetrické duplikáty. Hra negeneruje levely za běhu.
- `src/workers/`: výpočet hintu z aktuálního snapshotu, 2,8 s / 60 000 stavů, request ID a hash pro odmítnutí zastaralé odpovědi.
- `src/state.tsx`: reducer/context; výsledky se aktualizují idempotentně při atomické změně.
- `src/storage/`: namespacované verzované uložení, validace přehráním, částečné zachování výsledků/nastavení a fallback do paměti.
- `src/components/`, `src/App.tsx`: skutečné React obrazovky; `src/design.css` a SVG sprite jsou převzaté z podkladu. `design/design.html` zůstává nezměněnou referencí.

```sh
pnpm levels:generate --seed=74129
pnpm levels:generate --check
pnpm levels:validate
```

Generátor přepíše pouze katalog po úspěšné validaci všech kandidátů. Pro původní první milník lze použít `--count=5`; takový vývojový katalog není určen k finálnímu vydání. Pro jiný seed nejprve zkontroluj obtížnost a screenshoty. Ověřené řešení nemusí být nejkratší a delší certifikát sám o sobě neurčuje zábavnost.

Kampaň má pět kapitol; nové levely 31–50 mají 7–8 barev, větší rozptyl barev mezi lahvemi a ověřené cesty o 30–32 tazích. Původních 30 zadání zůstává stejných, starý postup se zachová a dokončený level 30 nově odemyká level 31. Špunt a zlatá pečeť označují hotovou barvu, ze které lze dál přelévat. Po výhře se krátce zobrazí konfety, pokud nejsou omezené animace.

Lokální uložení má klíč `potion-flow:save:v1`. Data jsou jen v daném prohlížeči; vymazání dat webu odstraní postup. Pokud storage nefunguje, hra pokračuje v paměti a zobrazí vysvětlení. Neplatná rozehraná data se neobnoví, platný postup a nastavení se zachovají, kdykoli to formát dovolí.

Průběh milníků je v [docs/PROGRESS.md](docs/PROGRESS.md). Lokální QA report `artifacts/QA_REPORT.md`, screenshoty, logy a browser reporty v `artifacts/` se neverzují. Screenshoty obsahují implementaci i vyrenderovanou vizuální referenci. Headless WebKit není test fyzického iPhonu.
