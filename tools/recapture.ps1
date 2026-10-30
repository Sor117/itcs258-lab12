# Screenshot a window that shot.ps1 left running (-Mode port:NNNN), e.g. to show
# a server's request log after the requests were sent from another window.
param(
    [Parameter(Mandatory)] [string]$Name,
    [Parameter(Mandatory)] [string]$OutName,
    [switch]$Close
)
$ErrorActionPreference = 'Stop'
$steps = Join-Path $PSScriptRoot 'steps'
$shots = Join-Path (Split-Path $PSScriptRoot) 'report\shots'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Snap2 {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
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
[void][Snap2]::SetProcessDPIAware()
$hwnd = [IntPtr][int64](Get-Content (Join-Path $steps "$Name.hwnd"))
[void][Snap2]::SetForegroundWindow($hwnd)
Start-Sleep -Milliseconds 500
$r = New-Object Snap2+RECT
[void][Snap2]::GetWindowRect($hwnd, [ref]$r)
$bmp = [System.Drawing.Bitmap]::new($r.R - $r.L, $r.B - $r.T)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[void][Snap2]::PrintWindow($hwnd, $hdc, 2)
$g.ReleaseHdc($hdc); $g.Dispose()
$rect = [System.Drawing.Rectangle]::new(0, 0, $bmp.Width, $bmp.Height)
$data = $bmp.LockBits($rect, 'ReadOnly', [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bytes = [byte[]]::new($data.Stride * $bmp.Height)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$bmp.UnlockBits($data)
$last = [Snap2]::LastContentRow($bytes, $data.Stride, $bmp.Width, $bmp.Height - 12, 70)
$out = $bmp.Clone([System.Drawing.Rectangle]::new(0, 0, $bmp.Width, [Math]::Min($bmp.Height, $last + 24)), $bmp.PixelFormat)
$png = Join-Path $shots "$OutName.png"
$out.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose(); $bmp.Dispose()
"saved $png"
if ($Close) { & taskkill.exe /PID (Get-Content (Join-Path $steps "$Name.pid")) /T /F | Out-Null }
