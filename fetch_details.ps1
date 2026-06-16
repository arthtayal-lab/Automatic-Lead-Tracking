$sheetId = "1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

Write-Host "Columns with &headers=1:"
$cols = $data.table.cols
for ($i = 0; $i -lt $cols.Count; $i++) {
    $col = $cols[$i]
    $label = $col.label
    $id = $col.id
    $type = $col.type
    Write-Host "  Col $($i) : id='$($id)', label='$($label)', type='$($type)'"
}

Write-Host "`nFirst 2 Rows of data:"
$rows = $data.table.rows
$numRows = [Math]::Min(2, $rows.Count)
for ($r = 0; $r -lt $numRows; $r++) {
    Write-Host "Row $($r) :"
    $cells = $rows[$r].c
    for ($c = 0; $c -lt $cells.Count; $c++) {
        $cell = $cells[$c]
        $colLabel = $cols[$c].label
        if (-not $colLabel) { $colLabel = $cols[$c].id }
        if ($cell -ne $null) {
            $val = $cell.v
            $fmt = $cell.f
            Write-Host "  Col $($c) ($($colLabel)) : v='$($val)', f='$($fmt)'"
        } else {
            Write-Host "  Col $($c) ($($colLabel)) : null"
        }
    }
}
