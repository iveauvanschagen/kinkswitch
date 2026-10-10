# KINK Switch

Schakel in de auto met grote knoppen tussen KINK live en je eigen Spotify-playlist.

## Online zetten met GitHub Pages

1. Maak op github.com een nieuwe publieke repository, bijvoorbeeld `kinkswitch`.
2. Kies "uploading an existing file" en sleep alle bestanden uit deze map erin. Klik op Commit changes.
3. Ga naar Settings > Pages. Kies bij Source "Deploy from a branch", branch `main`, map `/ (root)`. Opslaan.
4. Na een minuut staat de app op `https://iveauvanschagen.github.io/kinkswitch/`.

## Spotify koppelen

1. Open https://developer.spotify.com/dashboard en open je app (of maak er een).
2. Zet bij Redirect URIs exact: `https://iveauvanschagen.github.io/kinkswitch/` (met de slash aan het eind).
3. Vink bij "Which API/SDKs are you planning to use" Web API aan.
4. Ga naar User Management en voeg het e-mailadres van je eigen Spotify-account toe.
5. Open de app op je telefoon, tik Instellingen, vul Client ID en playlistlink in en tik Koppel Spotify.

Spotify Premium is vereist. Open de Spotify-app op je telefoon één keer voordat je in KINK Switch op Spotify drukt.

## Op je startscherm

Open de app in Chrome op Android, tik op het menu met de drie puntjes en kies "Toevoegen aan startscherm" of "App installeren".

## Automatisch wisselen

De app leest elke 15 seconden de now playing-gegevens van KINK. Meldt KINK reclame, of draait er een item zonder titel van 45 seconden of langer (nieuws, reclame), dan schakelt de app naar Spotify. Zodra KINK weer een nummer met titel draait, gaat hij terug. Korte jingles en de presentator tellen niet mee. Een vangnet zorgt dat hij na 10 minuten altijd teruggaat. De vertraging van de stream (standaard 8 seconden) stel je in onder "Spotify koppelen".

## Don't be silly

De knop bovenin speelt Wodan Boys - Don't be Silly af op Spotify.

## Playlist kiezen

Tik op Playlist en kies er een uit je eigen lijst. Een andere playlist kan ook: kopieer de link in de Spotify-app via Delen en tik op "Plak gekopieerde Spotify-link". Staat de app op je startscherm, dan kun je in Spotify ook op Delen tikken en KINK Switch kiezen.

## Iemand anders laten meedoen

Voeg diegene toe onder User Management in het Spotify-dashboard (maximaal vijf personen, Premium vereist). Kopieer daarna bij het tandwiel, onder "Spotify koppelen", de koppellink en stuur die door. Openen en op Koppel Spotify tikken is genoeg.

## Jouw artiesten

Bij het tandwiel staan Ivo's suggesties als knoppen die je aan of uit tikt, plus je eigen lijst. Draait KINK een van die artiesten, dan licht de KINK-tegel rood op en gaat de app (als je dat aanzet) terug naar KINK. Zoeken op genre kan ook, maar staat standaard uit.

## Wachtrij

Op de Spotify-tegel staan de volgende twee nummers (Hierna en Daarna). De wachtrij wordt alleen opgehaald als er een nieuw nummer begint, zodat het weinig data kost.
