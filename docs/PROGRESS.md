# POTION FLOW — průběh implementace

Original prompt: Vytvořit kompletní funkční mobile-first React/TypeScript hru podle design/design.html a docs/GAME_SPEC.md; 30 ověřených levelů, Classic a Sběr, lokální postup, současná nápověda, přístupné ovládání, animace, zvuk a skutečné browser QA. Bez deploymentu a placených operací.

## Kritéria dokončení
- Čistý engine přesných pravidel, atomicita, vratná historie a invarianty.
- React převod dodaného HTML; žádné prototypové mocky ani iframe.
- 30 konkrétních levelů, replay certifikáty, deterministický bounded generátor.
- Bezpečná persistence, aktuální hint worker, postup a hvězdy.
- Typecheck, lint, unit testy, validace katalogu, E2E a statický build.
- Vizuální porovnání, hráčské průchody a poctivý report v artifacts/.

## Vstupní průzkum
- Přečteny AGENTS.md, GAME_SPEC.md, ACCEPTANCE.md a MILESTONES.md.
- Prohlédnuta reference/game-reference.jpeg. Existující HTML obsahuje lokální SVG sklo/symboly, petrolejové povrchy, zlaté akce a barevné kapaliny; runtime externí assety nepotřebuje.
- Prázdný projekt bez lockfilu a bez Git metadat. Použit pnpm; zdrojový design zůstává zachován.
- Skills: develop-web-game, frontend-design, playwright. SVG/DOM a Playwright testy mají přednost podle explicitního zadání před obecnými canvas doporučeními skillu.

## M1 — rozpracováno
- Základ React 19 / strict TypeScript / Vite / Vitest / Playwright.

## M1 — dokončeno
- Čistý engine Classic/Sběr, historie, přesné bloky, částečné nalití, invarianty, restart a výhra.
- Pět konkrétních certifikovaných levelů, sdílený replay validátor a bounded best-first solver.
- `pnpm test`: 26 testů PASS; `pnpm typecheck`: PASS po opravě typování importu JSON.
- `node scripts/smoke.mjs`: skutečný UI replay L1–5, výhry po 3/3/4/10/6 tazích, žádné page errors. Screenshoty `m1-*`.

## M2 — implementace hotová, navazuje rozšířené QA
- React komponenty Bottle, LiquidLayer, Collector, HUD, ActionBar a nativní dialogy. Převzaté CSS tokeny a SVG assety z HTML; source design beze změny.
- Home, levely, obě herní varianty, tutorial v reálném boardu, výhra, pat a nastavení.
- Atomické potvrzení tahu před animací, synchronní input lock, zrušení při undo/restart/navigaci/visibility/resize.
- Nativní keyboard controls, focus v dialogu, symboly, systémově i uživatelsky omezený pohyb, jemné audio po interakci.
- Vyrenderované reference mobil/desktop (`reference-*`), prohlédnuté mobilní Classic a desktopový Sběr, vizuálně zkontrolován home a tutorial průřezu.

## M3 — rozpracováno
- Verzované ukládání a přehráním ověřená historie, odemykání a idempotentní nejlepší výsledky.
- Nápověda z hashů všech stavů certifikátu; jinak ohraničený worker, ochrana request ID/hash a terminace při změně.

## M3 — dokončeno, probíhá integrační QA
- Katalog obsahuje 30 jedinečných levelů; ID 5/10/15/20/25/30 mají Sběr. Největší Classic i Sběr mají 10 běžných baněk.
- Seed 74129, ověřené cesty 3–29 tahů; první 3 jsou záměrně strukturované tutorialy a první Sběr je mírnější změna rytmu.
- `pnpm test`: 78 testů PASS včetně všech 30 replayů, symetrických duplicit, aktuální nápovědy, limitů, persistence a skóre.
- `pnpm levels:validate`, `pnpm typecheck`, `pnpm lint`, `pnpm build`: PASS před integrační sadou.
- Standardní `web_game_playwright_client.js` spuštěn přes dočasný module resolver pro projektový Playwright; screenshot a textový stav v `artifacts/game-client/m3/`, snímek vizuálně prohlédnut.

