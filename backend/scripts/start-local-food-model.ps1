param([string]$Model = 'qwen3-vl:2b-instruct')
$ErrorActionPreference = 'Stop'
if ($Model -notmatch '^[A-Za-z0-9._:/-]{1,100}$' -or $Model -match 'cloud') { throw 'Choose a downloaded local vision model, not a cloud model.' }
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$candidates = @((Join-Path $projectRoot '.local-ai/runtime/ollama.exe'), (Join-Path $projectRoot '.codex-work/local-ai/runtime/ollama.exe'))
$executable = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $executable) {
  $installed = Get-Command ollama -ErrorAction SilentlyContinue
  if (-not $installed) { throw 'Install Ollama from https://ollama.com/download/windows, or place its portable runtime in .local-ai/runtime.' }
  $executable = $installed.Source
  $stateDirectory = Join-Path $projectRoot '.local-ai'
} else { $stateDirectory = Split-Path (Split-Path $executable -Parent) -Parent }
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
# Ollama's filesystem checks need the actual directory when a worktree uses a junction.
$stateItem = Get-Item -LiteralPath $stateDirectory -Force
if ($stateItem.Target) {
  $target = @($stateItem.Target)[0]
  $stateDirectory = if ([IO.Path]::IsPathRooted($target)) { $target } else { Join-Path $stateItem.Parent.FullName $target }
  if (Test-Path -LiteralPath (Join-Path $stateDirectory 'runtime/ollama.exe')) {
    $executable = Join-Path $stateDirectory 'runtime/ollama.exe'
  }
}
$env:OLLAMA_HOST = '127.0.0.1:11434'
$env:OLLAMA_MODELS = Join-Path $stateDirectory 'models'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_QUEUE = '4'
try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2; $running = $true } catch { $running = $false }
if (-not $running) {
  $process = Start-Process -FilePath $executable -ArgumentList 'serve' -WindowStyle Hidden -PassThru -WorkingDirectory $projectRoot -RedirectStandardOutput (Join-Path $stateDirectory 'server.log') -RedirectStandardError (Join-Path $stateDirectory 'server-error.log')
  @{ pid = $process.Id; executable = $executable } | ConvertTo-Json | Set-Content (Join-Path $stateDirectory 'server-process.json')
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try { $null = Invoke-RestMethod 'http://127.0.0.1:11434/api/version' -TimeoutSec 2; $running = $true; break } catch { }
  }
  if (-not $running) { throw "Ollama did not start. Read $stateDirectory/server-error.log." }
}
$installedModels = Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
$modelTag = if ($Model -match ':[^/]+$') { $Model } else { "${Model}:latest" }
if ($modelTag -notin @($installedModels.models.name)) {
  Write-Output "Downloading $Model. Progress: $stateDirectory/model-pull-error.log"
  $pull = Start-Process -FilePath $executable -ArgumentList @('pull', $Model) -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $stateDirectory 'model-pull.log') -RedirectStandardError (Join-Path $stateDirectory 'model-pull-error.log')
  if ($pull.ExitCode -ne 0) { throw "Could not download the local vision model. Read $stateDirectory/model-pull-error.log." }
}
$body = @{ model = $Model; stream = $false; keep_alive = '5m'; messages = @() } | ConvertTo-Json
$null = Invoke-RestMethod 'http://127.0.0.1:11434/api/chat' -Method Post -ContentType 'application/json' -Body $body -TimeoutSec 180
Write-Output "Local vision model ready: $Model. Backend URL: http://127.0.0.1:11434. No AI API key is required."
