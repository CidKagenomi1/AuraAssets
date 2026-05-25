$content = Get-Content -Path "d:\Data Project\Personal Project\AuraAssets\index.html" -Raw
$content = [regex]::Replace($content, "(?s)<!--.*?-->", "")

$matches = [regex]::Matches($content, "(?is)<(div|section|aside|main)\b[^>]*>|</(div|section|aside|main)>")

$stack = @()

# We will match tag indices to line numbers
$lines = Get-Content -Path "d:\Data Project\Personal Project\AuraAssets\index.html"
function Get-LineNumber($index) {
    $sub = $content.Substring(0, $index)
    return ([regex]::Matches($sub, "`n")).Count + 1
}

foreach ($m in $matches) {
    $text = $m.Value
    $line = Get-LineNumber($m.Index)
    
    if ($text -match "^</") {
        $tag = $text -replace "^</|>$", ""
        if ($stack.Count -gt 0) {
            $last = $stack[-1]
            if ($last.tag -eq $tag) {
                Write-Output "[$line] CLOSE: </$tag> (matched <$($last.tag)$($last.info)> from line $($last.line))"
                if ($stack.Count -eq 1) { $stack = @() }
                else { $stack = $stack[0..($stack.Count - 2)] }
            }
            else {
                Write-Output "[$line] MISMATCH: Found </$tag> but expected </$($last.tag)> (opened on line $($last.line))"
            }
        }
        else {
            Write-Output "[$line] ERROR: Extra close tag </$tag>"
        }
    }
    else {
        if ($text -match "/>$") { continue }
        $tag = [regex]::Match($text, "(?i)<(div|section|aside|main)").Groups[1].Value
        $info = ""
        if ($text -match 'id="([^"]+)"') { $info = " id=`"$($Matches[1])`"" }
        if ($text -match 'class="([^"]+)"') { $info += " class=`"$($Matches[1])`"" }
        
        $stack += @{ tag = $tag; line = $line; info = $info }
        Write-Output "[$line] OPEN: <$tag$info>"
    }
}
