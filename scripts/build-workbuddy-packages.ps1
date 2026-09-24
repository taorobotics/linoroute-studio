param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$skillsRoot = Join-Path $repoRoot "skills"
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $repoRoot "artifacts\workbuddy-skills"
}
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$definitions = @(
  @{ Slug = "linoroute-studio"; DisplayNameZh = "LinoRoute Studio"; DisplayNameEn = "LinoRoute Studio"; DescriptionZh = "通过 LinoRoute 处理图片和视频创作需求，自动选择兼容模型，仅在影响价格或结果时追问关键参数。"; DescriptionEn = "Route image and video requests through LinoRoute with model-aware parameters and minimal clarification." },
  @{ Slug = "linoroute-image-creator"; DisplayNameZh = "LinoRoute 图片创作"; DisplayNameEn = "LinoRoute Image Creator"; DescriptionZh = "通过 LinoRoute 生成或编辑图片，自动匹配模型支持的尺寸、比例、画质、格式、背景和参考图参数。"; DescriptionEn = "Create or edit images through LinoRoute with model-aware size, quality, format, and reference-image controls." },
  @{ Slug = "linoroute-video-creator"; DisplayNameZh = "LinoRoute 视频创作"; DisplayNameEn = "LinoRoute Video Creator"; DescriptionZh = "通过 LinoRoute 生成视频，处理文生视频、图生视频、时长、比例、分辨率和异步任务轮询。"; DescriptionEn = "Create videos through LinoRoute with model-aware text-to-video, duration, ratio, resolution, and polling." },
  @{ Slug = "linoroute-prompt-engineer"; DisplayNameZh = "LinoRoute 提示词工程师"; DisplayNameEn = "LinoRoute Prompt Engineer"; DescriptionZh = "将简单创意整理成可直接用于图片或视频生成的专业提示词，同时保留主体、风格、构图和限制条件。"; DescriptionEn = "Turn rough ideas into production-ready image or video prompts without changing the user's intent." }
)

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("linoroute-workbuddy-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
try {
  foreach ($definition in $definitions) {
    $source = Join-Path $skillsRoot $definition.Slug
    $skillMd = Join-Path $source "SKILL.md"
    if (-not (Test-Path -LiteralPath $skillMd)) {
      throw "Missing $skillMd"
    }

    $raw = Get-Content -LiteralPath $skillMd -Raw -Encoding utf8
    $match = [regex]::Match($raw, "\A---\r?\n[\s\S]*?\r?\n---\r?\n(?<body>[\s\S]*)$")
    if (-not $match.Success) {
      throw "SKILL.md has no valid frontmatter: $skillMd"
    }

    $frontmatter = @(
      "---",
      "name: `"$($definition.Slug)`"",
      "display_name: `"$($definition.DisplayNameZh)`"",
      "display_name_en: `"$($definition.DisplayNameEn)`"",
      "description: `"$($definition.DescriptionEn)`"",
      "description_zh: `"$($definition.DescriptionZh)`"",
      "description_en: `"$($definition.DescriptionEn)`"",
      "version: `"1.0.0`"",
      "author: `"LinoRoute`"",
      "---",
      ""
    ) -join "`n"

    $packageDirectory = Join-Path $tempRoot $definition.Slug
    New-Item -ItemType Directory -Force -Path (Join-Path $packageDirectory "references") | Out-Null
    [IO.File]::WriteAllText((Join-Path $packageDirectory "SKILL.md"), $frontmatter + $match.Groups["body"].Value, (New-Object Text.UTF8Encoding($false)))
    Get-ChildItem -LiteralPath (Join-Path $source "references") -Force | Copy-Item -Destination (Join-Path $packageDirectory "references") -Recurse -Force

    $archive = Join-Path $outputRoot ($definition.Slug + "-v1.0.0.zip")
    if (Test-Path -LiteralPath $archive) {
      Remove-Item -LiteralPath $archive -Force
    }
    Compress-Archive -Path (Join-Path $packageDirectory "*") -DestinationPath $archive -CompressionLevel Optimal
    $size = (Get-Item -LiteralPath $archive).Length
    if ($size -ge 3MB) {
      throw "$archive is $size bytes; WorkBuddy limit is 3 MB"
    }
    Write-Output ("{0}: {1} bytes" -f $archive, $size)
  }
}
finally {
  if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
  }
}
