# Renders each slide of the deck to PNG with the installed PowerPoint, for visual QA.
#   powershell -File deck/render.ps1 [-Deck path] [-Out dir]
param(
  [string]$Deck = "$PSScriptRoot\NIGHTWATCH-DataNova2026.pptx",
  [string]$Out = "$PSScriptRoot\render"
)
$Deck = (Resolve-Path $Deck).Path
New-Item -ItemType Directory -Force $Out | Out-Null
Get-ChildItem $Out -Filter *.png | Remove-Item -Force -Confirm:$false

# COM attaches to a PowerPoint that is already open; only shut down an instance this script started.
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$app = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  # ReadOnly, Untitled, WithWindow = false
  $pres = $app.Presentations.Open($Deck, -1, 0, 0)
  $i = 1
  foreach ($s in $pres.Slides) {
    $s.Export((Join-Path $Out ("slide-{0:D2}.png" -f $i)), "PNG", 1600, 900)
    $i++
  }
} finally {
  if ($pres) { $pres.Close(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) }
  if ($before.Count -eq 0) { $app.Quit() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
if ($before.Count -eq 0) {
  Start-Sleep -Seconds 2
  Get-Process POWERPNT -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | Stop-Process -Force -Confirm:$false
}
Get-ChildItem $Out -Filter *.png | ForEach-Object { $_.FullName }
