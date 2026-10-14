# POTION FLOW — specifikace první hratelné verze

Status: implementační zadání, nikoli hotová aplikace. Název je pracovní; nejde o ověřenou značku.

## 1. Produktový záměr a hranice

Mobile-first webová singleplayer logická hra inspirovaná přeléváním barevných vrstev. Hráč má během několika sekund pochopit ovládání, zažít uspokojivé přelití a chtít pokračovat na další level. Cílová délka běžného levelu je přibližně 1–3 minuty; je to návrhový cíl k ověření hraním, ne zaručená metrika.

Aktuální verze má 100 konkrétních levelů, dvě související varianty pravidel, postup po kapitolách, hvězdy, neomezené undo/restart, nápověda a lokální ukládání. Nejsou zde reklamy, energie, placené boostery, skutečné peníze, účty, multiplayer, analytické SDK ani server. Nepřidávat klíče, zamčené lahve, skryté vrstvy, led, měnící se barvy ani jiné překážky.

Velká sběrná baňka je varianta cíle, ne dekorace maskující neexistující mechaniku. Každý pátý level používá Sběr. Tyto levely mají změnit rytmus hry; nepovažovat je automaticky za obtížnější „bossy“.

Obsah se může načíst jako statický web. Offline spuštění po uzavření prohlížeče, PWA instalace, cloud save a denní výzvy nejsou součástí tohoto zadání. Všechny runtime assety mají být lokální součástí aplikace, bez potřeby AI API či CDN.

## 2. Herní reprezentace

Běžná baňka má kapacitu `4`. Její obsah je pole identifikátorů barev **odspodu nahoru**; poslední položka je vrchní jednotka. Prázdná baňka je `[]`. Jednotky jsou diskrétní a stejně velké. Barvy se chemicky nemísí; gradienty a deformace hladiny jsou jen vizuální efekt.

Herní stav zahrnuje level ID a verzi katalogu, obsahy pravidelných baněk, případný obsah sběrné baňky, historii provedených tahů a odvozený počet tahů. Stav výběru, dočasné animace a zvuk nejsou zdrojem pravdy herního modelu.

Barvy mají stabilní ID nezávislá na CSS. Jednotlivé skiny nesmějí přemapovat ID na navzájem matoucí odstíny. Podporovat nejvýše osm barev a volitelné symboly/vzory. Reference z reklamy není specifikace barev ani geometrie.

## 3. Běžné přelévání — přesný kontrakt

Tah je identifikován zdrojem a cílem, nikoli uživatelem voleným množstvím. UI ani hint solver nesmějí umožnit přelít libovolný počet jednotek.

Tah mezi běžnými baňkami je legální právě tehdy, když:

1. Zdroj a cíl jsou různé existující baňky.
2. Zdroj není prázdný a cíl není plný.
3. Cíl je prázdný, nebo má nahoře stejnou barvu jako zdroj.

Nechť `runLength` je délka maximálního souvislého vrchního bloku této barvy a `free = 4 - target.length`. Přelij přesně `min(runLength, free)` jednotek. Částečný přesun kvůli nedostatku místa je povolen. Zdrojový blok se nesmí přeskočit a nelze nalít pod jinou barvu.

Každé úspěšné přelití stojí jeden tah bez ohledu na objem. Nelegální pokus není tah a nemění uloženou hru, historii ani hvězdy. Platné, ale strategicky zbytečné přesuny jsou stále legální. Engine nesmí odmítat legální tah jen proto, že heuristic solver jej obvykle nezkouší.

Plná jednobarevná běžná baňka je zvýrazněná zlatou pečetí a špuntem. Při výběru se špunt skryje; baňka zůstává legálním zdrojem, dokud level neskončil. Může být označena za dokončenou, ale nesmí dostat nevratný zámek nebo přestat přijímat vstup. Zátkování při finální oslavě vítězství nemění pravidla.

## 4. Varianty a podmínky výhry

### Classic

Každá barva se v počátečním stavu vyskytuje přesně čtyřikrát. Při počtu barev `C` je běžných baněk `C + 2`: `C` plných a dvě prázdné. Počet běžných baněk je nejvýše deset.

Výhra nastane, pokud je každá baňka prázdná, nebo má přesně čtyři jednotky jediné barvy. Pouze „v každé lahvi je jedna barva“ nestačí, pokud stejná barva zůstává rozdělena do částečně plných lahví.

### Sběr / Collector

Jedna pevně určená barva se vyskytuje osmkrát, ostatní barvy čtyřikrát. Celkový počet barev `C` zahrnuje sbíranou barvu. Běžných baněk je `C + 3`: `C + 1` plných a dvě prázdné. Navíc existuje samostatná, zpočátku prázdná sběrná baňka s kapacitou osm. Pro Sběr je nejvýše sedm barev a deset běžných baněk.

