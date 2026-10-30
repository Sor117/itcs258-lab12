# Runs commands in a real conhost PowerShell window, then screenshots that window.
#   -Mode done      : wait until every command finished, capture, close window
#   -Mode port:NNNN : wait until a server listens on NNNN, capture, keep window open
#                     (PID written to tools/steps/<Name>.pid for a later Stop-Shot)
param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$Cwd,
    [Parameter(Mandatory)] [string[]]$Commands,
    [string]$Mode = 'done',
    [int]$Cols = 140,
    [int]$Rows = 46,
    [int]$FontPx = 20,
    [int]$SettleMs = 800,
    [int]$TimeoutSec = 600
)
$ErrorActionPreference = 'Stop'
$tools = $PSScriptRoot
$steps = Join-Path $tools 'steps'
$shots = Join-Path (Split-Path $tools) 'report\shots'
New-Item -ItemType Directory -Force $steps, $shots | Out-Null

$title = "Lab12-$Name"
$flag = Join-Path $steps "$Name.done"
Remove-Item $flag, "$flag.*" -ErrorAction SilentlyContinue

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine(". '$tools\console-setup.ps1' -Cols $Cols -Rows $Rows -FontPx $FontPx")
[void]$sb.AppendLine("`$Host.UI.RawUI.WindowTitle = '$title'")
[void]$sb.AppendLine("New-Item -ItemType File -Force '$flag.ready' | Out-Null")
[void]$sb.AppendLine("while (Test-Path '$flag.ready') { Start-Sleep -Milliseconds 100 }")
[void]$sb.AppendLine("Set-Location -LiteralPath '$Cwd'")
foreach ($c in $Commands) {
    [void]$sb.AppendLine("Show-Cmd @'`n$c`n'@")
    [void]$sb.AppendLine($c)
}
[void]$sb.AppendLine("Show-Cmd ''")
# The flag records whether output scrolled past the top of the window; the
# capturer can then ask the console to scroll back up for a second screenshot.
[void]$sb.AppendLine(@"
`$raw = `$Host.UI.RawUI
Set-Content '$flag' "`$(`$raw.CursorPosition.Y) `$(`$raw.WindowSize.Height)"
while (`$true) {
    if (Test-Path '$flag.top') {
        `$raw.WindowPosition = New-Object Management.Automation.Host.Coordinates 0, 0
        Remove-Item '$flag.top'; New-Item -ItemType File '$flag.topok' | Out-Null
    }
    Start-Sleep -Milliseconds 200
}
"@)
$stepFile = Join-Path $steps "$Name.ps1"
Set-Content -LiteralPath $stepFile -Value $sb.ToString() -Encoding utf8

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Snap {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string cls, string title);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    // Last pixel row containing text (any bright pixel), ignoring the scrollbar strip.
    public static int LastContentRow(byte[] px, int stride, int width, int height, int skipRight) {
        for (int y = height - 1; y >= 0; y--) {
            int row = y * stride;
            for (int x = 0; x < width - skipRight; x++) {
                int i = row + x * 4;
                if (px[i] > 90 || px[i + 1] > 90 || px[i + 2] > 90) return y;
            }
        }
        return height - 1;
    }
}
'@ -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Drawing
[void][Snap]::SetProcessDPIAware()

$proc = Start-Process conhost.exe -PassThru -ArgumentList "`"$((Get-Command pwsh).Source)`" -NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$stepFile`""

$deadline = (Get-Date).AddSeconds($TimeoutSec)
# Grab the window handle while the title is still ours (npm renames the console).
while (-not (Test-Path "$flag.ready")) {
    if ((Get-Date) -gt $deadline) { throw "Timed out waiting for window $title" }
    Start-Sleep -Milliseconds 100
}
for ($i = 0; $i -lt 50; $i++) {
    $hwnd = [Snap]::FindWindow([NullString]::Value, $title)
    if ($hwnd -ne [IntPtr]::Zero) { break }
    Start-Sleep -Milliseconds 100
}
if ($hwnd -eq [IntPtr]::Zero) { throw "Window '$title' not found" }
Remove-Item "$flag.ready"

if ($Mode -eq 'done') {
    while (-not (Test-Path $flag)) {
        if ((Get-Date) -gt $deadline) { throw "Timed out waiting for $Name" }
        Start-Sleep -Milliseconds 300
    }
} elseif ($Mode -like 'port:*') {
    $port = [int]($Mode.Split(':')[1])
    while (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) {
        if ((Get-Date) -gt $deadline) { throw "Timed out waiting for port $port" }
        Start-Sleep -Milliseconds 300
    }
}
Start-Sleep -Milliseconds $SettleMs

[void][Snap]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 300

function Save-Window([string]$png) {
    $r = New-Object Snap+RECT
    [void][Snap]::GetWindowRect($hwnd, [ref]$r)
    $bmp = [System.Drawing.Bitmap]::new($r.R - $r.L, $r.B - $r.T)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $hdc = $g.GetHdc()
    [void][Snap]::PrintWindow($hwnd, $hdc, 2)
    $g.ReleaseHdc($hdc)
    $g.Dispose()

    # Trim the unused console rows below the last line of output.
    $rect = [System.Drawing.Rectangle]::new(0, 0, $bmp.Width, $bmp.Height)
    $data = $bmp.LockBits($rect, 'ReadOnly', [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bytes = [byte[]]::new($data.Stride * $bmp.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($data)
    $last = [Snap]::LastContentRow($bytes, $data.Stride, $bmp.Width, $bmp.Height - 12, 70)
    $cropH = [Math]::Min($bmp.Height, $last + 24)
    $out = $bmp.Clone([System.Drawing.Rectangle]::new(0, 0, $bmp.Width, $cropH), $bmp.PixelFormat)
    $out.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $bmp.Dispose()
    "saved $png"
}

Save-Window (Join-Path $shots "$Name.png")

# Output longer than the window: scroll the console to the top and capture that too.
if ($Mode -eq 'done') {
    $cursorY, $winH = (Get-Content $flag).Split(' ') | ForEach-Object { [int]$_ }
    if ($cursorY -ge $winH) {
        New-Item -ItemType File -Force "$flag.top" | Out-Null
        while (-not (Test-Path "$flag.topok")) { Start-Sleep -Milliseconds 200 }
        Start-Sleep -Milliseconds 500
        Save-Window (Join-Path $shots "$Name-top.png")
        Remove-Item "$flag.topok"
    }
    & taskkill.exe /PID $proc.Id /T /F | Out-Null
} else {
    Set-Content (Join-Path $steps "$Name.pid") $proc.Id
    Set-Content (Join-Path $steps "$Name.hwnd") ([int64]$hwnd)
}

