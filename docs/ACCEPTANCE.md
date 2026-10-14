# Akceptační kritéria a QA

Hra je hotová pouze tehdy, když jsou implementované funkce skutečně ověřené. Záznamy „mělo by fungovat“ nejsou provedené testy. Každý neprovedený test v reportu označ a vysvětli proč.

## A. Engine a invarianty — automatické testy

1. Pole baněk se vyhodnocují odspodu nahoru; poslední prvek je vrchní jednotka.
2. Nalití do prázdné baňky přesune celý vrchní souvislý blok, ne jen jeden kus.
3. Nalití na stejnou barvu přesune správný počet jednotek.
4. Nedostatek místa přelije přesně zbývající kapacitu, nikoli celý blok přes limit.
5. Prázdný zdroj, stejný zdroj/cíl, cizí vrchní barva a plný cíl jsou odmítnuty beze změny.
6. Nevalidní indexy/barvy/vstupy jsou odmítnuty kontrolovaně; nevedou ke korupci boardu.
7. Barvy se nemíchají, žádná baňka nepřekročí kapacitu a počty jednotek všech barev se po libovolné legální sérii nemění.
8. Náhodně generované legální sekvence ověří invarianty a přesný návrat celé sekvence pomocí undo. Zahrň oba režimy.
9. Classic nekončí při částečně naplněných jednobarevných baňkách stejné barvy; končí jen podle přesné podmínky.
10. Plná jednobarevná běžná baňka může být zdroj, pokud board ještě není vyhraný.
11. Sběr přijímá jen cílovou vrchní barvu, dodržuje kapacitu osm a neztrácí jednotky z celkového součtu.
12. Ze sběrné baňky nelze nalévat, ale lze vrátit poslední nalití pomocí undo.
13. Samotná plná sběrná baňka bez dokončení běžných barev není vítězství.
14. Samotné roztřídění běžných baněk bez osmi cílových jednotek v nádrži není vítězství Sběru.
15. Platný tah zvýší počet tahů o jeden, undo jej sníží o jeden; nelegální tah a nápověda jej nemění.
16. Restart vrací přesně definovaný počáteční stav včetně prázdného sběru a nulové historie.
17. Bez legálních tahů se nerozpoznává prohra, pokud je již splněna výhra.
18. Referenční tři řešení z GAME_SPEC skutečně vedou k očekávaným výsledkům.

## B. Katalog, solver a skóre

19. Existuje přesně 30 jedinečných levelů; Sběr používají přesně ID 5, 10, 15, 20, 25 a 30.
20. Pro všech 30 levelů sedí kapacity, počty barev, počet počátečních prázdných baněk a limity velikosti boardu.
21. Každé uložené řešení se přehraje od začátku, každý krok je legální a poslední stav vyhraje. Samotné tvrzení generátoru nestačí.
22. Žádný startovní level není již vyřešený. Katalog nemá zjevné duplikáty vzniklé jen přejmenováním barev/permutací lahví.
23. `parMoves` je délka ověřené rozumné cesty; UI ji neoznačuje za optimální, pokud optimalita nebyla dokázána.
24. Generátor je deterministický pro stejný seed, skončí v limitech a nepřijme neověřené kandidáty.
25. Hint v počátečním stavu každého levelu vrátí legální tah z ověřené cesty.
26. Po odbočení z původní cesty hint používá skutečný aktuální stav. Alespoň na malých testovacích boardech dolož, že nalezená cesta opravdu vítězí.
27. Timeout vrací `unknown/timeout`, ne `unsolvable`. Neřešitelnost označ jen při dokončeném průkazu.
28. Opožděná odpověď workeru se ignoruje po novém tahu, undo, restartu a změně levelu.
29. Dlouhá žádost o hint neblokuje UI; lze ji zneplatnit přechodem či novým stavem.
30. Hvězdy odpovídají všem hraničním hodnotám vzorce a starší lepší výsledek se nepřepíše horším.
31. Odemknutí postupu je správné, vítězství je idempotentní a level 30 neodemyká neexistující level 31.