Sběrná baňka je platný cíl, jen když má volno a vrchní barva zdroje je určená cílová barva. Přesune se `min(runLength, collectorFree)` jednotek. Jiné barvy se odmítají. Ze sběrné baňky nelze vytvářet tahy zpět, ale undo musí nalití vrátit v plném rozsahu.

I cílovou barvu lze před odebráním do sběrné baňky standardně přelévat mezi běžnými baňkami. Vylití do sběrné baňky je výslovný tah hráče, ne automatický odvod kapaliny. Sběrná baňka tedy není univerzální odpadní nádoba ani extra volný buffer pro jiné barvy.

Výhra vyžaduje současně: osm jednotek cílové barvy ve sběrné baňce; žádnou cílovou barvu v běžných baňkách; všechny běžné baňky prázdné nebo plné a jednobarevné. Přemístěním kapaliny do sběrné baňky se celkové množství jednotek nesnižuje, pouze mění umístění.

## 5. Ovládání, historie a konec tahu

Klepnutí na neprázdný zdroj jej vybere. Opětovné klepnutí na stejný zdroj výběr zruší. Klepnutí na prázdnou baňku bez aktivního zdroje nic neprovede. Klepnutí na jiný cíl zkusí přelít; při nelegálním pokusu se zobrazí krátká zpětná vazba a zdroj zůstane vybraný. Po úspěšném nalití se výběr zruší. Sběrná baňka nikdy není zdroj.

Jedno nalití je atomická engine operace: validace, vytvoření předchozího a nového stavu, přidání historie, uložený nový stav. Renderer animuje přechod mezi snapshoty, nikoli postupné herní přidávání jednotek. Animace nemá určovat, zda tah platí.

Během nalévací animace nepřijímat další board tahy. Undo/restart/změna levelu musejí animaci zrušit a provést požadovanou operaci přesně jednou. Skrytí tabu či přerušení animace nezanechá input lock ani rozpracované množství kapaliny. Doporučená délka nalití je 250–400 ms; jde o výchozí nastavení k doladění.

Undo je neomezené, vrátí jeden skutečný tah včetně sběrné baňky a sníží počet tahů o jedna. Počet tahů pro hodnocení odpovídá délce aktuální nevrácené historie. Hint sám není tah. Restart obnoví původní board a vyprázdní historii, ale nemaže celkový postup kampaně.

Výhru vyhodnotit po každé změně stavu i po validním obnovení uložené hry. Zápis nejlepšího výsledku musí být idempotentní. Win dialog a odemčení dalšího levelu nesmí vzniknout vícekrát kvůli rerenderu či obnovení stránky.

## 6. Patová situace a nápověda

Hra nemá limit času ani počtu pokusů. Patová situace není zákaz dalšího hraní celého účtu: nabídne Zpět a Znovu.

- `no-legal-moves`: board není vyhraný a neexistuje žádný legální tah. Zobraz jasnou nabídku undo/restart.
- `proven-unsolvable`: solver dokončil úplné hledání v relevantním prostoru a opravdu prokázal, že aktuální stav nelze vyřešit. Smí nabídnout návrat.
- `timeout` / `unknown`: vyčerpaný čas nebo paměť. Nesmí být prezentován jako prohra ani důkaz neřešitelnosti.

Pouhá existence opakovatelných přesunů mezi volnými baňkami není důkaz, že hráč umí level dokončit. V MVP neprovádět drahé úplné hledání po každém tahu; použít jednoduchou kontrolu legálních tahů a solver na žádost o nápovědu.

Nápověda pracuje s aktuálním boardem. Pokud se jeho hash shoduje se stavem na známé ověřené cestě, lze použít její další tah. V ostatních případech proveď ohraničené hledání ve Web Workeru. Doporučený pracovní limit jedné žádosti: nejvýše 3 sekundy a explicitní limit prozkoumaných stavů/paměti. UI zůstane živé. Při změně stavu zahoď výsledek s neaktuálním request ID/hashem. Stejně zahoď výsledek po restartu nebo změně levelu.

Zobraz jen první tah skutečně nalezené legální cesty. Při nedokončeném hledání napiš například „Nápovědu se teď nepodařilo spočítat. Zkus vrátit poslední tah.“ Nevydávej náhodný legální tah za vypočítanou nápovědu k řešení. Ve startovním stavu každého levelu musí být rychlá nápověda z certifikátu dostupná.

## 7. Katalog 100 levelů

