# serve.ps1
# A zero-dependency web server for running the Business Tycoon project.

$localPath = Get-Item .
$port = 8080
$listener = $null

# Find an available port
while ($port -lt 8100) {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$port/")
        $listener.Start()
        break
    } catch {
        $listener = $null
        $port++
    }
}

if ($null -eq $listener) {
    Write-Error "Could not start server. No available ports found."
    exit 1
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  AuraAssets Server Running Successfully!" -ForegroundColor Green
Write-Host "  Access the project at: http://localhost:$port/" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Green

# Mime types mapping
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/") {
            $urlPath = "/index.html"
        }

        # Decode URL path (like %20 to spaces)
        $decodedPath = [System.Uri]::UnescapeDataString($urlPath)
        # Convert path separators and trim leading separator
        $cleanPath = $decodedPath.Replace('/', '\').TrimStart('\')
        # Combine to get local file path
        $filePath = [System.IO.Path]::Combine($localPath.FullName, $cleanPath)

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = $mimeTypes[$ext]
            if ($null -eq $mime) {
                $mime = "application/octet-stream"
            }

            $response.ContentType = $mime
            $response.StatusCode = 200

            # Read bytes and write to output stream
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $decodedPath")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }

        Write-Host "$($request.HttpMethod) $($request.Url.PathAndQuery) - $($response.StatusCode)"
        $response.Close()
    }
} catch {
    Write-Host "Server stopped or encountered an error: $_" -ForegroundColor Red
} finally {
    if ($null -ne $listener) {
        $listener.Stop()
        $listener.Close()
    }
}
