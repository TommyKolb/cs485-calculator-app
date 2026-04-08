$ErrorActionPreference = "Stop"

$lambdaDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Split-Path -Parent $lambdaDir
$buildDir = Join-Path $lambdaDir "build"
$zipPath = Join-Path $lambdaDir "calculate-lambda.zip"

if (Test-Path $buildDir) {
  Remove-Item -Recurse -Force $buildDir
}

New-Item -ItemType Directory -Path $buildDir | Out-Null
Copy-Item (Join-Path $lambdaDir "index.mjs") (Join-Path $buildDir "index.mjs")
Copy-Item (Join-Path $serverDir "calculator.js") (Join-Path $buildDir "calculator.js")

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

Compress-Archive -Path (Join-Path $buildDir "*") -DestinationPath $zipPath
Write-Host "Created $zipPath"