## C. Ukládání

32. Refresh obnoví rozehraný board, sběr, tahy a historii včetně možnosti undo; žádný tah se nezapočte dvakrát.
33. Progress i nastavení přetrvají přechody mezi obrazovkami a normální reload.
34. Neplatný JSON, nesprávný tvar, neznámá verze, barva, level či porušená historie neshodí aplikaci.
35. Nedostupný localStorage a chyba zápisu vedou k funkčnímu hraní v paměti a jednorázovému vysvětlení.
36. Restart levelu nemaže postup kampaně. Vizuální obnova vítězného stavu neudělí duplicity.

## D. Browser E2E a vizuální kontrola

37. Projdi domov → tutorial → výhra → další level → výběr levelů → pokračovat. Ověř skutečný Classic i Sběr.
38. Proveď několik rychlých dvojitých tapnutí/kliknutí během animace; množství a počet tahů zůstanou správné.
39. Undo, restart, přechod do jiného levelu a skrytí tabu během animace nezanechají zaseknutý input ani plovoucí „ghost“ baňku.
40. Zkontroluj vybraný zdroj, nepovolený cíl, platné částečné nalití, hint, výhru a stav bez legálních tahů.
41. Zkontroluj 375 × 667, 390 × 844 a 360 × 800, dále 320 px šířku, 768 × 1024 a 1440 × 900. Vždy alespoň největší Classic a největší Sběr layout.
42. Na prioritních mobilních rozměrech se běžně vejdou board a akční lišta; na malých rozměrech a při zvětšení textu nezmizí ovládání. Nikde horizontální overflow.
43. Ověř tap targets alespoň 48 × 48 CSS px. Dekorace skla ani animované vrstvy nekradou tapy.
44. Otestuj ovládání myší i klávesnicí, viditelný focus, názvy tlačítek, fokus v dialozích a ovládání bez hoveru.
45. Zvuk jde vypnout a zapnout, je podmíněn interakcí a selhání audio API nebrání hraní. Respektuje se omezený pohyb.
46. Nastavení symbolů/vzorů má viditelný efekt; žádné nastavení není nefunkční přepínač.
47. Žádné produkční tlačítko nevede na placeholder. Demo přepínač z designu se neobjevuje v produkční hře.
48. Produkční build běží přes preview/static server. Není chyba konzole, rozbitý asset, neočekávaný externí request nebo požadavek na backend.
49. Porovnej skutečný build s vyrenderovaným design.html: rozvržení, tvary baněk, paleta, typografie, ovládání, proporce, dialogy. Zásadní rozdíly oprav, drobné záměrné rozdíly zaznamenej.
50. Proveď alespoň kompletní hráčský průchod levely 1–5, jeden střední a jeden pozdní level. Engine replay všech řešení nepovažuj za náhradu vizuálního playthrough. Zaznamenej zjištěné problémy s tempem/čitelností/obtížností.

## Povinné výstupy

- Zdrojový projekt, lockfile a README s reálnými příkazy pro spuštění a statický build.
- 30 katalogových levelů a jejich řešení, generátor a validátor.
- Provedené unit/E2E testy a konzistentní skripty typecheck/lint/build.
- `artifacts/screenshots/`: nejméně mobilní Classic, mobilní Sběr, největší board, výhra, výběr levelů a desktop. K nim screenshoty relevantní designové reference pro porovnání.
- `artifacts/QA_REPORT.md`: spuštěné příkazy, pass/fail, prohlížeče a viewporty, screenshoty, skutečné platformy, zbylá omezení a problémy.
- `docs/PROGRESS.md`: dokončené milníky a důležitá rozhodnutí.

Headless WebKit je test WebKitu v daném prostředí, nikoli důkaz fyzického testování na iPhonu. Tvrzení „60 FPS na iPhonu“ nebo „funguje ve všech prohlížečích“ vyžaduje skutečné příslušné měření/test. Pokud chybí dostupný nástroj pro vizuální prohlídku, uveď to jako neověřenou část a nedeklaruj vizuální shodu.
