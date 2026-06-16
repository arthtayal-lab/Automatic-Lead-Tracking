$sheetId = "1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows
$cols = $data.table.cols

Write-Host "Total rows returned by gviz: $($rows.Count)"

Write-Host "`nLast 10 rows returned:"
$startIndex = [Math]::Max(0, $rows.Count - 10)
for ($r = $startIndex; $r -lt $rows.Count; $r++) {
    $row = $rows[$r]
    $cells = $row.c
    $name = ""
    if ($cells[0] -ne $null -and $cells[0].v -ne $null) { $name = $cells[0].v.ToString() }
    $email = ""
    if ($cells[1] -ne $null -and $cells[1].v -ne $null) { $email = $cells[1].v.ToString() }
    $date = ""
    if ($cells[5] -ne $null -and $cells[5].v -ne $null) { $date = $cells[5].v.ToString() }
    Write-Host "Row $($r): Name='$($name)', Email='$($email)', Date='$($date)'"
}

Write-Host "`nRows with blank Name, Email, AND Mobile:"
$blankCount = 0
for ($r = 0; $r -lt $rows.Count; $r++) {
    $row = $rows[$r]
    $cells = $row.c
    $name = ""
    if ($cells.Count -gt 0 -and $cells[0] -ne $null -and $cells[0].v -ne $null) { $name = $cells[0].v.ToString().Trim() }
    $email = ""
    if ($cells.Count -gt 1 -and $cells[1] -ne $null -and $cells[1].v -ne $null) { $email = $cells[1].v.ToString().Trim() }
    $mobile = ""
    if ($cells.Count -gt 2 -and $cells[2] -ne $null -and $cells[2].v -ne $null) { $mobile = $cells[2].v.ToString().Trim() }
    
    if ($name -eq "" -and $email -eq "" -and $mobile -eq "") {
        $blankCount++
        if ($blankCount -le 10) {
            $date = ""
            if ($cells.Count -gt 5 -and $cells[5] -ne $null -and $cells[5].v -ne $null) { $date = $cells[5].v.ToString() }
            Write-Host "Row $($r): Name='$($name)', Email='$($email)', Mobile='$($mobile)', Date='$($date)'"
        }
    }
}
Write-Host "Total rows with blank Name, Email, AND Mobile: $($blankCount)"
