$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$skippedCount = 0
$processedCount = 0
$statusHits = 0

foreach ($r in $data.table.rows) {
    $name = if ($r.c.Count -gt 2 -and $null -ne $r.c[2]) { $r.c[2].v } else { '' }
    $email = if ($r.c.Count -gt 4 -and $null -ne $r.c[4]) { $r.c[4].v } else { '' }
    $mobile = if ($r.c.Count -gt 3 -and $null -ne $r.c[3]) { $r.c[3].v } else { '' }
    $dateStr = if ($r.c.Count -gt 0 -and $null -ne $r.c[0]) { $r.c[0].f } else { '' }
    
    if (-not $name -and -not $email -and -not $mobile -and -not $dateStr) {
        $skippedCount++
        continue
    }
    
    $processedCount++
    
    $status = if ($r.c.Count -gt 16 -and $null -ne $r.c[16]) { $r.c[16].v } else { '' }
    if ($status -ne '') {
        $statusHits++
    }
}

Write-Host "Skipped Rows: $skippedCount"
Write-Host "Processed Rows: $processedCount"
Write-Host "Processed Rows WITH Status: $statusHits"
