# KINK Switch

**Never sit through another ad break again.**

You love KINK. The DJs, the deep cuts, that one song you forgot you needed. What you don't love: the commercials, the news on the hour and the occasional band that makes you reach for the dial.

KINK Switch fixes that. It listens to KINK for you, jumps to your own Spotify playlist the second the ads kick in and brings you straight back when the music returns. Big buttons, zero fiddling, built for the car.

Open it: **https://iveauvanschagen.github.io/kinkswitch/**

## Why you want this

- **No more ads or news.** The app hears the break coming and switches for you.
- **Never miss your bands.** When KINK plays one of your favourites, the app pulls you back, even if you were on Spotify.
- **Catch the gems.** Hear something brilliant on KINK? One tap saves it to your own KINK Catch playlist on Spotify.
- **Skip what you can't stand.** Put a band on your skip list and the app is gone before the chorus.
- **Safe in the car.** Huge tiles and buttons you can hit without looking twice. Everything fiddly lives in settings.
- **Free and private.** No accounts, no tracking, no backend. It runs in your browser and talks only to KINK and Spotify.

## How it works

1. **KINK tells us what's on.** KINK publishes live now playing data: artist, title, length and a marker when an ad break starts. The app reads it every 15 seconds, every 3 seconds near the end of a song and every 5 seconds during a break.
2. **Spotify does the playing.** Using the Spotify Web API, the app tells your Spotify app (phone or computer) what to play, pause or skip. Your music keeps playing in Spotify itself.
3. **The app decides when to switch.** An ad marker or a long item without a title (news, commercials) means a break: off to Spotify. A real song with a title means music is back: return to KINK. Short jingles and DJ talk are ignored.

## Get started

1. **Put it online.** Upload these files to a public GitHub repository and enable GitHub Pages (branch `main`, folder `/ (root)`).
2. **Create a Spotify app.** Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), create an app, tick Web API and add your exact Pages URL as Redirect URI, slash included: `https://iveauvanschagen.github.io/kinkswitch/`
3. **Add yourself.** Under User Management, add the email address of your Spotify account. Spotify Premium is required (up to five users in Development Mode).
4. **Connect.** Open the app, tap the gear, go to the Spotify tab, paste your Client ID under "Geavanceerd" and tap Koppel Spotify.
5. **Pick a playlist.** Tap Playlist and choose one, paste a Spotify link or share a playlist to KINK Switch straight from the Spotify app.
6. **Install it.** In Chrome on Android, open the menu and choose "Add to Home screen" or "Install app".

The first time you save a song to KINK Catch, the app asks Spotify once for permission to edit your playlists. Nothing to change in the dashboard.

Tip: open the Spotify app once before your first switch. The app can only control a Spotify player that is running.

## Features

- **Auto switch.** Ads or news on KINK? Spotify. Music back? KINK. Hands free.
- **Live now playing.** Artist big, song title below, on both tiles. Also shown in the page title and the Android media notification.
- **Must hear.** Tap the heart on any tile to save the artist playing right now. When KINK plays them, the tile lights up and the app takes you back.
- **KINK Catch.** Tap the add icon on the KINK tile and the song lands in your private KINK Catch playlist on Spotify (created for you the first time). Changed your mind? Undo right from the confirmation.
- **Missed on KINK.** Heard something great while driving? Open Playlist, switch to "Gemist op KINK" and add any of the last songs KINK played.
- **Must skip.** Bands you'd rather not hear. KINK plays one, you're on Spotify instantly and back for the next song.
- **Don't be silly.** The panic button. One tap and Wodan Boys - Don't be Silly blasts through Spotify.
- **Playlist picker.** KINK Catch pinned on top, then your own playlists with covers, a paste button for any link or share directly from Spotify.
- **Smart Spotify resume.** Switching back to Spotify continues your playlist where you left it.
- **Always shuffle.** Your playlist starts on shuffle at a random song, every time. Turn it off in settings if you like order.
- **Steering wheel ready.** The "next" button on your wheel jumps from KINK to Spotify.
- **Screen stays on.** Optional, so the app keeps watching while it sits in the car holder.
- **Background watching.** On your computer the app keeps switching even when it's a tab in the background. On by default on computers, off on phones.
- **Clean settings.** Three tabs (Algemeen, Artiesten, Spotify), switches instead of checkboxes and every change is saved instantly, with a confirmation.
- **Share with friends.** Copy a setup link from settings so a friend only has to tap Connect.

## Good to know

- **On your phone, keep it on screen.** Phones pause pages in the background, so in the car keep the app open in the holder with "Scherm aan houden" on.
- **On your computer, use Chrome.** With "Ook op de achtergrond meekijken" on, the app keeps working as a background tab. Add the site to "Always keep these sites active" under Settings, Performance, so Chrome never unloads it.
- **Data use.** The app itself uses about 1 to 2 MB per hour. The KINK stream is roughly 86 MB per hour; Spotify depends on your quality setting.
- **Stream delay.** The app waits 8 seconds after a KINK marker so you don't lose the end of a song. You can tune this in settings.

## Credits

Logo and wordmark set in Archivo Black (SIL Open Font License), included as `archivo-black.woff2`. Not affiliated with KINK or Spotify.
