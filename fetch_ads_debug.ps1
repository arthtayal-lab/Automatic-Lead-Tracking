$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$cols = $data.table.cols
Write-Host "Columns:"
for ($i=0; $i -lt $cols.Count; $i++) {
    Write-Host "$i : $($cols[$i].label)"
}

Write-Host "`nLast 20 Rows (Date & Status):"
$rows = $data.table.rows
$start = [Math]::Max(0, $rows.Count - 20)
for ($i = $start; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    $dateCol = $row.c[0]
    $statusCol = $null
    if ($row.c.Count -gt 7) {
        $statusCol = $row.c[7] # Example index, need to check column list
    }
    
    $dVal = if ($null -ne $dateCol) { $dateCol.v + " (" + $dateCol.f + ")" } else { "null" }
    Write-Host "Row $i : Date='$dVal'"
}
