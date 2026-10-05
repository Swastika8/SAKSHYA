$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot 'Frontend')
if (!(Test-Path 'node_modules')) {
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
if (!(Test-Path '.env.local')) { Copy-Item .env.example .env.local }
if (Test-Path '..\Backend\.runtime-host') {
    $backendAddress = (Get-Content '..\Backend\.runtime-host' -Raw).Trim()
    $env:NEXT_PUBLIC_API_URL = if ($backendAddress -eq '::1') { 'http://[::1]:8000' } else { 'http://localhost:8000' }
}
if (!(Test-Path 'public\ocr\lang\mar.traineddata.gz')) {
    npm.cmd run prepare:ocr
    if ($LASTEXITCODE -ne 0) { throw 'Local OCR asset setup failed.' }
}
$env:NEXT_TELEMETRY_DISABLED = '1'
npm.cmd run dev
