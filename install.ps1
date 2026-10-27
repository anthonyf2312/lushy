# Installs the Lushy theme into Spicetify and applies it to the Spotify desktop app.
# Run it through "Install Lushy theme.cmd". Pass -Restore to put Spotify back to normal.
param([switch]$Restore)

$ErrorActionPreference = "Stop"

function Find-Spicetify {
  $command = Get-Command spicetify -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $installed = Join-Path $env:LOCALAPPDATA "spicetify\spicetify.exe"
  if (Test-Path $installed) { return $installed }
  return $null
}

$spicetify = Find-Spicetify

if ($Restore) {
  if (-not $spicetify) { Write-Host "Spicetify isn't installed, so Spotify is already normal."; exit 0 }
  & $spicetify restore
  exit $LASTEXITCODE
}

if (-not $spicetify) {
  Write-Host "Spicetify isn't installed yet. It's the tool that lets Spotify load themes."
  $answer = Read-Host "Install it now with Spicetify's official installer? (Y/N)"
  if ($answer -notmatch "^[Yy]") { Write-Host "Nothing was changed."; exit 1 }
  Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/spicetify/cli/main/install.ps1" | Invoke-Expression
  $spicetify = Find-Spicetify
  if (-not $spicetify) { throw "Spicetify didn't install. Try again, or install it from https://spicetify.app" }
}

# Spicetify keeps themes beside its config file, in a "Themes" folder.
$configFile = (& $spicetify -c | Select-Object -Last 1).Trim()
$themeDir = Join-Path (Split-Path $configFile) "Themes\Lushy"
New-Item -ItemType Directory -Force $themeDir | Out-Null
Copy-Item (Join-Path $PSScriptRoot "Lushy\*") $themeDir -Recurse -Force
Write-Host "Copied the theme to $themeDir"

# Lushy Lyrics, the extension that makes Spicy Lyrics' full screen Lushy's, goes in the "Extensions"
# folder beside it.
$extensionDir = Join-Path (Split-Path $configFile) "Extensions"
New-Item -ItemType Directory -Force $extensionDir | Out-Null
Copy-Item (Join-Path $PSScriptRoot "Extensions\lushy-lyrics.js") $extensionDir -Force
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
