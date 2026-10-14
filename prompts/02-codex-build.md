# Prompt pro Codex

Rozbal celý balíček do kořene projektu. Z Claude Design ulož HTML jako `design/design.html`. Pokud export obsahuje další soubory, zachovej je v adresáři `design/` i s relativními cestami. Potom vlož:

---

Vytvoř kompletní funkční mobile-first webovou hru POTION FLOW podle přiloženého vizuálního návrhu a specifikace. Nechci další plán ani klikací demo, ale hratelnou a otestovanou aplikaci.

NEJPRVE
Přečti AGENTS.md, docs/GAME_SPEC.md, docs/ACCEPTANCE.md a docs/MILESTONES.md. Prohlédni reference/game-reference.jpeg. Otevři a vyrenderuj design/design.html na mobilní i desktopové šířce. Zjisti jeho obrazovky, tokeny, assety a interakční stavy.

HTML je zdroj vizuální podoby. GAME_SPEC je zdroj pravdy pro pravidla. Neimportuj celý návrh přes iframe, nenahrazuj herní plochu screenshotem a neponechávej mockované přechody jako skutečnou logiku. Převeď design do použitelných React komponent a zachovej jeho charakter. Chybějící drobné stavy dopracuj ve stejném stylu; pokud HTML vůbec chybí, vyžádej si jej místo vymyšlení jiného designu.

TECHNOLOGIE A ROZSAH
V prázdném projektu použij React, TypeScript strict a Vite, SVG/CSS, čistý TypeScript engine, Vitest a Playwright. Pro správu stavu stačí React reducer a context; nepřidávej knihovny bez důvodu. Respektuj existující package manager, jinak použij pnpm. Bez backendu, účtů, externího AI API, reklam, plateb, analytiky a 3D enginu. Produkční výstup musí být statický build.

IMPLEMENTACE
Implementuj přesná pravidla Classic a Sběr včetně přesunu celého vrchního souvislého bloku, kapacit, částečného přelití, undo a vítězství. Stav ukládej odděleně od animací. Jedno nalití je jedna atomická změna; opakované tapnutí nesmí kapalinu zdvojit, ztratit ani přičíst další tah. Změna levelu, restart, undo a opuštění tabu musí bezpečně vyřešit probíhající animaci.

Dodej 30 konkrétních levelů se vzestupnou obtížností. Levely 5, 10, 15, 20, 25 a 30 používají sběrnou baňku. Ke každému levelu ulož legální posloupnost tahů vedoucí k výhře a automaticky ji přehraj v testech. Nezařazuj náhodný shuffle bez důkazu řešitelnosti. Vytvoř skript pro generování a validaci katalogu. Dokumentovaná cesta je ověřené řešení, nikoli automaticky nejkratší řešení.

Přidej tutorial, skutečný výběr levelů, odemykání, hvězdy podle specifikace, neomezené undo/restart, aktuální nápovědu, lokální postup a rozpracovanou hru. Nápovědu počítej z aktuálního stavu, ne slepě z původního řešení; dražší hledání běží ve workeru s limitem a ochranou proti zastaralým výsledkům. Timeout nesmí být označen jako důkaz neřešitelnosti. Dokončené běžné baňky během levelu nesmí být nevratně zamčené.

Dokonči všechny obrazovky návrhu, animace přelévání, decentní zvuk po uživatelské interakci, mute, omezené animace a přístupné ovládání. Žádná mrtvá tlačítka. Ukládání musí zvládnout poškozená data i nedostupný localStorage. Hra musí být ovladatelná dotykem, myší a klávesnicí.

POSTUP
Pracuj po milnících z docs/MILESTONES.md: nejprve funkční průřez s pravidly a pěti ověřenými levely, potom vizuální dotažení, celý katalog a závěrečné QA. Průběžně aktualizuj docs/PROGRESS.md a pokračuj přes všechny milníky bez čekání na schválení drobností. Neprováděj veřejný deploy ani placené operace. Nerozšiřuj scope o denní výzvy, PWA nebo další mechaniky, dokud nejsou splněná zadaná kritéria.

OVĚŘENÍ A DODÁNÍ
Spusť typecheck, lint, unit testy, validaci všech 30 řešení, E2E a produkční build. V prohlížeči ověř mobilní rozměry 375 × 667, 390 × 844 a 360 × 800, tablet a desktop; včetně nejtěžšího layoutu s deseti baňkami a sběrem. Porovnej screenshoty s design.html a oprav zásadní vizuální rozdíly. Zkontroluj konzoli i assety v produkčním buildu.

Do artifacts/ ulož screenshoty a QA report. V závěru uveď příkazy pro spuštění, co bylo skutečně ověřeno, případné zbylé problémy a neověřené platformy. Headless WebKit nezaměňuj za test na fyzickém iPhonu. Začni implementovat a skonči až funkčním otestovaným výsledkem, nikoli scaffoldem.