| Levely | Cílové zaměření | Barvy |
|---|---|---|
| 1–3 | Ovládání, shodná barva, volné místo; jen Classic | 2–3 |
| 4–10 | Několik kroků dopředu, představení Sběru | 3–4 |
| 11–20 | Více promíchaných vrstev a rozhodování | 5–6 |
| 21–30 | Náročnější plánování | Classic 6–8, Sběr 6–7 |
| 31–40 | Mistrovská observatoř: rozptýlené barvy, nejméně 22 střídání vrstev | Classic 8, Sběr 7 |
| 41–50 | Prastarý archiv: nejméně 23 střídání vrstev, hlubší plánování | Classic 8, Sběr 7 |
| 51–60 | Křišťálová věž: první stupeň nové vzestupné řady | Classic 8, Sběr 7 |
| 61–70 | Sluneční alchymie: delší cesty a vyšší kombinované hodnocení | Classic 8, Sběr 7 |
| 71–80 | Zrcadlové komnaty: složitější hledání při stejné délkové třídě | Classic 8, Sběr 7 |
| 81–90 | Astrální kovárna: další délkový stupeň | Classic 8, Sběr 7 |
| 91–100 | Koruna alchymistů: nejvyšší hodnocení nové řady | Classic 8, Sběr 7 |

Sběrné jsou přesně násobky pěti od 5 do 100. Na začátku každého levelu jsou dvě běžné prázdné baňky. Herní board je od začátku plně viditelný. Nepoužívat náhodně skrývané vrstvy nebo náhodné tresty.

Deset kapitol po deseti levelech může sdílet mírně odlišné pozadí a dekorace. Kapitola je vizuální odměna, nikoli nový subsystém vybavení. Odemkne se dokončením předchozího levelu; k postupu stačí jakékoli vítězství, hvězdy nejsou paywall ani povinný grind.

Rozšíření je append-only: původních 50 zadání, certifikátů, ID a katalogová verze 1 zůstávají beze změny kvůli uloženému postupu. Dokončení levelu 30 odemyká 31 a dokončení 50 nyní odemyká 51; finále je level 100. V kapitolách 31–50 je každá barva rozptýlená nejméně ve třech baňkách. Nalezené certifikáty mají nejméně 30 tahů pro levely 31–40 a 31 tahů pro 41–50; tyto délky nejsou důkazem optimální obtížnosti.

Nové levely 51–100 mají navíc profil `difficulty`. Každá barva se vyskytuje nejméně ve třech lahvích a zadání má alespoň 22 barevných hranic. Offline hodnocení prozkoumá tři pořadí lahví s limitem 20 000 stavů a 5 sekund na průchod, vezme nejkratší nalezené řešení a nejmenší počet navštívených pozic, tahy přemapuje na uložený board. Skóre je zaokrouhlený součet `10 × délka cesty + 100 × log2(pozice / korekce) + 10 × hranice + 5 × rozptyl`; korekce je 1 pro Classic a 1,6 pro větší větvení Sběru. Skóre každého následujícího nového levelu musí být vyšší a délka nalezené cesty nesmí klesnout. Nová řada používá 28 tahů pro 51–60, 29 pro 61–80 a 30 pro 81–100. Tříprůchodové hodnocení L50 tvoří dolní hranici nové řady; původní řešení L50 se nepřepisuje. Toto je reprodukovatelný návrhový odhad, nikoli důkaz optimální vzdálenosti nebo subjektivně přísně rostoucí lidské obtížnosti.

Každý katalogový záznam obsahuje alespoň `id`, `catalogVersion`, `chapter`, `mode`, `bottles`, případný collector descriptor, `solution`, `parMoves` a stručnou poznámku k obtížnosti. Odvozené počty barev a jednotek ověřit, nikoli slepě důvěřovat metadatům.

`solution` je posloupnost legálních přesunů zdroj → cíl pod skutečnými pravidly maximálního přelití. Test ji přehraje a musí dojít k výhře. Nejméně první tři levely tvoř záměrně jako tutorial, ne náhodným výběrem. Další obtížnost posuzuj pomocí více signálů: délka rozumně krátkého řešení, počet barevných přechodů, počet smysluplných voleb a ruční/playthrough kontrola. Nepředstírat, že jediný proxy ukazatel zaručuje „zábavnost“.

### Automatizovaná příprava a validace

Dodej vývojový skript pro deterministické generování kandidátů se seedem a ověření existujících dat. Samotná hra katalog negeneruje při každém otevření; načte stabilní JSON/data modul.

