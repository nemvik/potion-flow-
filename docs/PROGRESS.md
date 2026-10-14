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

## M5 — dokončené lahve, konfety a dalších 20 levelů
- Zadání: lépe zvýraznit hotové lahve se špuntem, přidat konfety po dokončení a složitější další levely; výsledek commitnout a pushnout do main.
- Kritéria: špunt jen na plné jednobarevné lahvi, stále legální přelití a undo; jednorázové neblokující konfety s reduced motion; 50 řešitelných unikátních levelů, zachování původních 30 a save v1; kompletní kontroly a skutečné browser QA.
- Katalog rozšířen na 50: kapitoly Mistrovská observatoř a Prastarý archiv. Nové Classic mají 8 barev, Sběr 7; každá barva je nejméně ve třech lahvích, nové certifikáty mají 30–32 tahů a vyšší počet barevných hranic. Jde o návrhové signály, nikoli tvrzení o optimální obtížnosti či lidském playtestu.
- Kontrolní SHA-256 chrání původních 30 záznamů včetně řešení; katalogová i storage verze zůstávají 1. Současné finále je L50 a původní dokončené L30 odemyká L31. Rozšířeny počty kapitol, hvězd a ukládaných výsledků.
- Dokončené lahve mají špunt, zlatý podstavec a pečeť; při výběru se odšpuntují, bez změny pravidel. Konfety tvoří 36 krátkých CSS animací transform/opacity ve vrstvě dialogu, po 2,4 s se odstraní; systémové i uživatelské omezení pohybu je vynechá.
- První příliš přísný generátorový limit pro L41 skončil výslovnou chybou a katalog nepřepsal. Prahy druhé kapitoly upraveny na nejméně 31 certifikovaných tahů; finální generátor dokončil všech 50 levelů.
- Dosud: `pnpm typecheck`, `pnpm lint`, `pnpm test` (**106 PASS**) a `pnpm build` PASS. Následuje browser ověření, vizuální kontrola a závěrečný review.
- Finální ověření: `pnpm levels:validate` **50 PASS** a `pnpm levels:generate --check` PASS se seedem 74129. Cílené oslavy/migrace **12 PASS (29,6 s)**. `pnpm exec playwright test --workers=2`: **76 PASS (5,6 min)** včetně kampaně 1–50 přes skutečné UI v Chromiu i WebKitu, finále bez L51 a layoutů nových L49/L50 od 320 px po desktop. Prošly také všechny předchozí mobilní animační regrese.
- `pnpm exec tsx scripts/capture-qa.ts`: PASS, žádné console/page/asset chyby ani externí runtime requesty. Prohlédnuty screenshoty hotové lahve, konfet, L31 a L50 na mobilu, desktop a diagnostický herní klient. QA report, screenshoty a samostatný závěrečný review jsou lokálně v ignorovaných `artifacts/`.
- Interaktivní agentem řízená kontrola L31 bez čtení certifikátu: vlastní odbočky, undo a živá UI nápověda do 13 tahů, bez input locku nebo chyb. Tento částečný průchod není vydáván za lidský playtest ani dokončení; dokončení všech levelů ověřila samostatná E2E kampaň.
- Samostatný závěrečný review ověřil kompatibilitu save/catalog v1 a původních dat, odemykání, legální tahy hotových lahví, lifecycle dekorací, reduced motion a React best practices. Bez nových závislostí nebo změny zdrojového designu. Fyzické telefony, lidská obtížnost a device FPS nejsou v této změně měřené.

## M6 — levely 51–100 s rostoucí obtížností
- Zadání: dalších přesně 50 postupně těžších levelů, zachování původních levelů a postupu, ověření a push do main.
- Kritéria: katalog 100 unikátních řešitelných zadání; původních 50 záznamů beze změny; striktně rostoucí reprodukovatelné hodnocení L51–100 a neklesající délka nejkratší ze tří nalezených cest; UI deseti kapitol, uložení/odemčení L50 → L51 a správné finále L100; všechny požadované kontroly, vizuální QA a samostatný závěrečný review.
- Průzkum potvrdil, že samotné přidávání barevných hranic je při max. 8 barvách/10 lahvích téměř vyčerpané. Nový offline generátor proto porovnává kandidáty ve třech pořadích lahví, přemapuje tahy zpět a používá nejkratší nalezenou cestu, nejmenší počet prozkoumaných pozic, promíchání a rozptyl barev. Sběr má korekci větvení kvůli samostatnému cíli. Jde o návrhový odhad, nikoli důkaz optimální nebo lidsky vnímané obtížnosti.
- Nové cesty mají neklesající délku 28 → 29 → 30 tahů podle částí kampaně. Srovnání původního a nového obsahu používá stejnou tříprůchodovou metodu; uložené původní certifikáty se nepřepisují. Každé nové zadání má uložený a validovaný profil obtížnosti.
- Pool je deterministický, omezený počtem kandidátů, stavů a časem. První zkusmé pořadí bez korekce větvení Sběru nedalo úplnou rostoucí řadu a nic neuložilo. Finální generování sestavilo všech 100 certifikátů; čeká finální testování a QA.
- Dokončeno: přesně 50 nových levelů v pěti kapitolách, celkem 100 levelů / 300 hvězd. Hodnocení nové řady roste 1285,9 → 1382,9 nad stejně posouzeným L50 (1284,9). Přímé srovnání i SHA-256 ověřují přesné zachování původních 50 záznamů; katalogový diff pouze přidává data.
- `pnpm test`: **162 PASS**, čtyři soubory včetně přepočtu všech nových profilů, replayů, původních dat a save v1. `pnpm levels:validate`: **100 PASS**, 20 Sběrů; `pnpm levels:generate --check`: PASS, reprodukuje celý katalog se seedem 74129. Finální `pnpm typecheck`, `pnpm lint`, `pnpm build` a `git diff --check`: PASS.
- `pnpm exec playwright test --workers=2`: **78 PASS (5,3 min)**. Chromium i WebKit prošly celou kampaň 1–100 přes UI, finále bez L101, migrace uložených L30/L50, nové layouty L99/L100 ve všech šesti velikostech od 320 px a všechny předchozí motion regrese. Dlouhá kampaň používá reduced animace a existující diagnostický časový hook pouze k dokončení animace; pravidla i vítězství stále vyhodnocuje skutečná hra.
- `pnpm exec tsx scripts/capture-qa.ts`: PASS bez console/page/asset chyb a externích runtime requestů. Vizuálně prohlédnuty mobilní L51, L75 a L100, screenshot živé nápovědy a výstup standardního herního klienta. Samostatná kontrola L100 provedla vlastní tahy 0→9 a 3→9, získala skutečný worker hint, vrátila tah a obnovila jej po reloadu (moves=1, busy=false, errors=[]).
- Herní klient po prvním timeoutu startovního tlačítka při souběžných kontrolách zopakován úspěšně; doložen skutečný tah L1, moves=1, busy=false. První pokus doplňkového skriptu L100 použil nelegální druhý tah; opravena pouze testovací posloupnost a kontrola znovu PASS. Nešlo o změny herního kódu.
- Samostatný závěrečný review zaznamenán v ignorovaném `artifacts/M6_REVIEW.md`; QA report a snímky zůstávají lokálně. Bez nových závislostí, změny zdrojového designu či deploymentu. Lidsky vnímaná obtížnost a fyzické telefony nebyly testovány; kombinované skóre je poctivě označené jako návrhový odhad.