## M4 — rozpracováno
- Připraveny browser testy skutečné celé kampaně, animací/inputu, obnovení sběru, stale workerů, storage výpadků, klávesnice a všech požadovaných layoutů pro Chromium/WebKit.
- První E2E start odhalil Node ESM požadavek na JSON import attribute; opraveno na `with {type:'json'}`. Samotná hra/build touto chybou netrpěly.

## M4 — hlavní sada dokončena
- `pnpm test:e2e`: **44 PASS (4,5 min)**, Chromium 156.0.8078.4 a WebKit 27.2. Oba prohlížeče prošly celou kampaní L1–30 přes UI; finále neodemyká L31.
- Největší Classic/Sběr ověřeny na 375×667, 390×844, 360×800, 320×568, 768×1024, 1440×900. Bez horizontálního overflow, na prioritních mobilech lišta i board ve viewportu, měřené board/HUD/action cíle ≥48 px.
- Prošly race testy, reload sběru/historie, skutečný worker hint mimo certifikát, stale odpovědi po tahu/undo/restartu/změně levelu, memory storage fallback, klávesnice, dialogy, symboly, reduced motion, částečné nalití i dosažitelný pat.
- Opraveny zjištěné problémy: kolize SVG ID gradientu/zátky, tutorial překrývající hrdla, Tab cyklus a návrat fokusu v macOS WebKitu. Testy regresí procházejí. Chyba selektoru posledního tlačítka kampaně a chybějící správná WebKit binárka byly opraveny v test prostředí.
- `pnpm test`: **79 PASS**. Typecheck/lint/30-level validace/build PASS. Generátor dvakrát `--check` PASS se stejným seedem; katalog se nekontrolovaně nepřepisuje.
- Samostatný interaktivní hráčský průchod L1–5, L16, L28 dokončen (3/3/4/11/6/20/27 aktuálních tahů), log `artifacts/PLAYER_LOG.jsonl`, snímky `player-*`. Použity vlastní tahy, odbočky, undo a skutečné UI hinty; žádné čtení certifikátů hráčským nástrojem.
- Finální production screenshoty všech obrazovek a viewportů v `artifacts/screenshots/final-*`; asset/console kontrola PASS, žádné externí runtime requesty. Referenční HTML vykresleno mobil/desktop, zdroj zachován.
- Proveden oddělený závěrečný review průchod enginu, historie, worker konkurence, ukládání a React lifecycle; aplikován React best practices checklist.
- Poslední drobnost: odstraněn meniskus z prázdné sběrné baňky přes explicitní `is-empty` stav (React serializuje CSS custom property s mezerami). Následuje cílený layout/audio/touch průchod a obnovení screenshotů.

## M4 — dokončeno
- Závěrečné cílené browser QA: **30 PASS (17,9 s)** po poslední kosmetické změně. Obsahuje všechny největší layouty, tutorial, skutečné touch tapy a instrumentované nativní audio/mute v obou browserech. Celkem 48 různých úspěšně provedených browser případů; oba reporty zůstávají v artifacts/.
- Finální typecheck, lint a statický build znovu PASS. Finální screenshots/console/asset kontrola znovu PASS včetně worker hintu.
- QA_REPORT.md zaznamenává konkrétní příkazy, výsledky, opravená selhání, mapování acceptance checklistu, vizuální rozdíly, hráčské průchody a neověřené platformy.
- Všechny milníky hotové. Žádný deploy, backend ani placená operace. Známý blokující problém nezůstává. Fyzická zařízení, lidské playtesty a device FPS jsou poctivě neověřené.

