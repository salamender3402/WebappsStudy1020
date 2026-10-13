$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')
$listener.Start()

try {
    Start-Process 'chrome.exe' -ArgumentList '-incognito http://localhost:8000/' -ErrorAction Stop
} catch {
    try {
        Start-Process 'msedge.exe' -ArgumentList '-inprivate http://localhost:8000/' -ErrorAction Stop
    } catch {
        Start-Process 'http://localhost:8000/'
    }
}
Write-Host '[서버 가동 완료] http://localhost:8000 (이 창을 닫으면 서버가 종료됩니다)' -ForegroundColor Green

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $reqPath = $ctx.Request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($reqPath)) {
            $reqPath = 'index.html'
        }
        $localPath = Join-Path $rootDir $reqPath
        if (Test-Path $localPath -PathType Container) {
            $localPath = Join-Path $localPath 'index.html'
        }

        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.js'   { 'application/javascript; charset=utf-8' }
                '.css'  { 'text/css; charset=utf-8' }
                '.json' { 'application/json; charset=utf-8' }
                '.png'  { 'image/png' }
                '.svg'  { 'image/svg+xml' }
                '.ico'  { 'image/x-icon' }
                default { 'application/octet-stream' }
            }
            $ctx.Response.ContentType = $mime
            $ctx.Response.ContentLength64 = $bytes.Length
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $ctx.Response.StatusCode = 404
        }
        $ctx.Response.OutputStream.Close()
    } catch {
        # continue loop
    }
}
