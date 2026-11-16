$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "C:\Users\arman\Downloads\Projects\DevVault\docs\screenshots"
$tempBase = "$env:TEMP\chrome_shots"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$viewports = @(
    @{ Name = "desktop-1440"; Width = 1440; Height = 900; Url = "http://localhost:3000" },
    @{ Name = "desktop-1280"; Width = 1280; Height = 800; Url = "http://localhost:3000" },
    @{ Name = "desktop-1024"; Width = 1024; Height = 768; Url = "http://localhost:3000" },
    @{ Name = "tablet-768";   Width = 768;  Height = 1024; Url = "http://localhost:3000" },
    @{ Name = "mobile-430";   Width = 430;  Height = 932; Url = "http://localhost:3000" },
    @{ Name = "mobile-390";   Width = 390;  Height = 844; Url = "http://localhost:3000" },
    @{ Name = "mobile-375";   Width = 375;  Height = 812; Url = "http://localhost:3000" },
    @{ Name = "mobile-360";   Width = 360;  Height = 740; Url = "http://localhost:3000" },
    @{ Name = "desktop-light-1440"; Width = 1440; Height = 900; Url = "http://localhost:3000?theme=light" },
    @{ Name = "mobile-light-375";   Width = 375;  Height = 812; Url = "http://localhost:3000?theme=light" }
)

foreach ($vp in $viewports) {
    $outFile = "$outDir\$($vp.Name).png"
    $userDir = "$tempBase\_$($vp.Name)"
    Write-Host "Capturing $($vp.Name) ($($vp.Width)x$($vp.Height))..."
    
    $args = @(
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--user-data-dir=$userDir",
        "--window-size=$($vp.Width),$($vp.Height)",
        "--screenshot=$outFile",
        $vp.Url
    )
    Start-Process -FilePath $chrome -ArgumentList $args -Wait
    if (Test-Path $userDir) {
        Remove-Item $userDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "All screenshots captured successfully!"
Get-ChildItem $outDir | Select-Object Name, Length
