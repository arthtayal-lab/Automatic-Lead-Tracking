$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows
$countCallingDate2026 = 0
$countFollowupDate2026 = 0

foreach ($row in $rows) {
    if ($row.c.Count -gt 11 -and $null -ne $row.c[11]) {
        $cell = $row.c[11]
        if ($cell.f -match "2026" -or $cell.v -match "2026") {
            $countCallingDate2026++
        }
    }
    if ($row.c.Count -gt 14 -and $null -ne $row.c[14]) {
        $cell = $row.c[14]
        if ($cell.f -match "2026" -or $cell.v -match "2026") {
            $countFollowupDate2026++
        }
    }
}

Write-Host "Rows with Calling Date in 2026: $countCallingDate2026"
Write-Host "Rows with Followup Date in 2026: $countFollowupDate2026"
