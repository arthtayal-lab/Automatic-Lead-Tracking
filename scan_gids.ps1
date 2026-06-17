$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"

for ($gid = 0; $gid -lt 10; $gid++) {
    $url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1&gid=$gid"
    try {
        $res = Invoke-WebRequest -Uri $url -UseBasicParsing
        $content = $res.Content
        $startIdx = $content.IndexOf("{")
        if ($startIdx -ge 0) {
            $endIdx = $content.LastIndexOf("}")
            $jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
            $data = ConvertFrom-Json $jsonStr
            
            $rowCount = $data.table.rows.Count
            $col0Label = if ($data.table.cols[0]) { $data.table.cols[0].label } else { "none" }
            $col1Label = if ($data.table.cols[1]) { $data.table.cols[1].label } else { "none" }
            
            Write-Host "GID $gid : Rows = $rowCount | Col0 = $col0Label | Col1 = $col1Label"
        }
    } catch {
        # Skip if error
    }
}
