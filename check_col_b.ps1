$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

Write-Host "Checking Col 1 (B) values for the last 10 rows:"
$rows = $data.table.rows
$start = [Math]::Max(0, $rows.Count - 10)
for ($i = $start; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    $val = if ($null -ne $row.c[1]) { $row.c[1].v } else { "null" }
    Write-Host "Row $i : Col 1 = $val"
}
