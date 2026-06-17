$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1&gid=2044633763"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

# Show ALL column headers with their types
Write-Host "=== ALL COLUMNS ==="
for ($i = 0; $i -lt $data.table.cols.Count; $i++) {
    $col = $data.table.cols[$i]
    Write-Host "Col $i : label='$($col.label)' type='$($col.type)' id='$($col.id)'"
}

# Show the FULL raw cell data for Col 0 for first 5 rows that have data
Write-Host "`n=== FIRST 5 ROWS WITH Col 0 DATA (raw .v and .f) ==="
$found = 0
for ($i = 0; $i -lt $data.table.rows.Count -and $found -lt 5; $i++) {
    $row = $data.table.rows[$i]
    $cell0 = $row.c[0]
    if ($null -ne $cell0 -and $cell0.v -ne '') {
        $v = $cell0.v
        $f = $cell0.f
        Write-Host "Row $i : .v='$v' .f='$f'"
        $found++
    }
}

# Show first 5 rows with Col 0 NULL but show what ALL other columns have
Write-Host "`n=== FIRST 3 ROWS WITH Col 0 NULL (show all cols) ==="
$found = 0
for ($i = 0; $i -lt $data.table.rows.Count -and $found -lt 3; $i++) {
    $row = $data.table.rows[$i]
    $cell0 = $row.c[0]
    if ($null -eq $cell0 -or $cell0.v -eq '') {
        Write-Host "--- Row $i ---"
        for ($j = 0; $j -lt [Math]::Min($row.c.Count, 20); $j++) {
            $cell = $row.c[$j]
            if ($null -ne $cell) {
                Write-Host "  Col $($j): .v='$($cell.v)' .f='$($cell.f)'"
            } else {
                Write-Host "  Col $($j): NULL"
            }
        }
        $found++
    }
}

# Count rows by year from Col 0
Write-Host "`n=== DATE DISTRIBUTION BY YEAR (Col 0) ==="
$yearCounts = @{}
$dateFormats = @{}
foreach ($row in $data.table.rows) {
    $cell0 = $row.c[0]
    if ($null -ne $cell0 -and $cell0.v -ne '') {
        $v = "$($cell0.v)"
        if ($v -match 'Date\((\d{4})') {
            $year = $matches[1]
            if (-not $yearCounts.ContainsKey($year)) { $yearCounts[$year] = 0 }
            $yearCounts[$year]++
        } elseif ($v -match '^(\d{4})') {
            $year = $matches[1]
            if (-not $yearCounts.ContainsKey($year)) { $yearCounts[$year] = 0 }
            $yearCounts[$year]++
        } else {
            if (-not $dateFormats.ContainsKey($v)) { $dateFormats[$v] = 0 }
            $dateFormats[$v]++
        }
    }
}
$yearCounts.GetEnumerator() | Sort-Object Name | ForEach-Object { Write-Host "$($_.Key): $($_.Value) rows" }

Write-Host "`n=== UNRECOGNIZED DATE FORMATS ==="
$dateFormats.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }

# Check specifically for June 2026 dates
Write-Host "`n=== ROWS WITH 2026 DATES ==="
$count2026 = 0
foreach ($row in $data.table.rows) {
    $cell0 = $row.c[0]
    if ($null -ne $cell0 -and $cell0.v -ne '') {
        $v = "$($cell0.v)"
        if ($v -match '2026') {
            if ($count2026 -lt 10) {
                Write-Host "  .v='$v' .f='$($cell0.f)'"
            }
            $count2026++
        }
    }
}
Write-Host "Total 2026 rows: $count2026"

# Also check Lead Status column (16) distribution
Write-Host "`n=== LEAD STATUS (Col 16) DISTRIBUTION ==="
$statusCounts = @{}
foreach ($row in $data.table.rows) {
    if ($row.c.Count -gt 16 -and $null -ne $row.c[16] -and $row.c[16].v -ne '') {
        $val = "$($row.c[16].v)".Trim().ToLower()
        if (-not $statusCounts.ContainsKey($val)) { $statusCounts[$val] = 0 }
        $statusCounts[$val]++
    }
}
$statusCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { Write-Host "$($_.Key): $($_.Value)" }
