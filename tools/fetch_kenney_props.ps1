# Fetch selected Kenney Car Kit + Graveyard Kit GLBs into nexus/vendor/kenney/
# Kenney download-link needs a browser-like Referer (403 without it).
param(
  [string]$OutRoot = (Join-Path $PSScriptRoot "..\nexus\vendor\kenney")
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Get-HexId([string]$path) {
  -join ([Text.Encoding]::ASCII.GetBytes($path) | ForEach-Object { "{0:x2}" -f $_ })
}

function Get-KenneyZip([string]$slug, [string]$outZip) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $headers = @{
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    "Accept" = "application/json, text/plain, */*"
    "Referer" = "https://kenney.nl/assets/$slug"
    "Origin" = "https://kenney.nl"
  }
  $null = Invoke-WebRequest -Uri "https://kenney.nl/assets/$slug" -WebSession $session -Headers $headers -UseBasicParsing -TimeoutSec 60
  $id = Get-HexId "assets/$slug"
  $json = Invoke-RestMethod -Uri "https://kenney.nl/download-link/$id" -WebSession $session -Headers $headers -TimeoutSec 60
  if (-not $json.url) {
    throw "No download url for $slug"
  }
  Write-Host "Downloading $slug ..."
  Invoke-WebRequest -Uri $json.url -WebSession $session -Headers $headers -OutFile $outZip -UseBasicParsing -TimeoutSec 180
  Write-Host "Saved $outZip ($((Get-Item $outZip).Length) bytes)"
}

$tmp = Join-Path $env:TEMP ("nexus-kenney-" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
try {
  $carZip = Join-Path $tmp "car-kit.zip"
  $graveZip = Join-Path $tmp "graveyard-kit.zip"
  Get-KenneyZip "car-kit" $carZip
  Get-KenneyZip "graveyard-kit" $graveZip
  $indZip = Join-Path $tmp "industrial.zip"
  Get-KenneyZip "city-kit-industrial" $indZip

  $carDir = Join-Path $tmp "car"
  $graveDir = Join-Path $tmp "grave"
  $indDir = Join-Path $tmp "ind"
  Expand-Archive -Path $carZip -DestinationPath $carDir -Force
  Expand-Archive -Path $graveZip -DestinationPath $graveDir -Force
  Expand-Archive -Path $indZip -DestinationPath $indDir -Force

  $carSrc = Get-ChildItem $carDir -Recurse -Directory -Filter "GLB format" | Select-Object -First 1 -ExpandProperty FullName
  $graveSrc = Get-ChildItem $graveDir -Recurse -Directory -Filter "GLB format" | Select-Object -First 1 -ExpandProperty FullName
  $indSrc = Get-ChildItem $indDir -Recurse -Directory -Filter "GLB format" | Select-Object -First 1 -ExpandProperty FullName
  if (-not $carSrc -or -not $graveSrc -or -not $indSrc) {
    throw "GLB format folders missing in Kenney zips"
  }

  $carOut = Join-Path $OutRoot "car"
  $graveOut = Join-Path $OutRoot "graveyard"
  $indOut = Join-Path $OutRoot "industrial"
  New-Item -ItemType Directory -Force -Path $carOut, $graveOut, $indOut | Out-Null

  $carKeep = @(
    "box.glb", "cone.glb", "cone-flat.glb",
    "debris-bumper.glb", "debris-door.glb", "debris-tire.glb",
    "debris-plate-a.glb", "debris-plate-b.glb", "debris-spoiler-a.glb",
    "wheel-default.glb", "wheel-dark.glb",
    # Straßenflotte (keine race/karts)
    "ambulance.glb", "firetruck.glb", "garbage-truck.glb", "delivery-flat.glb", "police.glb",
    "hatchback-sports.glb", "sedan-sports.glb", "suv-luxury.glb",
    "tractor.glb", "tractor-shovel.glb", "tractor-police.glb",
    "sedan.glb", "suv.glb", "taxi.glb", "van.glb", "delivery.glb", "truck.glb", "truck-flat.glb"
  )
  $graveKeep = @(
    "brick-wall.glb", "brick-wall-end.glb", "stone-wall.glb", "stone-wall-column.glb",
    "border-pillar.glb", "pillar-small.glb", "pillar-square.glb", "fence.glb", "iron-fence.glb"
  )
  $indKeep = @(
    "chimney-basic.glb", "chimney-large.glb", "chimney-medium.glb", "chimney-small.glb"
  )

  foreach ($name in $carKeep) {
    Copy-Item -Force (Join-Path $carSrc $name) (Join-Path $carOut $name)
  }
  $carTexSrc = Join-Path $carSrc "Textures"
  $carTexOut = Join-Path $carOut "Textures"
  if (Test-Path $carTexSrc) {
    New-Item -ItemType Directory -Force -Path $carTexOut | Out-Null
    Copy-Item -Force (Join-Path $carTexSrc "*") $carTexOut
  }
  foreach ($name in $graveKeep) {
    Copy-Item -Force (Join-Path $graveSrc $name) (Join-Path $graveOut $name)
  }
  foreach ($name in $indKeep) {
    Copy-Item -Force (Join-Path $indSrc $name) (Join-Path $indOut $name)
  }

  @"
Kenney Car Kit (CC0 1.0)
https://kenney.nl/assets/car-kit
Selected props + street vehicles vendored for NEXUS (no race/karts).
"@ | Set-Content (Join-Path $carOut "LICENSE.txt") -Encoding UTF8

  @"
Kenney Graveyard Kit (CC0 1.0)
https://kenney.nl/assets/graveyard-kit
Selected wall/fence props vendored for NEXUS workshop tiles.
"@ | Set-Content (Join-Path $graveOut "LICENSE.txt") -Encoding UTF8

  Write-Host "OK car=$((Get-ChildItem $carOut -Filter '*.glb').Count) graveyard=$((Get-ChildItem $graveOut -Filter '*.glb').Count)"
  Write-Host "Out: $OutRoot"
}
finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}
