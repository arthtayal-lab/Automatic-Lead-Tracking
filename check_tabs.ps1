$sheetId = "1cvFVTlWSce5whci4Au3MeqRRFVRb8baIiev6WZ7tE0o"
$url = "https://docs.google.com/spreadsheets/d/$sheetId/edit"
$res = Invoke-WebRequest -Uri $url -UseBasicParsing
$content = $res.Content

$matches = [regex]::Matches($content, 'name":"(.*?)","gid":"(\d+)"')
foreach ($match in $matches) {
    Write-Host "Tab: $($match.Groups[1].Value) - GID: $($match.Groups[2].Value)"
}
