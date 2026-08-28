param(
  [Parameter(Mandatory = $true)]
  [string]$Source,

  [Parameter(Mandatory = $true)]
  [string]$Destination
)

$ErrorActionPreference = 'Stop'

$sourceRoot = [System.IO.Path]::GetFullPath($Source).TrimEnd('\')
$destinationPath = [System.IO.Path]::GetFullPath($Destination)

if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
  throw "Source directory does not exist: $sourceRoot"
}

$destinationDirectory = [System.IO.Path]::GetDirectoryName($destinationPath)
if (-not (Test-Path -LiteralPath $destinationDirectory -PathType Container)) {
  New-Item -ItemType Directory -Path $destinationDirectory | Out-Null
}

$includedDirectories = @('src', 'public', 'server', 'scripts', 'tests', 'e2e', 'deploy')
$rootFiles = @(
  '.env.example',
  '.gitattributes',
  '.gitignore',
  'design-qa.md',
  'Dockerfile',
  'eslint.config.js',
  'index.html',
  'package.json',
  'playwright.config.ts',
  'pnpm-lock.yaml',
  'README.md',
  'SOURCE_PACKAGE_README.md',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  'vitest.config.ts'
)
$excludedSegments = @(
  '.git',
  '.pnpm-store',
  '.worktrees',
  'node_modules',
  'dist',
  'playwright-report',
  'test-results',
  '__pycache__',
  '.cache'
)
$excludedExtensions = @('.log', '.tmp', '.bak', '.old', '.pyc')

$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()

foreach ($directoryName in $includedDirectories) {
  $directoryPath = Join-Path $sourceRoot $directoryName
  if (-not (Test-Path -LiteralPath $directoryPath -PathType Container)) {
    continue
  }

  foreach ($file in Get-ChildItem -LiteralPath $directoryPath -File -Recurse) {
    $relative = [System.IO.Path]::GetRelativePath($sourceRoot, $file.FullName)
    $segments = $relative -split '[\\/]'
    if ($segments | Where-Object { $_ -in $excludedSegments }) {
      continue
    }
    if ($file.Extension.ToLowerInvariant() -in $excludedExtensions) {
      continue
    }
    $files.Add($file)
  }
}

$docsPath = Join-Path $sourceRoot 'docs'
if (Test-Path -LiteralPath $docsPath -PathType Container) {
  foreach ($file in Get-ChildItem -LiteralPath $docsPath -File -Filter '*.md') {
    $files.Add($file)
  }
}

foreach ($fileName in $rootFiles) {
  $filePath = Join-Path $sourceRoot $fileName
  if ([System.IO.File]::Exists($filePath)) {
    $files.Add([System.IO.FileInfo]::new($filePath))
  }
}

$required = @('src', 'public', 'package.json', 'pnpm-lock.yaml', 'README.md', 'SOURCE_PACKAGE_README.md')
foreach ($requiredItem in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot $requiredItem))) {
    throw "Required source item is missing: $requiredItem"
  }
}

if (Test-Path -LiteralPath $destinationPath) {
  throw "Destination archive already exists: $destinationPath"
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$fileStream = [System.IO.File]::Open($destinationPath, [System.IO.FileMode]::CreateNew)
try {
  $archive = [System.IO.Compression.ZipArchive]::new(
    $fileStream,
    [System.IO.Compression.ZipArchiveMode]::Create,
    $false
  )
  try {
    foreach ($file in $files | Sort-Object FullName -Unique) {
      $relative = [System.IO.Path]::GetRelativePath($sourceRoot, $file.FullName).Replace('\', '/')
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $archive,
        $file.FullName,
        $relative,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  }
  finally {
    $archive.Dispose()
  }
}
finally {
  $fileStream.Dispose()
}

$result = Get-Item -LiteralPath $destinationPath
[pscustomobject]@{
  Path = $result.FullName
  Bytes = $result.Length
  Megabytes = [math]::Round($result.Length / 1MB, 2)
  Files = ($files | Sort-Object FullName -Unique).Count
} | ConvertTo-Json -Compress
