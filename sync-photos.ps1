# Keeps the gallery's thumbnails and photo list in step with the pictures in images/.
#
# A website cannot look inside a folder or notice that a picture was swapped, and the gallery shows
# small thumbnail copies (images/thumbs/) of each photo. So whenever you ADD or REPLACE pictures in
# images/, run this script. For every photo it:
#   - works out a short fingerprint ("v") of the picture; if it differs from the one saved in
#     config/images.json (or the thumbnail is missing), it makes a fresh thumbnail and re-measures
#     the picture, so a replaced picture can never keep an old thumbnail or an old shape
#   - appends pictures that are not in config/images.json yet, at the END of the list
# Existing photos keep their position, ratio and favorite. Nothing is ever removed.
# The page adds "v" to every image address, so phones and browsers fetch the new files too.
#
# Use:  powershell -ExecutionPolicy Bypass -File sync-photos.ps1
# Then commit and push images/, images/thumbs/ and config/images.json together.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root     = $PSScriptRoot
$config   = Join-Path $root 'config\images.json'
$imageDir = Join-Path $root 'images'
$thumbDir = Join-Path $imageDir 'thumbs'
$reserved = 'Loader.jpg'            # the opening screen's picture, not a gallery photo
$maxThumb = 900                     # longest side of a gallery thumbnail, in pixels

New-Item -ItemType Directory -Force $thumbDir | Out-Null
$text = [IO.File]::ReadAllText($config, [Text.Encoding]::UTF8).TrimStart([char]0xFEFF)
$list = @((ConvertFrom-Json $text) | ForEach-Object { $_ })   # unroll: Windows PowerShell returns the array as one object

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$quality = New-Object System.Drawing.Imaging.EncoderParameters 1
$quality.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]80)

function Get-Fingerprint($path) { (Get-FileHash -Algorithm SHA1 -LiteralPath $path).Hash.ToLower().Substring(0, 10) }

# makes the thumbnail and returns the picture's real (upright) width and height
function New-Thumbnail($source, $dest, $longest) {
    $img = [System.Drawing.Image]::FromFile($source)
    try {
        # phones store a rotation flag instead of rotating the pixels: apply it, as browsers do
        if ($img.PropertyIdList -contains 0x0112) {
            switch ($img.GetPropertyItem(0x0112).Value[0]) {
                3 { $img.RotateFlip('Rotate180FlipNone') }
                6 { $img.RotateFlip('Rotate90FlipNone') }
                8 { $img.RotateFlip('Rotate270FlipNone') }
            }
            $img.RemovePropertyItem(0x0112)
        }
        $w = $img.Width; $h = $img.Height
        $scale = [Math]::Min(1.0, $longest / [Math]::Max($w, $h))
        $tw = [int][Math]::Round($w * $scale); $th = [int][Math]::Round($h * $scale)
        $bmp = New-Object System.Drawing.Bitmap $tw, $th
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
        $g.DrawImage($img, 0, 0, $tw, $th); $g.Dispose()
        if ([IO.Path]::GetExtension($dest) -match 'png') { $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png) }
        else { $bmp.Save($dest, $jpeg, $quality) }
        $bmp.Dispose()
    } finally { $img.Dispose() }
    return @($w, $h)
}

$refreshed = 0; $added = 0; $missing = @()
$rows = @()

foreach ($e in $list) {
    $source = Join-Path $imageDir $e.image
    $thumb  = Join-Path $thumbDir $e.image
    $row = [ordered]@{ id = [int]$e.id; image = [string]$e.image; order = [int]$e.order; ratio = [string]$e.ratio;
                       width = [int]$e.width; height = [int]$e.height; favorite = [bool]$e.favorite; v = [string]$e.v }
    if (-not (Test-Path -LiteralPath $source)) { $missing += $e.image; $rows += , $row; continue }
    $fp = Get-Fingerprint $source
    if ($row.v -ne $fp -or -not (Test-Path -LiteralPath $thumb)) {
        $size = New-Thumbnail $source $thumb $maxThumb
        $note = if ($row.v) { 'picture changed' } else { 'first sync' }
        if ($row.width -ne $size[0] -or $row.height -ne $size[1]) { $note += (", shape {0}x{1} -> {2}x{3}" -f $row.width, $row.height, $size[0], $size[1]) }
        $row.width = $size[0]; $row.height = $size[1]; $row.v = $fp
        $refreshed++
        Write-Host ("  ~ {0}: new thumbnail ({1})" -f $e.image, $note)
    }
    $rows += , $row
}

# pictures that are in images/ but not in the list yet go at the end
$known = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::Ordinal)   # exact case: GitHub Pages is case-sensitive
foreach ($e in $list) { [void]$known.Add([string]$e.image) }
$nextId    = ($list | Measure-Object -Property id    -Maximum).Maximum + 1
$nextOrder = ($list | Measure-Object -Property order -Maximum).Maximum + 1
$new = Get-ChildItem $imageDir -File | Where-Object { $_.Extension -match '^\.(jpe?g|png)$' -and $_.Name -ne $reserved -and -not $known.Contains($_.Name) } | Sort-Object Name
foreach ($f in $new) {
    $size = New-Thumbnail $f.FullName (Join-Path $thumbDir $f.Name) $maxThumb
    $rows += , ([ordered]@{ id = $nextId; image = $f.Name; order = $nextOrder; ratio = 'original'; width = $size[0]; height = $size[1]; favorite = $false; v = (Get-Fingerprint $f.FullName) })
    Write-Host ("  + {0}: added as photo {1} at the end ({2}x{3})" -f $f.Name, $nextId, $size[0], $size[1])
    $nextId++; $nextOrder++; $added++
}

# the opening screen's picture has its own, smaller thumbnail
$loader = Join-Path $imageDir $reserved; $loaderThumb = Join-Path $thumbDir $reserved
if ((Test-Path $loader) -and (-not (Test-Path $loaderThumb) -or (Get-Item $loaderThumb).LastWriteTime -lt (Get-Item $loader).LastWriteTime)) {
    [void](New-Thumbnail $loader $loaderThumb 700); Write-Host '  ~ Loader.jpg: new thumbnail'
}

function Quote($s) { '"' + ($s.Replace('\', '\\').Replace('"', '\"')) + '"' }
$blocks = foreach ($r in $rows) {
    $lines = @(('        "id": ' + $r.id), ('        "image": ' + (Quote $r.image)), ('        "order": ' + $r.order), ('        "ratio": ' + (Quote $r.ratio)),
               ('        "width": ' + $r.width), ('        "height": ' + $r.height), ('        "favorite": ' + $r.favorite.ToString().ToLower()))
    if ($r.v) { $lines += ('        "v": ' + (Quote $r.v)) }
    "    {`n" + ($lines -join ",`n") + "`n    }"
}
$newText = "[`n" + ($blocks -join ",`n") + "`n]`n"
$null = ConvertFrom-Json $newText                       # refuse to save anything that is not valid JSON
if ($newText -ne $text) { [IO.File]::WriteAllText($config, $newText, (New-Object Text.UTF8Encoding $false)) }

Write-Host ''
if ($missing) { Write-Host ("WARNING: listed in config/images.json but not found in images/: " + ($missing -join ', ')) }
Write-Host ("Done: {0} thumbnail(s) refreshed, {1} picture(s) added, {2} photos in total." -f $refreshed, $added, $rows.Count)
if ($refreshed -or $added) { Write-Host 'Next: commit and push images/, images/thumbs/ and config/images.json together.' }
