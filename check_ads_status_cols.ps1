$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$c12 = 0
$c16 = 0
$c17 = 0
$dateColNullCount = 0
$dateColFilledCount = 0

foreach ($r in $data.table.rows) {
    if ($r.c.Count -gt 12 -and $null -ne $r.c[12] -and $r.c[12].v -ne '') { $c12++ }
    if ($r.c.Count -gt 16 -and $null -ne $r.c[16] -and $r.c[16].v -ne '') { $c16++ }
    if ($r.c.Count -gt 17 -and $null -ne $r.c[17] -and $r.c[17].v -ne '') { $c17++ }
    
    if ($null -eq $r.c[0] -or $r.c[0].v -eq '') {
        $dateColNullCount++
    } else {
        $dateColFilledCount++
    }
}

Write-Host "Rows with Call Status (12): $c12"
Write-Host "Rows with Lead Status (16): $c16"
Write-Host "Rows with Final Lead Status (17): $c17"
Write-Host "Date Col Null: $dateColNullCount, Filled: $dateColFilledCount"
