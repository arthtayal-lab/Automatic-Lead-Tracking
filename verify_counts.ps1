$sheetId = "1WQTGGj2A6qIWC9UVGqOd_mhksbtCM_oD_WSZwpy9_9k"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$rows = $data.table.rows

# Local time details: 2026-06-16
$today = "2026-06-16"
$y1 = "2026-06-15"
$y2 = "2026-06-14"
$y3 = "2026-06-13"
$y4 = "2026-06-12"
$mtdStart = "2026-06-01"
$mtdEnd = "2026-06-16"
$lastMonthStart = "2026-05-01"
$lastMonthEnd = "2026-05-31"

$counts = @{
    today = 0; y1 = 0; y2 = 0; y3 = 0; y4 = 0; mtd = 0; lastMonth = 0; total = 0
    interested = 0; warm = 0; cold = 0; notInterested = 0; converted = 0; paid = 0
}

foreach ($row in $rows) {
    $dateCell = $row.c[5]
    $statusCell = $row.c[16]
    $interestCell = $row.c[11]
    
    $counts.total++
    
    # Date processing
    if ($dateCell -ne $null -and $dateCell.v -ne $null) {
        $dStr = $dateCell.v.ToString()
        if ($dStr.Length -ge 10) {
            $ymd = $dStr.Substring(0, 10)
            if ($ymd -eq $today) { $counts.today++ }
            if ($ymd -eq $y1) { $counts.y1++ }
            if ($ymd -eq $y2) { $counts.y2++ }
            if ($ymd -eq $y3) { $counts.y3++ }
            if ($ymd -eq $y4) { $counts.y4++ }
            if ($ymd -ge $mtdStart -and $ymd -le $mtdEnd) { $counts.mtd++ }
            if ($ymd -ge $lastMonthStart -and $ymd -le $lastMonthEnd) { $counts.lastMonth++ }
        }
    }
    
    # Status processing
    $status = ""
    if ($statusCell -ne $null -and $statusCell.v -ne $null) { $status = $statusCell.v.ToString().ToLower() }
    $interest = ""
    if ($interestCell -ne $null -and $interestCell.v -ne $null) { $interest = $interestCell.v.ToString().ToLower() }
    
    $isInterested = $status.Contains("intrested") -or $status.Contains("interested") -or $status.Contains("warm") -or $status.Contains("hot") -or $interest.Contains("intrested") -or $interest.Contains("interested") -or $interest.Contains("warm") -or $interest.Contains("hot")
    $isWarm = $status.Contains("warm") -or $interest.Contains("warm")
    $isCold = $status.Contains("cold") -or $interest.Contains("cold")
    $isNotInterested = $status.Contains("not interest") -or $status.Contains("not intrest") -or $interest.Contains("not interest") -or $interest.Contains("not intrest") -or $status.Contains("no interest") -or $interest.Contains("no interest")
    $isConverted = $status.Contains("converted") -or $interest.Contains("converted")
    $isPaid = $status.Contains("paid") -or $interest.Contains("paid")
    
    if ($isInterested) { $counts.interested++ }
    if ($isWarm) { $counts.warm++ }
    if ($isCold) { $counts.cold++ }
    if ($isNotInterested) { $counts.notInterested++ }
    if ($isConverted) { $counts.converted++ }
    if ($isPaid) { $counts.paid++ }
}

Write-Host "Verification results for Franchise sheet:"
Write-Host "----------------------------------------"
Write-Host "Today (2026-06-16) : $($counts.today)"
Write-Host "Yesterday (2026-06-15) : $($counts.y1)"
Write-Host "Y-2 (2026-06-14)   : $($counts.y2)"
Write-Host "Y-3 (2026-06-13)   : $($counts.y3)"
Write-Host "Y-4 (2026-06-12)   : $($counts.y4)"
Write-Host "MTD (June 2026)    : $($counts.mtd)"
Write-Host "Last Month (May)   : $($counts.lastMonth)"
Write-Host "Total Leads        : $($counts.total)"
Write-Host ""
Write-Host "Status Breakdown:"
Write-Host "Interested         : $($counts.interested)"
Write-Host "Warm               : $($counts.warm)"
Write-Host "Cold               : $($counts.cold)"
Write-Host "Not Interested     : $($counts.notInterested)"
Write-Host "Converted          : $($counts.converted)"
Write-Host "Paid               : $($counts.paid)"
