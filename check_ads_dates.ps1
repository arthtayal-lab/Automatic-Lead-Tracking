$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1&gid=2044633763"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows
$count2026 = 0
$countNull = 0
$count2025 = 0
$countNullWithData = 0
$date2026Counts = @{}

foreach ($row in $rows) {
    $cell = $row.c[1] # Column B (index 1)
    if ($null -eq $cell -or $cell.v -eq '') {
        $countNull++
    } else {
        $val = "$($cell.v) $($cell.f)"
        if ($val -match "2026") {
            $count2026++
            $fDate = $cell.f
            if (-not $fDate) { $fDate = $cell.v }
            $date2026Counts[$fDate] = ($date2026Counts[$fDate] + 1)
        } elseif ($val -match "2025") {
            $count2025++
        }
    }
}

Write-Host "Total Rows: $($rows.Count)"
Write-Host "Rows with null date: $countNull"
Write-Host "Rows with 2026 date: $count2026"
Write-Host "Rows with 2025 date: $count2025"
Write-Host "2026 Date Details:"
$date2026Counts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { Write-Host "  $($_.Key) : $($_.Value)" }