## Doplnění — favicon
- Přidána lokální `public/favicon.svg`: skleněná baňka s modrou/fialovou/růžovou kapalinou a zlatou zátkou na petrolejovém pozadí. Zapojena přes `rel="icon"` v index.html.
- `pnpm build`: PASS. Browser kontrola produkčního odkazu: HTTP 200, MIME image/svg+xml, obsah dist/favicon.svg odpovídá zdroji. Vizuální náhled 16/32/64/128 px uložen a prohlédnut v `artifacts/screenshots/favicon-preview.png`.

## Úklid verzovaných výstupů
- `artifacts/` a lokální cache `.pnpm-store/` jsou ignorované Gitem; soubory zůstávají lokálně. Zdrojové testy, QA skripty a konfigurace se nadále verzují.

## Mobilní animace — 15. 10. 2026
- Původních 360 ms zahrnovalo i přesun a návrat baňky; kapalina zůstávala ve starém stavu a na konci skokově přeskočila. Celé přelití nyní trvá 820–1000 ms podle objemu, vlastní tok probíhá mezi 28–72 % animace.
- Úbytek i přírůstek kapaliny jsou synchronizované CSS transformace bez React aktualizací po jednotlivých snímcích. Také sběr používá scale místo animované šířky/výšky. Návrat končí na skutečné základní pozici baňky.
- Konec řídí animationend; časovač s rezervou 1500 ms slouží jen jako pojistka. Undo/restart/navigace/skrytí/resize a změna systémového omezení pohybu animaci bezpečně ukončí. Herní tah i uložení zůstávají atomické.
- Na dotykovém rozhraní jsou vypnuté herní dekorativní částice a SVG drop-shadow efekty výběru/cílů; zůstává zvednutí baňky a zvýraznění podstavců. Trvalé will-change na všech lahvích bylo odstraněno.
- QA skripty čekají na skutečné odemčení boardu, nikoli pevně 400/440 ms. Nové browser regrese kontrolují mezisnímky, objemy, návrat, opožděný začátek a změnu reduced motion.
- Vizuální kontrola našla ořez nakloněné baňky u levého okraje. Náklon nyní míří na prostornější stranu cíle; přidaná regrese ověřuje celý obrys i na šířce 320 px.
- `pnpm test`: **79 PASS**; `pnpm levels:validate`: **30 PASS**; `pnpm typecheck`, `pnpm lint`, `pnpm build`: **PASS**. `pnpm exec playwright test`: **60 PASS (4,9 min)** v Chromiu/WebKitu včetně celé kampaně. Po finální úpravě náklonu a doplnění pojistky/320px regresí `POTION_REPORT_DIR=artifacts/playwright-mobile-motion-report pnpm exec playwright test tests/e2e/motion.spec.ts`: **16 PASS (20,2 s)**.
- `pnpm exec tsx scripts/capture-qa.ts`: PASS bez console/page/asset chyb a externích requestů; nové snímky vizuálně prohlédnuty. Standardní herní klient vyžadoval dočasný DOM fallback pro klikání bez canvasu; výsledný stav potvrzuje jeden skutečný tah.
- `pnpm exec tsx artifacts/profile-motion.ts`: 12 přelití na L28/L30 při běžné a 4× zpomalené CPU, 390×844, touch, DPR 2. Medián intervalů requestAnimationFrame 16,7 ms, žádný interval nad 50 ms, 3–4 layouty za přelití po jeho zahájení. Jde o headless Chromium na macOS, nikoli fyzický telefon nebo měření device FPS. Podrobnosti a snímky zůstávají lokálně v `artifacts/`.
- Závěrečný review ověřil lifecycle callbacků/časovače, přerušení a reduced motion, transformace vrstev, zachování enginu/storage a React best practices. Fyzická zařízení zůstávají neověřená.
- Samostatná desktopová kontrola vysokého sběru v Chromiu i WebKitu: midpoint 1/8 a konec 2/8 PASS, bez změny množství při dokončení.
