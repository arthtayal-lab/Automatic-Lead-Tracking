$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$col16Vals = @{}
$col12Vals = @{}

foreach ($r in $data.table.rows) {
    if ($r.c.Count -gt 16 -and $null -ne $r.c[16] -and $r.c[16].v -ne '') {
        $val = $r.c[16].v
        if (-not $col16Vals.ContainsKey($val)) { $col16Vals[$val] = 0 }
        $col16Vals[$val]++
    }
    if ($r.c.Count -gt 12 -and $null -ne $r.c[12] -and $r.c[12].v -ne '') {
        $val = $r.c[12].v
        if (-not $col12Vals.ContainsKey($val)) { $col12Vals[$val] = 0 }
        $col12Vals[$val]++
    }
}

Write-Host "Lead Status (Col 16) Unique Values:"
$col16Vals.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }

Write-Host "`nCall Status (Col 12) Unique Values:"
$col12Vals.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }
