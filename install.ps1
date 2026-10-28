# Installs the Lushy theme into Spicetify and applies it to the Spotify desktop app. Run it through
# "Install Lushy theme.cmd", or straight from GitHub in PowerShell:
#   iwr -useb https://raw.githubusercontent.com/anthonyf2312/lushy/main/install.ps1 | iex
# -Uninstall removes Lushy and keeps Spicetify; -Restore puts Spotify back to normal.
param([switch]$Uninstall, [switch]$Restore)

$ErrorActionPreference = "Stop"

# Run from GitHub, this script runs inside the user's own PowerShell window, so it never calls exit
# (that would close the window): it returns when it's done and throws when something fails.

function Find-Spicetify {
  $command = Get-Command spicetify -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $installed = Join-Path $env:LOCALAPPDATA "spicetify\spicetify.exe"
  if (Test-Path $installed) { return $installed }
  return $null
}

$spicetify = Find-Spicetify

if ($Restore) {
  if (-not $spicetify) { Write-Host "Spicetify isn't installed, so Spotify is already normal."; return }
  & $spicetify restore
  if ($LASTEXITCODE -ne 0) { throw "Spicetify couldn't put Spotify back. Its message above says why." }
  return
}

if ($Uninstall) {
  if (-not $spicetify) { Write-Host "Spicetify isn't installed, so neither is Lushy."; return }
  $configFile = (& $spicetify -c | Select-Object -Last 1).Trim()
  $config = Get-Content $configFile
  if ($config -match "^\s*current_theme\s*=\s*Lushy\s*$") {
    & $spicetify config current_theme " " color_scheme " "
  }
  if ($config -match "^\s*extensions\s*=.*lushy-lyrics\.js") {
    & $spicetify config extensions lushy-lyrics.js-
  }
  $themeDir = Join-Path (Split-Path $configFile) "Themes\Lushy"
  $extension = Join-Path (Split-Path $configFile) "Extensions\lushy-lyrics.js"
  if (Test-Path $themeDir) { Remove-Item $themeDir -Recurse -Force }
  if (Test-Path $extension) { Remove-Item $extension -Force }
  & $spicetify apply
  if ($LASTEXITCODE -ne 0) { throw "Spicetify couldn't apply the change. Its message above says why." }
  Write-Host ""
  Write-Host "Done. Lushy is removed; Spicetify and your other extensions stay."
  return
}

if (-not $spicetify) {
  Write-Host "Spicetify isn't installed yet. It's the tool that lets Spotify load themes."
  $answer = Read-Host "Install it now with Spicetify's official installer? (Y/N)"
  if ($answer -notmatch "^[Yy]") { Write-Host "Nothing was changed."; return }
  Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/spicetify/cli/main/install.ps1" | Invoke-Expression
  $spicetify = Find-Spicetify
  if (-not $spicetify) { throw "Spicetify didn't install. Try again, or install it from https://spicetify.app" }
}

# A downloaded copy has the theme beside this script. Run from GitHub there's no copy, so it
# downloads the latest one first.
$source = $PSScriptRoot
if (-not $source -or -not (Test-Path (Join-Path $source "Lushy\user.css"))) {
  Write-Host "Downloading Lushy from GitHub..."
  $download = Join-Path ([IO.Path]::GetTempPath()) "lushy-install"
  if (Test-Path $download) { Remove-Item $download -Recurse -Force }
  New-Item -ItemType Directory $download | Out-Null
  $zip = Join-Path $download "lushy.zip"
  Invoke-WebRequest -UseBasicParsing "https://github.com/anthonyf2312/lushy/archive/refs/heads/main.zip" -OutFile $zip
  Expand-Archive $zip $download
  $source = Join-Path $download "lushy-main"
}

# Spicetify keeps themes beside its config file, in a "Themes" folder.
$configFile = (& $spicetify -c | Select-Object -Last 1).Trim()
$themeDir = Join-Path (Split-Path $configFile) "Themes\Lushy"
New-Item -ItemType Directory -Force $themeDir | Out-Null
Copy-Item (Join-Path $source "Lushy\*") $themeDir -Recurse -Force
Write-Host "Copied the theme to $themeDir"

# Lushy Lyrics, the extension that makes Spicy Lyrics' full screen Lushy's, goes in the "Extensions"
# folder beside it.
$extensionDir = Join-Path (Split-Path $configFile) "Extensions"
New-Item -ItemType Directory -Force $extensionDir | Out-Null
Copy-Item (Join-Path $source "Extensions\lushy-lyrics.js") $extensionDir -Force
Write-Host "Copied the Lushy Lyrics extension to $extensionDir"

& $spicetify config current_theme Lushy color_scheme Lushy inject_css 1 replace_colors 1 overwrite_assets 1 inject_theme_js 1
if ($LASTEXITCODE -ne 0) { throw "Spicetify couldn't save its settings." }

# Added once; Spicetify keeps its other extensions as they are.
$extensions = (Get-Content $configFile | Where-Object { $_ -match "^\s*extensions\s*=" }) -join ""
if ($extensions -notmatch "lushy-lyrics\.js") {
  & $spicetify config extensions lushy-lyrics.js
  if ($LASTEXITCODE -ne 0) { throw "Spicetify couldn't add the Lushy Lyrics extension." }
}

# The first run backs up Spotify's own files; later runs (and runs after a Spotify update) reapply.
$hasBackup = (Get-Content $configFile -Raw) -match "(?m)^[ \t]*version[ \t]*=[ \t]*\S"
if ($hasBackup) { & $spicetify apply } else { & $spicetify backup apply }
if ($LASTEXITCODE -ne 0) {
  Write-Host "Spotify changed since the last backup; making a fresh one."
  & $spicetify restore backup apply
  if ($LASTEXITCODE -ne 0) { throw "Spicetify couldn't apply the theme. Its message above says why." }
}

Write-Host ""
Write-Host "Done. Spotify restarts with the Lushy theme."
