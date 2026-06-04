[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=sustentabilidade%20Paranagu%C3%A1%20OR%20meio%20ambiente%20Paranagu%C3%A1&mode=artlist&format=json&maxrecords=3&sort=datedesc'
try {
    $res = Invoke-RestMethod -Uri $url -TimeoutSec 20
    $res | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 gdelt_output.json
    Write-Output 'OK'
} catch {
    Write-Output 'ERROR' 
    Write-Output $_.Exception.Message
}
