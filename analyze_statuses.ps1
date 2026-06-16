$sheetId = "1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows
$callInterests = @{}
$leadStatuses = @{}

foreach ($row in $rows) {
    # Call Interest is at col 11
    $ciCell = $row.c[11]
    if ($ciCell -ne $null -and $ciCell.v -ne $null) {
        $ciVal = $ciCell.v.ToString()
        $callInterests[$ciVal] = $callInterests[$ciVal] + 1
    } else {
        $callInterests["(blank)"] = $callInterests["(blank)"] + 1
    }
    
    # Lead Status is at col 16
    $lsCell = $row.c[16]
    if ($lsCell -ne $null -and $lsCell.v -ne $null) {
        $lsVal = $lsCell.v.ToString()
        $leadStatuses[$lsVal] = $leadStatuses[$lsVal] + 1
    } else {
        $leadStatuses["(blank)"] = $leadStatuses["(blank)"] + 1
    }
}

Write-Host "Call Interest (Col 11) Distribution:"
$callInterests.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Value)"
}

Write-Host "`nLead Status (Col 16) Distribution:"
$leadStatuses.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Value)"
}
