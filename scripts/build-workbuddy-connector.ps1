$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$connectorRoot = Join-Path $repoRoot 'connector\linoroute-mcp'
$artifactRoot = Join-Path $repoRoot 'artifacts\workbuddy-connectors'
$stageRoot = Join-Path $artifactRoot '.linoroute-ai-studio-stage'
$archivePath = Join-Path $artifactRoot 'linoroute-ai-studio-v0.1.0.zip'

if (-not (Test-Path (Join-Path $connectorRoot 'connector-meta.json'))) {
  throw "Connector metadata was not found at $connectorRoot"
}

New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
if (Test-Path $stageRoot) { Remove-Item -LiteralPath $stageRoot -Recurse -Force }
if (Test-Path $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null

foreach ($name in @('connector-meta.json', 'mcp.json', 'token-schema.json', 'icon.svg')) {
  Copy-Item -LiteralPath (Join-Path $connectorRoot $name) -Destination (Join-Path $stageRoot $name)
}

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal
Remove-Item -LiteralPath $stageRoot -Recurse -Force

$size = (Get-Item -LiteralPath $archivePath).Length
if ($size -gt 3MB) { throw "Connector package exceeds WorkBuddy's 3 MB limit ($size bytes)." }
Write-Output "Created $archivePath ($size bytes)"
