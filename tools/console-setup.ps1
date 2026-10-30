# Dot-sourced at the top of every generated step script.
# Sets a readable font and window size for the conhost window being screenshotted.
param([int]$Cols = 140, [int]$Rows = 46, [int]$FontPx = 20)

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ConFont {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CONSOLE_FONT_INFOEX {
        public uint cbSize; public uint nFont; public short X; public short Y;
        public int FontFamily; public int FontWeight;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string FaceName;
    }
    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr GetStdHandle(int h);
    [DllImport("kernel32.dll")] static extern bool GetConsoleMode(IntPtr h, out uint m);
    [DllImport("kernel32.dll")] static extern bool SetConsoleMode(IntPtr h, uint m);
    // A click in a QuickEdit console starts a selection and pauses all output.
    public static void NoQuickEdit() {
        IntPtr h = GetStdHandle(-10); uint m;
        GetConsoleMode(h, out m);
        SetConsoleMode(h, (m & ~0x40u) | 0x80u);
    }
    // Let child processes (uvicorn, npm) render ANSI colors instead of raw escapes.
    public static void EnableVT() {
        IntPtr h = GetStdHandle(-11); uint m;
        GetConsoleMode(h, out m);
        SetConsoleMode(h, m | 0x0004u);
    }
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool SetCurrentConsoleFontEx(IntPtr h, bool max, ref CONSOLE_FONT_INFOEX f);
    public static bool Set(string face, short px) {
        var f = new CONSOLE_FONT_INFOEX();
        f.cbSize = (uint)Marshal.SizeOf(f); f.X = 0; f.Y = px;
        f.FontFamily = 54; f.FontWeight = 400; f.FaceName = face;
        return SetCurrentConsoleFontEx(GetStdHandle(-11), false, ref f);
    }
}
'@
[void][ConFont]::Set('Consolas', [int16]$FontPx)
[ConFont]::NoQuickEdit()
[ConFont]::EnableVT()

$raw = $Host.UI.RawUI
$max = $raw.MaxPhysicalWindowSize
$w = [Math]::Min($Cols, $max.Width)
$h = [Math]::Min($Rows, $max.Height)
try { $raw.BufferSize = New-Object Management.Automation.Host.Size ([Math]::Max($w, $raw.WindowSize.Width)), 3000 } catch {}
try { $raw.WindowSize = New-Object Management.Automation.Host.Size $w, $h } catch {}
try { $raw.BufferSize = New-Object Management.Automation.Host.Size $w, 3000 } catch {}
$raw.BackgroundColor = 'Black'
$raw.ForegroundColor = 'Gray'
Clear-Host

function Show-Cmd([string]$c) {
    if ($Host.UI.RawUI.CursorPosition.X -ne 0) { Write-Host '' }
    Write-Host -NoNewline -ForegroundColor Gray "PS $((Get-Location).Path)> "
    Write-Host -ForegroundColor White $c
}
