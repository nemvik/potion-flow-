# Prompt pro Claude Design

Přilož soubor `reference/game-reference.jpeg` a vlož následující zadání:

---

Navrhni vizuálně propracovanou, mobile-first webovou logickou hru s pracovním názvem POTION FLOW. Referenční obrázek ukazuje princip přelévání barevných vrstev mezi lahvičkami. Nekopíruj jeho značku, logo ani grafiku. Vytvoř vlastní vizuální identitu. Nechci landing page ani dashboard, ale obrazovky skutečné hry a klikací HTML prototyp pro následnou implementaci v Reactu.

VIZUÁLNÍ SMĚR
Prémiová, hravá alchymistická dílna: tmavý petrolejový podklad, výrazné a dobře odlišitelné tekutiny, jemně prostorové skleněné baňky, světelné odlesky a decentní částice. Výsledek má vypadat jako hotová mobilní puzzle hra, ne jako formulář s barevnými obdélníky. Žádné generické SaaS karty, obří nadpisy ani přeplácané dekorace. Herní plocha je hlavní obsah. Prostorovost vytvoř pomocí SVG/CSS, nikoli 3D enginu.

PRAVIDLA, KTERÁ MUSÍ DESIGN RESPEKTOVAT
- Běžná baňka má kapacitu čtyř diskrétních jednotek. Jedna barva může tvořit více sousedních jednotek.
- Klepnutí vybere zdroj, další klepnutí cíl. Přelévá se celý vrchní souvislý blok jedné barvy, maximálně do volné kapacity cíle. Cíl musí být prázdný nebo mít nahoře stejnou barvu.
- Classic: vyhrávám, když je každá baňka prázdná nebo plná a jednobarevná.
- Každý pátý level je Sběr: přibude samostatná sběrná baňka na osm jednotek jedné označené barvy. Přijímá jen tuto barvu z vršku zdrojové baňky. Nelze z ní přelévat zpět. Ostatní barvy se třídí běžně. Vyhrávám po naplnění sběrné baňky a dokončení ostatních barev.
- Na ploše je nejvýše deset běžných baněk, ne třicet jako na referenci. Na začátku jsou dvě prázdné. Dokončenou běžnou baňku během rozehraného levelu nezamykej.
- Celkem 30 levelů, tři kapitoly po deseti. Žádný časový limit, životy, reklamy, obchod ani platební prvky.

NAVRHNI TYTO OBRAZOVKY A STAVY
1. Úvod s hlavním tlačítkem Hrát/Pokračovat a krátkou cestou k rozehrané hře.
2. Výběr 30 levelů ve třech kapitolách: odemčené, dokončené, zamčené, hvězdy a odlišení sběrných levelů.
3. Classic: hlavní herní obrazovka, číslo levelu, počet tahů, malé nastavení a spodní ovládání Zpět / Nápověda / Znovu.
4. Sběr: cílová barva a skutečný objem například 4/8. Na mobilu kompaktní nádrž nad plochou; na široké obrazovce může být velká vysoká baňka vlevo.
5. První tutorial přímo na herní ploše: „Vyber baňku“ a „Přelij stejnou barvu na stejnou“.
6. Výběr zdroje, vhodný cíl, nepovolený tah, přelévání, nápověda a situace bez legálních tahů s nabídkou Zpět/Znovu.
7. Výhra s 1–3 hvězdami, počtem tahů a výrazným Další level. U levelu 30 nabídni dokončení kampaně a návrat k levelům.
8. Nastavení: zvuk, omezené animace, symboly/vzory pro odlišení barev.

OVLÁDÁNÍ A ROZMĚRY
Prioritně 390 × 844 a 375 × 667; potom 360 × 800, tablet a desktop. Hlavní plochu na běžném mobilu navrhni bez scrollování, ale nezmenšuj ovládání pod dotykově použitelnou velikost. Dotykové cíle alespoň 48 × 48 CSS px. Na malých výškách či při zvětšení textu dovol svislý scroll. Žádné horizontální přetékání. Respektuj safe areas. Nic důležitého nesmí záviset na hoveru ani drag-and-drop. Desktop musí mít rozumně širokou centrovanou hru, ne roztažené lahve přes celý monitor.

ANIMACE
Ukaž krátké nadzvednutí vybrané baňky, naklonění, barevný proud a změnu hladin. Nalití přibližně 250–400 ms. Při omezených animacích zachovej jasnou změnu stavu bez letu a částic. Uzavření baněk a výraznější oslavu používej až při výhře. Nepřekrývej herní tekutiny efekty, které zkreslují barvu.

VÝSTUP
Dodej jedno samostatné `design.html` s vloženým CSS, inline SVG a malým JavaScriptem pro přepínání obrazovek a ukázku interakcí. Musí se otevřít bez buildu a bez CDN. Neimplementuj solver ani kompletní level engine; předpřipravené demonstrace jsou dostačující. Mockup musí zachovávat jednotky kapaliny a ukazovat legální nalití, ne vymyšlený stav.

Přidej jasné CSS tokeny pro barvy, typografii, spacing, poloměry a pohyb. Identifikuj komponenty Bottle, LiquidLayer, Collector, GameHUD, ActionBar, LevelTile a WinDialog. Pro testování zpřístupni všechny obrazovky přepínačem „Náhled“, vizuálně odděleným od skutečné hry. Zobraz i přeplněný nejvyšší rozsah deseti běžných baněk. UI česky. Žádné vzdálené obrázky, fonty ani nedodané assety. Nepřidávej další herní mechaniky.

Priorita: krásná a přehledná hratelná plocha, výborné ovládání palcem a jasná předloha pro implementaci.
