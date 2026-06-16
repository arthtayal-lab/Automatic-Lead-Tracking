$sheetId = "1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows
$dates = @{}
$statuses = @{}

foreach ($row in $rows) {
    # Date is at col 5 (F)
    $dateCell = $row.c[5]
    if ($dateCell -ne $null -and $dateCell.v -ne $null) {
        $dStr = $dateCell.v.ToString()
        if ($dStr.Length -ge 10) {
            $ymd = $dStr.Substring(0, 10)
            $dates[$ymd] = $dates[$ymd] + 1
        }
    }
    
    # Status is at col 16 (Q)
    $statusCell = $row.c[16]
    if ($statusCell -ne $null -and $statusCell.v -ne $null) {
        $sVal = $statusCell.v.ToString()
        $statuses[$sVal] = $statuses[$sVal] + 1
    } else {
        $statuses["(blank)"] = $statuses["(blank)"] + 1
    }
}

Write-Host "Total Rows: $($rows.Count)"
Write-Host "`nDate Distribution (Top 20):"
$dates.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 20 | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Value)"
}

Write-Host "`nStatus Distribution:"
$statuses.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Value)"
}
