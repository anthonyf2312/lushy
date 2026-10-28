<h1 align="center">Lushy for Spotify</h1>

<p align="center">
  A Liquid Glass theme for <a href="https://spicetify.app">Spicetify</a>. The artwork you're on fills
  the background, behind frosted-glass panels in the colours of the song that's playing.
</p>

<p align="center">
  <img alt="Tested on Spotify 1.3.7.2752" src="https://img.shields.io/badge/tested%20on%20Spotify-1.3.7.2752-1ed760?logo=spotify&logoColor=white">
  <img alt="Tested on Spicetify 2.46.4" src="https://img.shields.io/badge/tested%20on%20Spicetify-2.46.4-e8615a">
  <img alt="Windows" src="https://img.shields.io/badge/platform-Windows-0078d4">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/github/license/anthonyf2312/lushy"></a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#preview">Preview</a> ·
  <a href="#how-to-install">How to install</a> ·
  <a href="#updating">Updating</a> ·
  <a href="#how-to-remove">How to remove</a> ·
  <a href="#troubleshooting">Troubleshooting</a>
</p>

![Lushy on an album page: the cover large at the top and blurred across the background](docs/screenshots/album.webp)

## Features

- **Liquid Glass.** The sidebar and player bar are frosted glass, with the open album's, playlist's
  or artist's artwork blurred behind everything.
- **Colours from the cover.** Every colour comes from the playing song's cover and fades into the
  next song's. Choose a bright or a dark background.
- **Cinematic full screen.** Click the cover art in the player bar. With
  [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) installed, its word-by-word lyrics sit
  beside the Canvas; without it, Lushy's own full screen opens in the same style.
- **Still Spotify.** Playlists, radio, lyrics, the queue and Connect all work as normal.

## Preview

| An artist: the photo fades into the page as you scroll | Full screen: click the cover art in the player bar |
| --- | --- |
| ![An artist page in Lushy](docs/screenshots/artist.webp) | ![Lushy's full screen](docs/screenshots/fullscreen.webp) |

## Requirements

- Windows.
- The Spotify app from [spotify.com](https://www.spotify.com/download/windows/), not the Microsoft
  Store one.
- [Spicetify](https://spicetify.app). If you don't have it, the installer offers to install it.
- Optional: [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics), for lyrics in full screen.

Tested on Spotify 1.3.7.2752 with Spicetify 2.46.4.

## How to install

### One command (recommended)

Open **PowerShell** (search for it in the Start menu), paste this and press Enter:

```powershell
iwr -useb https://raw.githubusercontent.com/anthonyf2312/lushy/main/install.ps1 | iex
```

If you don't have Spicetify, it offers to install it. Say yes. Spicetify then asks whether you want
its Marketplace too: say yes if you'd like lyrics in full screen. Spotify restarts with the theme.

### From the Spicetify Marketplace

If you already have the [Marketplace](https://github.com/spicetify/marketplace/wiki/Installation):
open it (the cart button at the top of Spotify), go to **Themes**, find **Lushy**, click
**Install**, then **Reload now**. Installed this way, Lushy keeps itself up to date.

The Marketplace only applies themes while Spicetify's theme is set to `marketplace`, which it usually
is. If it says otherwise, run `spicetify config current_theme marketplace`, then `spicetify apply`.

### Download

1. Download this repository as a ZIP: the green **Code** button, then **Download ZIP**. Unzip it.
2. Double-click **Install Lushy theme.cmd**.

### Manual (if you already use Spicetify)

1. Run `spicetify path userdata` to find Spicetify's folder.
2. Copy the `Lushy` folder into its `Themes` folder, and `Extensions/lushy-lyrics.js` into its
   `Extensions` folder.
3. Run:

```powershell
spicetify config current_theme Lushy color_scheme Lushy inject_css 1 replace_colors 1 overwrite_assets 1 inject_theme_js 1
spicetify config extensions lushy-lyrics.js
spicetify apply
```

## Lyrics in full screen

Install **Spicy Lyrics** from the Spicetify Marketplace (the cart button at the top of Spotify). If
the button isn't there, [install the Marketplace](https://github.com/spicetify/marketplace/wiki/Installation)
first. Full screen then shows Spicy Lyrics' word-by-word lyrics beside the Canvas or artwork, and
its close button or Esc brings you back.

## Customise

For a darker background, click your profile picture (top right), then **Lushy background** →
**Dark**. **Bright** puts it back.

## Updating

When Spotify updates itself, the theme goes away. Run the install again to bring it back: the
[one command](#one-command-recommended) also gets the latest Lushy, and **Install Lushy theme.cmd**
reapplies the copy you downloaded.

Installed from the Marketplace, Lushy updates by itself.

## How to remove

**Installed from the Marketplace:** click **Remove** on Lushy's card in the Marketplace.

**Remove Lushy and keep Spicetify** and your other extensions. In PowerShell:

```powershell
iex "& { $(iwr -useb https://raw.githubusercontent.com/anthonyf2312/lushy/main/install.ps1) } -Uninstall"
```

**Put Spotify completely back to normal**, removing all of Spicetify's changes, including the
Marketplace: double-click **Restore normal Spotify.cmd**, or run `spicetify restore`.

## Troubleshooting

- **The theme disappeared.** Spotify updated itself. Run the install again.
- **Spicetify says this Spotify version isn't supported.** Spotify updated past what your Spicetify
  knows. Run `spicetify upgrade`, then the install again.
- **Something looks wrong.** [Open an issue](https://github.com/anthonyf2312/lushy/issues/new/choose)
  with a screenshot, and your Spotify and Spicetify versions.

Spotify doesn't support Spicetify, and its terms don't allow modifying the app. Lots of people use
Spicetify, but use it knowing that.

## Working on Lushy

How it works, what it changes and the tools for working on it: [docs/DEVELOPING.md](docs/DEVELOPING.md).

## Credits

- [Spicetify](https://spicetify.app), which lets Spotify load themes.
- [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) by Spikerko, whose full screen Lushy opens
  when it's installed. Lushy Lyrics only opens it, and includes none of its code.
- The [Outfit](https://github.com/Outfitio/Outfit-Fonts) typeface by the Outfit Project Authors, under
  the SIL Open Font License 1.1 (`Lushy/OFL-Outfit.txt`).

## Licence

MIT (see [LICENSE](LICENSE)). Lushy isn't affiliated with Spotify or Spicetify.
