$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$outDir = "C:\Users\arman\Downloads\Projects\DevVault\docs\screenshots"
$tempBase = "$env:TEMP\chrome_shots"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$viewports = @(
    # Core 8 Responsive Viewports
    @{ Name = "desktop-1440"; Width = 1440; Height = 900; Url = "http://localhost:3000" },
    @{ Name = "desktop-1280"; Width = 1280; Height = 800; Url = "http://localhost:3000" },
    @{ Name = "desktop-1024"; Width = 1024; Height = 768; Url = "http://localhost:3000" },
    @{ Name = "tablet-768";   Width = 768;  Height = 1024; Url = "http://localhost:3000" },
    @{ Name = "mobile-430";   Width = 430;  Height = 932; Url = "http://localhost:3000" },
    @{ Name = "mobile-390";   Width = 390;  Height = 844; Url = "http://localhost:3000" },
    @{ Name = "mobile-375";   Width = 375;  Height = 812; Url = "http://localhost:3000" },
    @{ Name = "mobile-360";   Width = 360;  Height = 740; Url = "http://localhost:3000" },

    # Dedicated Route Views
    @{ Name = "desktop-library"; Width = 1440; Height = 900; Url = "http://localhost:3000?tab=library" },
    @{ Name = "mobile-library";  Width = 375;  Height = 812; Url = "http://localhost:3000?tab=library" },
    @{ Name = "desktop-explore"; Width = 1440; Height = 900; Url = "http://localhost:3000?tab=explore" },
    @{ Name = "desktop-collections"; Width = 1440; Height = 900; Url = "http://localhost:3000?tab=collections" },
    @{ Name = "desktop-activity"; Width = 1440; Height = 900; Url = "http://localhost:3000?tab=activity" },
    @{ Name = "desktop-settings"; Width = 1440; Height = 900; Url = "http://localhost:3000?tab=settings" },

    # Themes & Modals
    @{ Name = "desktop-light-1440"; Width = 1440; Height = 900; Url = "http://localhost:3000?theme=light" },
    @{ Name = "desktop-dark-1440";  Width = 1440; Height = 900; Url = "http://localhost:3000?theme=dark" },
    @{ Name = "mobile-light-375";   Width = 375;  Height = 812; Url = "http://localhost:3000?theme=light" },
    @{ Name = "modal-desktop";      Width = 1440; Height = 900; Url = "http://localhost:3000?modal=capture" },
    @{ Name = "modal-mobile";       Width = 375;  Height = 812; Url = "http://localhost:3000?modal=capture" }
)

foreach ($vp in $viewports) {
    $outFile = "$outDir\$($vp.Name).png"
    $userDir = "$tempBase\_$($vp.Name)"
    Write-Host "Capturing $($vp.Name) ($($vp.Width)x$($vp.Height)) from $($vp.Url)..."
    
    $args = @(
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--user-data-dir=$userDir",
        "--window-size=$($vp.Width),$($vp.Height)",
        "--virtual-time-budget=2500",
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
