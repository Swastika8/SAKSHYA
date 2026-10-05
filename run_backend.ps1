$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot 'Backend')
if (!(Test-Path '.venv\Scripts\python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Creating Python environment failed.' }
}
if (!(Test-Path '.venv\.sakshya-installed')) {
    & .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    New-Item -ItemType File -Path '.venv\.sakshya-installed' -Force | Out-Null
}
if (!(Test-Path '.env')) { Copy-Item .env.example .env }
$listenAddress = (& .\.venv\Scripts\python.exe -m app.host).Trim()
if ($LASTEXITCODE -ne 0) { throw 'No available loopback listener on port 8000.' }
Set-Content -Path '.runtime-host' -Value $listenAddress -Encoding ascii
Write-Host "Sakshya backend listening on $listenAddress port 8000. Start the frontend next."
& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host $listenAddress --port 8000 --no-access-log --log-level critical
