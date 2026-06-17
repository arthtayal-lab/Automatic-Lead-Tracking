$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/gviz/tq?tqx=out:json&headers=1&gid=2044633763"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$startIdx = $content.IndexOf("{")
$endIdx = $content.LastIndexOf("}")
$jsonStr = $content.Substring($startIdx, $endIdx - $startIdx + 1)
$data = ConvertFrom-Json $jsonStr

$cols = $data.table.cols
$rows = $data.table.rows

# Identify columns dynamically
$colIndices = @{
    name = -1; email = -1; mobile = -1; date = -1; leadStatus = -1; callInterest = -1; poc = -1; city = -1
}

for ($idx = 0; $idx -lt $cols.Count; $idx++) {
    $label = "$($cols[$idx].label)".Trim().ToLower()
    if ($label -eq "name" -or $label -eq "lead name" -or $label -eq "full name") { $colIndices.name = $idx }
    elseif ($label -eq "email" -or $label -eq "email id") { $colIndices.email = $idx }
    elseif ($label -eq "mobile" -or $label -eq "mobile number" -or $label -eq "phone" -or $label -eq "contact" -or $label -eq "mobile no") { $colIndices.mobile = $idx }
    elseif ($label -eq "date" -or $label -eq "created date" -or $label -eq "timestamp" -or $label -eq "created at" -or ($label -like "*date*" -and $label -notlike "*calling*" -and $label -notlike "*followup*" -and $label -notlike "*follow up*" -and $label -notlike "*agreement*" -and $label -notlike "*expected*")) { $colIndices.date = $idx }
    elseif ($label -eq "lead status" -or $label -eq "lead status " -or $label -eq "status") { $colIndices.leadStatus = $idx }
    elseif ($label -eq "call intrest" -or $label -eq "call interest" -or $label -eq "interest" -or $label -eq "call status") { $colIndices.callInterest = $idx }
    elseif ($label -eq "lead poc" -or $label -eq "poc" -or $label -eq "owner of lead") { $colIndices.poc = $idx }
    elseif ($label -eq "city") { $colIndices.city = $idx }
}

# Fallbacks for ads
if ($colIndices.name -eq -1) { $colIndices.name = 2 }
if ($colIndices.email -eq -1) { $colIndices.email = 3 }
if ($colIndices.mobile -eq -1) { $colIndices.mobile = 4 }
if ($colIndices.city -eq -1) { $colIndices.city = 5 }
if ($colIndices.date -eq -1) { $colIndices.date = 1 }
if ($colIndices.poc -eq -1) { $colIndices.poc = 12 }
if ($colIndices.callInterest -eq -1) { $colIndices.callInterest = 14 }
if ($colIndices.leadStatus -eq -1) { $colIndices.leadStatus = 18 }

Write-Host "Mapped Indices:"
$colIndices.Keys | ForEach-Object { Write-Host "  $_ : $($colIndices[$_])" }

# Date configuration (Today is 2026-06-17)
$today = "2026-06-17"
$y1 = "2026-06-16"
$y2 = "2026-06-15"
$y3 = "2026-06-14"
$y4 = "2026-06-13"
$mtdStart = "2026-06-01"
$mtdEnd = "2026-06-17"
$lastMonthStart = "2026-05-01"
$lastMonthEnd = "2026-05-31"

$counts = @{
    today = 0; y1 = 0; y2 = 0; y3 = 0; y4 = 0; mtd = 0; lastMonth = 0; total = 0
    callAgain = 0; followup = 0; interested = 0; notInterested = 0; wrongNo = 0; blank = 0
}

$parsedLeads = @()

foreach ($row in $rows) {
    # Extract values
    $name = if ($null -ne $row.c[$colIndices.name]) { "$($row.c[$colIndices.name].v)".Trim() } else { "" }
    $email = if ($null -ne $row.c[$colIndices.email]) { "$($row.c[$colIndices.email].v)".Trim() } else { "" }
    $mobile = if ($null -ne $row.c[$colIndices.mobile]) { "$($row.c[$colIndices.mobile].v)".Trim() } else { "" }
    $dateStr = if ($null -ne $row.c[$colIndices.date]) { 
        if ($null -ne $row.c[$colIndices.date].f) { "$($row.c[$colIndices.date].f)".Trim() } 
        else { "$($row.c[$colIndices.date].v)".Trim() } 
    } else { "" }
    
    if (-not $name -and -not $email -and -not $mobile -and -not $dateStr) { continue }
    
    $counts.total++
    
    # Parse date
    $ymd = ""
    if ($dateStr) {
        if ($dateStr -match '^(\d{4}-\d{2}-\d{2})') {
            $ymd = $matches[1]
        } elseif ($dateStr -match 'Date\((\d+),\s*(\d+),\s*(\d+)') {
            $y = $matches[1]
            $m = ([int]$matches[2] + 1).ToString().PadLeft(2, '0')
            $d = $matches[3].PadLeft(2, '0')
            $ymd = "$y-$m-$d"
        } elseif ($dateStr -match '^(\d{1,2})\/(\d{1,2})\/(\d{4})') {
            $d = $matches[1].PadLeft(2, '0')
            $m = $matches[2].PadLeft(2, '0')
            $y = $matches[3]
            $ymd = "$y-$m-$d"
        } else {
            try {
                $parsedD = Get-Date $dateStr -ErrorAction SilentlyContinue
                if ($parsedD) {
                    $ymd = $parsedD.ToString("yyyy-MM-dd")
                }
            } catch {}
        }
    }
    
    # Accumulate date buckets
    if ($ymd) {
        if ($counts.today -lt 5 -and $ymd -match '2026') {
            Write-Host "Row parsed: dateStr='$dateStr' -> ymd='$ymd'"
        }
        if ($ymd -eq $today) { $counts.today++ }
        if ($ymd -eq $y1) { $counts.y1++ }
        if ($ymd -eq $y2) { $counts.y2++ }
        if ($ymd -eq $y3) { $counts.y3++ }
        if ($ymd -eq $y4) { $counts.y4++ }
        if ($ymd -ge $mtdStart -and $ymd -le $mtdEnd) { $counts.mtd++ }
        if ($ymd -ge $lastMonthStart -and $ymd -le $lastMonthEnd) { $counts.lastMonth++ }
    }
    
    # Status breakdown logic
    $statusVal = if ($null -ne $row.c[$colIndices.leadStatus]) { "$($row.c[$colIndices.leadStatus].v)".ToLower().Trim() } else { "" }
    $interestVal = if ($null -ne $row.c[$colIndices.callInterest]) { "$($row.c[$colIndices.callInterest].v)".ToLower().Trim() } else { "" }
    
    $isCallAgain = $statusVal.Contains("call again") -or $interestVal.Contains("call again")
    $isFollowup = $statusVal.Contains("followup") -or $statusVal.Contains("follow up") -or $interestVal.Contains("followup") -or $interestVal.Contains("follow up")
    $isNotInterested = $statusVal.Contains("not interest") -or $statusVal.Contains("not intrest") -or $interestVal.Contains("not interest") -or $interestVal.Contains("not intrest") -or $statusVal.Contains("no interest") -or $interestVal.Contains("no interest")
    $isInterested = ($statusVal.Contains("interested") -or $statusVal.Contains("intrested") -or $interestVal.Contains("interested") -or $interestVal.Contains("intrested")) -and -not $isNotInterested
    $isWrongNo = $statusVal.Contains("wrong no") -or $statusVal.Contains("wrong number") -or $interestVal.Contains("wrong no") -or $interestVal.Contains("wrong number")
    $isBlank = ($statusVal -eq "") -and ($interestVal -eq "")
    
    if ($isCallAgain) { $counts.callAgain++ }
    if ($isFollowup) { $counts.followup++ }
    if ($isInterested) { $counts.interested++ }
    if ($isNotInterested) { $counts.notInterested++ }
    if ($isWrongNo) { $counts.wrongNo++ }
    if ($isBlank) { $counts.blank++ }
}

Write-Host "`nVerification results for Ads sheet (GID 2044633763):"
Write-Host "----------------------------------------"
Write-Host "Today ($today)      : $($counts.today)"
Write-Host "Yesterday ($y1)    : $($counts.y1)"
Write-Host "Y-2 ($y2)          : $($counts.y2)"
Write-Host "Y-3 ($y3)          : $($counts.y3)"
Write-Host "Y-4 ($y4)          : $($counts.y4)"
Write-Host "MTD (June 2026)    : $($counts.mtd)"
Write-Host "Last Month (May)   : $($counts.lastMonth)"
Write-Host "Total Leads        : $($counts.total)"
Write-Host ""
Write-Host "Status Breakdown:"
Write-Host "Call Again         : $($counts.callAgain)"
Write-Host "Follow-up          : $($counts.followup)"
Write-Host "Interested         : $($counts.interested)"
Write-Host "Not Interested     : $($counts.notInterested)"
Write-Host "Wrong Number       : $($counts.wrongNo)"
Write-Host "Blank              : $($counts.blank)"
