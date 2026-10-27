# Lushy for Spotify

A theme for the Spotify desktop app, made with [Spicetify](https://spicetify.app). It gives Spotify
Lushy's look: Liquid Glass panels floating over the open album's, playlist's or artist's artwork
(blurred), colours taken from the playing song's cover, Lushy's Play and Shuffle pills, rounded song
rows on alternating glass, a one-row player bar, a cinematic full screen (Spicy Lyrics' own, when
it's installed), and the Outfit typeface.

Lushy started as a player of its own, built on Spotify's Web API. That API's limits got in the way, so
the design became this theme instead. Because it's Spotify itself underneath, everything Spotify does
works: every playlist's songs, radio, lyrics, the queue, Connect, downloads, and animated artwork
(Canvas).

## Install

1. Download this repository (**Code**, then **Download ZIP**) and unzip it, or clone it.
2. Double-click **Install Lushy theme.cmd**. It installs the theme and its Lushy Lyrics extension.
3. If Spicetify isn't installed, it offers to install it with Spicetify's official installer (that
   installer then asks whether you also want the Spicetify Marketplace; either answer is fine).
4. Spotify restarts in the Lushy theme.

Spotify updates itself every few weeks and that removes Spicetify's changes. Run
**Install Lushy theme.cmd** again afterwards; it notices the update and reapplies.

To go back to normal Spotify, double-click **Restore normal Spotify.cmd**.

Needs Windows and the regular Spotify desktop app from spotify.com (the one in `%APPDATA%\Spotify`),
version 1.2.14 or later. Spicetify 2.46.4 supports Spotify up to 1.3.7 on Windows.

Spotify doesn't support Spicetify, and its terms of use don't allow modifying the app. Spicetify is
widely used, but use it knowing that.

## What it changes

| Part | In Lushy |
| --- | --- |
| Sidebar | A Liquid Glass panel with a search box (it opens Spotify's search as you type; Ctrl+K and Ctrl+L focus it), Home, Browse, your library's Artists and Albums, Songs (your Liked Songs), and Spotify's library list styled like Lushy's. Collapsing Spotify's library narrows it to icons. |
| Top bar | Back, forward, the Marketplace button and your profile as round Liquid Glass buttons. While the sidebar is collapsed, Spotify's Home button and search box sit centred in the top bar in Liquid Glass too, and stay there in a narrow window (the search narrows) instead of moving beside the Marketplace button. |
| Background | The open album's, playlist's or artist's artwork, blurred. Other pages (Home, Search and so on) use the playing song's cover under a slowly drifting wash of its most vivid colours. Choose **Bright** (the default) or **Dark** under **Lushy background** in the profile menu (click your picture, top right). |
| Colours | Taken from the playing song's cover, fading from one song's to the next. |
| Albums, playlists, artists | Big artwork headers, Lushy's Play and Shuffle pills, and rounded song rows on alternating glass. The large photo at the top of an artist page (and of playlists like Discover Weekly) drifts up and dissolves into the backdrop as you scroll, instead of turning into a block of colour. |
| Home | Spotify's promoted "Listen Now" card at the top is hidden. Spicetify's **Home config** (in the profile menu while on Home) gets a **Reset** button beside its Up, Down, Lower and Stick buttons, which puts every section back where Spotify had it. Click it twice: the first click asks. |
| Player bar | One row: the artwork and title, then previous, play and next, then the progress bar running across to shuffle, repeat, the other buttons and volume. |
| Full screen | Click the cover art in the player bar (or Spotify's full-screen button). With [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) installed from the Spicetify Marketplace, full screen is Spicy Lyrics' cinematic full screen: its word-by-word lyrics beside the Canvas or artwork, made Lushy's by the Lushy Lyrics extension. Its close button or Esc goes back to the app. Without Spicy Lyrics, Lushy's own full screen opens in the same style: the Canvas as a stage the height of the screen fading into the drifting, blurred cover, or the cover art large, with the title, artist and a progress line beneath (click the line to move through the song). The player bar's Lyrics button puts Spotify's lyrics in the right half, with the cover, title and progress on the left. The player bar fades out with the cursor when the mouse rests; Esc goes straight back. |
| Now Playing panel | Switched off: it no longer opens on play (the setting "Show the now-playing panel on click of play" is turned off), the cover art opens full screen instead, and the tab at the window's right edge is gone. Queue, devices and friend activity still open on the right. |
| Lyrics, radio | Spicy Lyrics (from the Spicetify Marketplace) for word-by-word lyrics, its page and its full screen; otherwise Spotify's own lyrics button in the player bar. A song's or artist's **⋯** menu has song and artist radio. |
| Window buttons | Spotify draws its ⋯ menu and the minimise, maximise and close buttons itself, over the window's corners, so a theme can't restyle them. The sidebar keeps its top row clear for the ⋯, and when collapsed it narrows to 56px so it's centred under the ⋯. A dark tab in the top-right corner holds the notification, friends and profile buttons, and the window buttons' dark panel blends into it. |

## Files

- `Lushy/color.ini`: the starting colour scheme (Lushy's purple). `theme.js` retints it per cover.
- `Lushy/user.css`: the layout and styling. Spotify scrambles most class names and changes them with
  every version, so it targets ids, ARIA roles, Encore component ids, test ids (the desktop app keeps
  only some) and Spicetify's readable class names. The Outfit font is embedded at the top.
- `Lushy/theme.js`: cover colours, the blurred backdrop, the sidebar search and links, full screen
  (whose parts have no stable names, so it finds them by what they hold and tags them for
  `user.css`), and Home config's Reset.
- `Extensions/lushy-lyrics.js`: the Lushy Lyrics extension. With Spicy Lyrics installed, it sends
  the cover art and Spotify's full-screen button to Spicy Lyrics' full screen (its Cinema View, in the
  browser's full screen), and closes it again on Esc. It uses only what Spicy Lyrics shows on screen
  and its public `_spicy_lyrics.fullscreen` hooks, so it keeps working as Spicy Lyrics updates
  itself, as long as those stay.
- `install.ps1`: what the two `.cmd` files run.
- `dev/`: tools for working on the theme inside the real app. They need Node.js 22 or later and
  nothing else.
  - **Open Spotify for theme debugging.cmd** restarts Spotify with a debugging port that only this PC
    can reach (127.0.0.1:9222). Restart Spotify normally when done; the port closes with it.
  - `node serve-dev.cjs` (left running) makes each page load use the working copies in `Lushy/`
    and `Extensions/` instead of the installed ones, re-sends `user.css` whenever it's saved, and
    runs the extension again whenever it's saved.
  - `node cdp.cjs` runs a script in Spotify's page (`eval`), takes a screenshot (`shot`), or reloads.

After editing the theme or the extension, run **Install Lushy theme.cmd** again to copy and apply them.
That also restarts Spotify normally.

## Licence

The theme is MIT licensed (see `LICENSE`). The Outfit typeface embedded in `user.css` is by the Outfit
Project Authors, under the SIL Open Font License 1.1 (`Lushy/OFL-Outfit.txt`).
