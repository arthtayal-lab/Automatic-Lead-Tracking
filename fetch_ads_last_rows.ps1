$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows
$count = $rows.Count
Write-Host "Total Rows: $count"

$start = [Math]::Max(0, $count - 5)
for ($i = $start; $i -lt $count; $i++) {
    $row = $rows[$i]
    Write-Host "Row $i :"
    for ($j = 0; $j -lt $row.c.Count; $j++) {
        $cell = $row.c[$j]
        if ($null -ne $cell) {
            $v = $cell.v
            $f = $cell.f
            Write-Host "  Col $j : v='$v', f='$f'"
        } else {
            Write-Host "  Col $j : null"
        }
    }
}