Samotné náhodné přeházení barev není důkaz řešitelnosti. Ani běžné legální nalévání ze zcela roztříděného stavu nevytvoří obecně správné promíchané zadání: toto pravidlo nespojí různé barvy do jedné baňky. Použij solverem ověřené kandidáty nebo skutečnou reverzní konstrukci, u níž je každý krok prokazatelně inverzí platného dopředného kroku. Pouhé otočení libovolného seznamu tahů nestačí.

Každý přijatý kandidát musí mít dopředně ověřené řešení, zachovávat počty barev a obsahovat smysluplné promíchání. Omez čas a počet pokusů generátoru, aby nikdy nekonečně nehledal. Kandidáta bez ověřené cesty vyřaď. Zjevné duplikáty po permutaci barev a baněk nepoužívej jako nové levely. Dosažení limitu skriptu má skončit jasnou chybou nebo souhrnem, ne označením neověřených dat za úspěšná.

Solver může být BFS/DFS/A*/IDA* nebo jiná rozumná implementace. Důležitější než marketingový název algoritmu je korektnost, ukončování, oddělení od UI a replay certifikátu. Heuristiky nesmějí vyřadit legální vítězné cesty bez důvodu. Při kanonizaci symetrických stavů zachovej správné mapování indexů navrácených tahů.

### Hvězdy

`parMoves` odpovídá délce ověřené rozumně krátké cesty. Není to tvrzení o matematickém optimu. V UI označ jako „Cíl pro 3 hvězdy“, ne „nejlepší možné řešení“.

- 3 hvězdy: úspěšné dokončení s `moves <= parMoves`.
- 2 hvězdy: dokončení s `moves <= ceil(parMoves * 1.35)`.
- 1 hvězda: jakékoli ostatní úspěšné dokončení.

Počet tahů po undo klesá podle historie. Nápověda nezhoršuje hodnocení a nestojí měnu. Nejlepší hvězdy a nejmenší počet tahů ukládat nezávisle a nikdy nezhoršit pozdějším hraním. Ve verzi bez soutěžního žebříčku není potřeba anti-cheat.

## 8. Ověřené minimální příklady pro engine

Následující stavy jsou malé testovací příklady, nikoli celý katalog ani odpovídající náročnost pozdějších levelů. Pole jsou vždy odspodu nahoru; indexy začínají nulou.

### Classic, 2 barvy

```json
{
  "mode": "classic",
  "bottles": [["A", "A", "B", "B"], ["B", "B", "A", "A"], [], []],
  "solution": [[0, 2], [1, 0], [1, 2]],
  "parMoves": 3
}
```

Po třech tazích zůstává v baňce 0 čtyřikrát A a v baňce 2 čtyřikrát B.

### Classic, 4 barvy

```json
{
  "mode": "classic",
  "bottles": [
    ["A", "A", "B", "B"],
    ["B", "B", "C", "C"],
    ["C", "C", "D", "D"],
    ["D", "D", "A", "A"],
    [], []
  ],
  "solution": [[0, 4], [3, 0], [2, 3], [1, 2], [1, 4]],
  "parMoves": 5
}
```

### Sběr, cílová barva T

```json
{
  "mode": "collector",
  "bottles": [
    ["A", "A", "T", "T"],
    ["B", "B", "A", "A"],
    ["C", "C", "B", "B"],
    ["T", "T", "C", "C"],
    ["T", "T", "T", "T"],
    [], []
  ],
  "collector": {"color": "T", "capacity": 8, "units": 0},
  "solution": [[0, "collector"], [1, 0], [2, 1], [3, 2], [3, "collector"], [4, "collector"]],
  "parMoves": 6
}
```

Po šesti tazích je sběrná baňka plná T, tři běžné baňky obsahují A/B/C po čtyřech jednotkách a ostatní jsou prázdné. UI může tyto příklady využít pro korektní předpřipravenou animaci.

## 9. UI, vizuál a odezva

Převezmi design z `design/design.html`; screenshot reklamy určuje inspiraci, nikoli výsledný skin. HTML rozlož na skutečné komponenty. Nevkládat HTML export jako iframe, nepoužívat screenshot herního boardu a nevyměnit vizuální identitu za generické tlačítkové UI.

Obrazovky: domov/pokračování, level selector, Classic, Sběr, kontextový tutorial, výhra, patová situace a nastavení. Všechny produkční ovládací prvky musejí fungovat. Přepínač náhledových stavů z designového prototypu není součást produkční navigace.

