# Implementační milníky

Postupuj v pořadí. Mezivýsledky nemají znamenat zastavení práce a čekání na potvrzení. Výjimkou je skutečný blokující problém, například chybějící designový vstup. Nejdříve zkontroluj existující repozitář; nic důležitého nepřepisuj naslepo.

## M1 — funkční vertikální průřez

Přečti specifikaci a prohlédni design. Založ aplikaci pouze v prázdném projektu; jinak využij vhodnou existující strukturu. Implementuj čistý engine pro Classic i Sběr, historii, invarianty a unit testy. Použij malé příklady ze specifikace. Zprovozni minimálně pět ověřených levelů, dotykové ovládání, výhru a restart. Vytvoř společný replay validátor a základ solveru/generátoru.

Brána: skutečně lze dokončit Classic i Sběr; žádné mockované vítězství; testy základních pravidel procházejí. Engine nečeká na animation timeouty.

## M2 — vizuální převod a ovládání

Převeď design do komponent a dopracuj všechny nutné stavy. Implementuj správnou animaci přelití, ochranu před dvojitým inputem, reakci na zrušení, responsive board a dostupné controls. Tutorial používá skutečné tahy, nikoli jen další slide. Přidej zvuk, mute, omezené animace a barevné symboly/vzory.

Brána: pět levelů má reálný herní průchod ve vizuálu návrhu; malé i velké boardy zachovávají ovladatelnost; snímky hlavních obrazovek odpovídají návrhu.

## M3 — obsah, postup a nápověda

Vytvoř celý katalog 30 levelů, deterministickou přípravu a replay validaci. Dolaď stupňování obtížnosti. Implementuj bounded hint worker, localStorage s validací, obnovu historie, odemykání, hvězdy a poslední level kampaně. Dokonči level selector a návraty mezi obrazovkami.

Brána: všech 30 řešení se úspěšně přehraje, nápověda reaguje na aktuální stav, refresh nic nepoškozuje a lze projít celou kampaň bez zásahu do kódu.

## M4 — integrační a vizuální QA

Projeď celý acceptance checklist. Spusť produkční build a browser E2E, oprav console errors a asset issues. Porovnej hlavní stavy na mobilech a desktopu s design.html. Zkontroluj race conditions, ukládání, hraniční hodnoty skóre a náročné layouty. Udělej skutečný playthrough podle checklistu.

Brána: ulož screenshoty a QA report, popiš spuštění, provedené testy a případné skutečné mezery. Neskonči u obecného „vše hotovo“ bez důkazů a reálných příkazů.

## Nyní neimplementovat

Denní výzvu, nekonečný generovaný režim, PWA/service worker, cloud save, účty, skiny s obchodem, měnu, reklamy, analytics, multiplayer, žebříčky, překážky či další typy lahví. Mohou následovat až po ověření zábavnosti a stability stávajícího rozsahu.

## M5 — dokončené lahve, oslava a rozšíření kampaně

Přidat špunty a zlaté označení plných jednobarevných lahví při zachování legálních tahů a undo. Přidat krátkou oslavu konfetami respektující reduced motion. Rozšířit katalog na 50 levelů dvěma obtížnějšími kapitolami, přitom zachovat původních 30 levelů i verzovaný save. Ověřit všechna řešení, deterministické generování, celou kampaň přes UI, kompatibilitu starého finále a mobilní vizuál.

## M6 — levely 51–100 s měřitelně rostoucí obtížností

Přidat pět kapitol, přesně 50 nových unikátních zadání a reprodukovatelné kombinované hodnocení. Původních 50 záznamů a save/catalog v1 zachovat. Pro každý nový level ověřit řešení i tříprůchodový profil, striktně rostoucí skóre a neklesající délku nejkratší nalezené cesty. Dokončit UI deseti kapitol, přechod L50 → L51, finále L100, plnou browser kampaň, vizuální QA a závěrečný review.
