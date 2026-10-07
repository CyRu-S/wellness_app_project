$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
foreach ($relative in @('.local-ai', '.codex-work/local-ai')) {
  $record = Join-Path $projectRoot "$relative/server-process.json"
  if (-not (Test-Path -LiteralPath $record)) { continue }
  $state = Get-Content -LiteralPath $record -Raw | ConvertFrom-Json
  $process = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
  if ($process -and $process.Path -eq $state.executable) { Stop-Process -Id $process.Id; Write-Output 'Stopped the project local model service.' }
  Remove-Item -LiteralPath $record
}