Hlavní mobilní obrazovky: 375 × 667, 390 × 844, 360 × 800 CSS px. Ověřit i 320 px šířku, 768 × 1024 a 1440 × 900. Na běžných mobilních rozměrech se board a akční lišta mají vejít bez scrollování při výchozí velikosti textu. Na velmi malé výšce a při zvětšení textu upřednostnit čitelný vertikální scroll před malými zásahovými plochami. Nikdy horizontální přetékání. Počítat s browser chrome a safe areas, nespoléhat jen na desktopový 100vh.

Dotykové cíle alespoň 48 × 48 CSS px. Nezáviset na hoveru nebo drag-and-drop. Hra musí jít ovládat nativně sémantickými tlačítky, klávesnicí a screen readerem; zvolené lahve mají viditelný focus/selected state. Dialogy spravují focus a lze je ovládat bez myši. Textové popisky nesmějí prozradit skryté informace, ale zde žádné skryté vrstvy nejsou.

V mobilním Sběru je sběrná baňka kompaktně nad boardem; na desktopu může být vysoká vlevo. Běžné baňky nesmějí přijít o dotykovou plochu jen kvůli věrnému napodobení širokého reklamního layoutu.

Kapaliny vykreslovat přes SVG/CSS clipping, s jednoznačným poměrem výšek jednotek. Souvislé vrstvy lze vizuálně sloučit, ale musí být čitelný jejich objem. Při použití SVG definic dávej jedinečná ID pro masky/gradienty. Skleněná dekorace nesmí blokovat pointer events.

Po dokončení levelu spustit jednorázovou oslavu konfetami až po skončení posledního přelití. Konfety neblokují ovládání, automaticky zmizí a při systémovém nebo uživatelském omezení pohybu se nezobrazují.

Systémové omezení animací respektovat; uživatelské nastavení může dále animace omezit. Žádné blikání a stroboskopické efekty. Základní zvuky výběru, přelití a výhry mohou být jemně syntetizované. Audio inicializovat po uživatelské interakci, s mute a bezpečným pokračováním hry, když přehrávání není dostupné. Haptika není pro první verzi potřeba.

## 10. Ukládání

Použij namespacovaný, verzovaný localStorage záznam. Ukládej nastavení, dosažené levely, nejlepší výsledky a rozpracovaný level včetně historie potřebné k undo. Ukládej po atomické změně herního stavu a nastavení; nepoužívat interval na každý animační frame.

Při čtení zkontroluj JSON, strukturu, známé barvy, délky polí, počty jednotek, katalogovou verzi a vazbu na existující level. Historii přehraj nebo jinak rigorózně ověř, aby nešlo obnovit záporné tahy či board neslučitelný s historií. Nastav přiměřené velikostní limity, aby poškozená data nespustila nekonečné zpracování.

Neplatné rozehrání zahodit s vysvětlením, nikoli shodit celou aplikaci. Když to jde, zachovat odděleně platný postup a nastavení. Při zákazu storage, překročení kvóty nebo jiném selhání pokračovat v paměti a jednou nenápadně upozornit, že postup nebude uložen. Nevymýšlet cloudovou synchronizaci ani záruku uchování při vymazání dat prohlížeče.

## 11. Architektura a dodání

Pro nový projekt doporučený základ: React, TypeScript strict, Vite, CSS/SVG. Použij existující package manager; pro prázdný projekt pnpm. Stav lze obsloužit reducerem/contextem. Není požadavek na Redux, Zustand, Next.js, canvas, Three.js ani externí game engine.

Příklad členění, které lze upravit podle existujícího repozitáře:

```text
src/
  game/       # model, pravidla, historie, hash, validace, solver bez DOM
  workers/    # bounded hint worker
  levels/     # stabilní katalog a řešení
  components/ # vizuální komponenty
  screens/    # hlavní obrazovky
  storage/    # verze, validace, fallback
  audio/      # oddělené od enginu
scripts/      # deterministický generátor + validátor
tests/        # engine + browser testy; umístění podle konvencí projektu
```

Vytvoř srozumitelné skripty pro `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`, `levels:generate` a `levels:validate`. Generátor a solver mohou sdílet engine; validace nesmí být pouze porovnání předem uloženého příznaku `solvable: true`.

Produkční build musí fungovat jako statická aplikace na běžném statickém hostingu. Nevyžaduj serverové routy pro přepínání interních obrazovek, nebo zdokumentuj potřebný fallback. Nenastavuj automatický veřejný deploy, placené služby ani telemetrii. Zachovej reference a dokumentaci jako zdroj projektu; rozvojový postup zapisuj do `docs/PROGRESS.md`.

Podmínky dokončení jsou v `docs/ACCEPTANCE.md`. Závěrečný report nesmí zaměnit navržený test za skutečně provedený test a nesmí deklarovat zaručenou chytlavost bez hráčského ověření.
