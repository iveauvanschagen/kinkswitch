# KINK Switch

Schakel in de auto met grote knoppen tussen KINK live en je eigen Spotify-playlist.

## Online zetten met GitHub Pages

1. Maak op github.com een nieuwe publieke repository, bijvoorbeeld `kink-switch`.
2. Kies "uploading an existing file" en sleep alle bestanden uit deze map erin. Klik op Commit changes.
3. Ga naar Settings > Pages. Kies bij Source "Deploy from a branch", branch `main`, map `/ (root)`. Opslaan.
4. Na een minuut staat de app op `https://<jouw-gebruikersnaam>.github.io/kink-switch/`.

## Spotify koppelen

1. Open https://developer.spotify.com/dashboard en open je app (of maak er een).
2. Zet bij Redirect URIs exact: `https://<jouw-gebruikersnaam>.github.io/kink-switch/` (met de slash aan het eind).
3. Vink bij "Which API/SDKs are you planning to use" Web API aan.
4. Ga naar User Management en voeg het e-mailadres van je eigen Spotify-account toe.
5. Open de app op je telefoon, tik Instellingen, vul Client ID en playlistlink in en tik Koppel Spotify.

Spotify Premium is vereist. Open de Spotify-app op je telefoon één keer voordat je in KINK Switch op Spotify drukt.

## Op je startscherm

Open de app in Chrome op Android, tik op het menu met de drie puntjes en kies "Toevoegen aan startscherm" of "App installeren".
