$url = "https://docs.google.com/spreadsheets/d/1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o/htmlview"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$matches = [regex]::Matches($content, '\{"name":"([^"]+)","gid":"(\d+)"\}')
foreach ($m in $matches) {
    Write-Host "Found Tab: $($m.Groups[1].Value) (gid: $($m.Groups[2].Value))"
}

$matches2 = [regex]::Matches($content, 'gid=(\d+)&amp;[^>]*>([^<]+)</a>')
foreach ($m in $matches2) {
    Write-Host "Found Tab: $($m.Groups[2].Value) (gid: $($m.Groups[1].Value))"
}
