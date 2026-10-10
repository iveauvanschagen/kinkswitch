# KINK Switch

**Never sit through another ad break again.**

You love KINK. The DJs, the deep cuts, that one song you forgot you needed. What you don't love: the commercials, the news on the hour and the occasional band that makes you reach for the dial.

KINK Switch fixes that. It listens to KINK for you, jumps to your own Spotify playlist the second the ads kick in and brings you straight back when the music returns. Big buttons, zero fiddling, built for the car.

Open it: **https://iveauvanschagen.github.io/kinkswitch/**

## Why you want this

- **No more ads or news.** The app hears the break coming and switches for you.
- **Never miss your bands.** When KINK plays one of your favourites, the app pulls you back, even if you were on Spotify.
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
4. **Connect.** Open the app, tap the gear, open "Spotify koppelen", paste your Client ID and tap Koppel Spotify.
5. **Pick a playlist.** Tap Playlist and choose one, paste a Spotify link or share a playlist to KINK Switch straight from the Spotify app.
6. **Install it.** In Chrome on Android, open the menu and choose "Add to Home screen" or "Install app".

Tip: open the Spotify app once before your first switch. The app can only control a Spotify player that is running.

## Features

- **Auto switch.** Ads or news on KINK? Spotify. Music back? KINK. Hands free.
- **Live now playing.** Artist big, song title below, on both tiles. Also shown in the page title and the Android media notification.
- **Favourites.** Tap "+ Favoriet" on any tile to save the artist playing right now. When KINK plays them, the tile lights up and the app takes you back.
- **Skip list.** Bands you'd rather not hear. KINK plays one, you're on Spotify instantly and back for the next song.
- **Don't be silly.** The panic button. One tap and Wodan Boys - Don't be Silly blasts through Spotify.
- **Playlist picker.** Your own playlists with covers, a paste button for any link or share directly from Spotify.
- **Smart Spotify resume.** Switching back to Spotify continues your playlist where you left it.
- **Steering wheel ready.** The "next" button on your wheel jumps from KINK to Spotify.
- **Screen stays on.** Optional, so the app keeps watching while it sits in the car holder.
- **Share with friends.** Copy a setup link from settings so a friend only has to tap Connect.
- **Genre matching (optional).** Look up each KINK artist's genre on Spotify and match it to yours. Off by default.

## Good to know

- **Keep it on screen.** In the background the browser slows the app down, so it can't keep an eye on KINK while Spotify plays. In the car holder with "Scherm aan houden" on, it works best.
- **Data use.** The app itself uses about 1 to 2 MB per hour. The KINK stream is roughly 86 MB per hour; Spotify depends on your quality setting.
- **Stream delay.** The app waits 8 seconds after a KINK marker so you don't lose the end of a song. You can tune this in settings.

## Credits

Logo and wordmark set in Archivo Black (SIL Open Font License), included as `archivo-black.woff2`. Not affiliated with KINK or Spotify.
