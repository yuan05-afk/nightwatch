# Exports the deck to PDF with the installed PowerPoint (same quit rules as render.ps1).
param(
  [string]$Deck = "$PSScriptRoot\NIGHTWATCH-DataNova2026.pptx",
  [string]$Pdf = "$PSScriptRoot\NIGHTWATCH-DataNova2026.pdf"
)
$Deck = (Resolve-Path $Deck).Path
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$app = New-Object -ComObject PowerPoint.Application
$pres = $null
try {
  $pres = $app.Presentations.Open($Deck, -1, 0, 0)
  $pres.SaveAs($Pdf, 32)  # ppSaveAsPDF
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
Get-Item $Pdf | Select-Object Name, Length
