#requires -Version 5.1
<#
.SYNOPSIS
    ArcadeOps Control Tower - Pre-Demo Check

.DESCRIPTION
    One-command pre-flight verification to run 5 minutes before the jury
    demo or before recording the video. Exits 0 with global verdict
    "READY FOR DEMO" if the only critical check (end-to-end live run via
    /api/runner-proxy) PASSes. WARN/SKIP on the runner-direct probes is
    expected behavior on networks where FortiGuard / corporate firewall
    blocks raw IP egress - the proxy path is the demo path and proves
    the rest by transitivity.

    The script never reads, prints or sends any secret. The end-to-end
    live run goes through the Vercel proxy which injects the
    x-runner-secret server-side.

.NOTES
    Compatible with PowerShell 5.1 and PowerShell 7+.
    Tested on Windows 10 / Windows 11.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Constants - all public, zero secrets.
# ---------------------------------------------------------------------------

$VercelAppUrl     = 'https://arcadeops-control-tower-hackathon.vercel.app/control-tower'
$VercelProxyUrl   = 'https://arcadeops-control-tower-hackathon.vercel.app/api/runner-proxy'
$VultrHealthUrl   = 'http://136.244.89.159/health'
$VultrRunUrl      = 'http://136.244.89.159/run-agent'
$E2ePayload       = '{"mission":"Health check ping for pre-demo verification"}'
$ShortTimeoutSec  = 3
$E2eTimeoutSec    = 60

# ---------------------------------------------------------------------------
# Result table - filled in as we go, rendered at the end.
# ---------------------------------------------------------------------------

$results = @()

function Add-Result {
    param(
        [Parameter(Mandatory)] [string] $Name,
        [Parameter(Mandatory)] [ValidateSet('PASS','WARN','SKIP','FAIL')] [string] $Status,
        [string] $Detail = ''
    )
    $script:results += [pscustomobject]@{
        Name   = $Name
        Status = $Status
        Detail = $Detail
    }
}

function Write-Color {
    param(
        [Parameter(Mandatory)] [string] $Text,
        [Parameter(Mandatory)] [ValidateSet('PASS','WARN','SKIP','FAIL','INFO','HEAD')] [string] $Kind
    )
    $color = switch ($Kind) {
        'PASS' { 'Green'  }
        'WARN' { 'Yellow' }
        'SKIP' { 'Yellow' }
        'FAIL' { 'Red'    }
        'INFO' { 'Cyan'   }
        'HEAD' { 'White'  }
    }
    Write-Host $Text -ForegroundColor $color
}

function Test-HttpEndpoint {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $Url,
        [Parameter(Mandatory)] [ValidateSet('GET','POST')] [string] $Method,
        [int] $TimeoutSec = $ShortTimeoutSec,
        [string] $Body = $null,
        [hashtable] $Headers = $null
    )
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $params = @{
            Uri             = $Url
            Method          = $Method
            TimeoutSec      = $TimeoutSec
            UseBasicParsing = $true
            ErrorAction     = 'Stop'
        }
        if ($Body)    { $params['Body']        = $Body }
        if ($Headers) { $params['Headers']     = $Headers }
        if ($Method -eq 'POST' -and -not ($Headers -and $Headers.ContainsKey('Content-Type'))) {
            $params['ContentType'] = 'application/json'
        }
        $resp = Invoke-WebRequest @params
        $sw.Stop()
        return [pscustomobject]@{
            Success    = $true
            StatusCode = [int] $resp.StatusCode
            Content    = $resp.Content
            ElapsedMs  = [int] $sw.Elapsed.TotalMilliseconds
            Error      = $null
        }
    } catch {
        $sw.Stop()
        $statusCode = 0
        $bodyText   = $null
        if ($_.Exception.Response) {
            try { $statusCode = [int] $_.Exception.Response.StatusCode } catch {}
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $bodyText = $reader.ReadToEnd()
                }
            } catch {}
        }
        return [pscustomobject]@{
            Success    = $false
            StatusCode = $statusCode
            Content    = $bodyText
            ElapsedMs  = [int] $sw.Elapsed.TotalMilliseconds
            Error      = $_.Exception.Message
        }
    }
}

function Test-IsLocalNetworkBlock {
    param([string] $ErrorMessage, [int] $StatusCode)
    if (-not $ErrorMessage) { return $false }
    $patterns = @(
        'FortiGuard', 'fortinet', 'access denied', 'category.*blocked',
        'unable to connect', 'could not establish trust', 'remote name could not be resolved',
        'operation has timed out', 'unable to read data from the transport connection',
        'no such host is known', 'connection.*refused', 'request timed out'
    )
    foreach ($p in $patterns) {
        if ($ErrorMessage -match $p) { return $true }
    }
    if ($StatusCode -eq 403 -and $ErrorMessage -match '403') { return $true }
    return $false
}

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

$timestampUtc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss')
Write-Color '=============================================================' 'HEAD'
Write-Color ' ArcadeOps Control Tower - Pre-Demo Check'                     'HEAD'
Write-Color " UTC: $timestampUtc"                                            'INFO'
Write-Color '=============================================================' 'HEAD'
Write-Host ''

# ---------------------------------------------------------------------------
# Check 1: Vercel app /control-tower
# ---------------------------------------------------------------------------

Write-Color '[1/5] GET Vercel app /control-tower ...' 'INFO'
$r1 = Test-HttpEndpoint -Url $VercelAppUrl -Method GET -TimeoutSec $ShortTimeoutSec
$r1Detail = ''
if ($r1.Success -and $r1.StatusCode -eq 200) {
    if ($r1.ElapsedMs -lt 2000) {
        $status = 'PASS'
        $r1Detail = "$($r1.ElapsedMs) ms"
    } elseif ($r1.ElapsedMs -lt 5000) {
        $status = 'WARN'
        $r1Detail = "$($r1.ElapsedMs) ms (slower than 2s threshold)"
    } else {
        $status = 'FAIL'
        $r1Detail = "$($r1.ElapsedMs) ms (above 5s)"
    }
} else {
    $status = 'FAIL'
    $r1Detail = "HTTP $($r1.StatusCode) $($r1.Error)"
}
Add-Result -Name 'Vercel app /control-tower' -Status $status -Detail $r1Detail
Write-Color "    -> $status ($r1Detail)" $status
Write-Host ''

# ---------------------------------------------------------------------------
# Check 2: Vercel proxy GET (descriptor)
# ---------------------------------------------------------------------------

Write-Color '[2/5] GET Vercel proxy /api/runner-proxy ...' 'INFO'
$r2 = Test-HttpEndpoint -Url $VercelProxyUrl -Method GET -TimeoutSec $ShortTimeoutSec
$r2Detail = ''
if ($r2.Success -and $r2.StatusCode -eq 200 -and $r2.Content) {
    $proxyOk = $false
    try {
        $j = $r2.Content | ConvertFrom-Json
        if ($j.proxy -eq 'ok') { $proxyOk = $true }
    } catch {}
    if ($proxyOk) {
        $status = 'PASS'
        $r2Detail = "$($r2.ElapsedMs) ms, proxy=ok"
    } else {
        $status = 'WARN'
        $r2Detail = "200 but JSON shape unexpected"
    }
} else {
    $status = 'FAIL'
    $r2Detail = "HTTP $($r2.StatusCode) $($r2.Error)"
}
Add-Result -Name 'Vercel proxy GET' -Status $status -Detail $r2Detail
Write-Color "    -> $status ($r2Detail)" $status
Write-Host ''

# ---------------------------------------------------------------------------
# Check 3: Vultr runner /health (direct IP)
# ---------------------------------------------------------------------------

Write-Color '[3/5] GET Vultr runner http://136.244.89.159/health ...' 'INFO'
$r3 = Test-HttpEndpoint -Url $VultrHealthUrl -Method GET -TimeoutSec $ShortTimeoutSec
$r3Detail = ''
if ($r3.Success -and $r3.StatusCode -eq 200) {
    $status = 'PASS'
    $r3Detail = "$($r3.ElapsedMs) ms"
} elseif (Test-IsLocalNetworkBlock -ErrorMessage $r3.Error -StatusCode $r3.StatusCode) {
    $status = 'WARN'
    $r3Detail = 'direct Vultr IP blocked locally (likely FortiGuard / corporate firewall) - the proxy path will still work for the demo'
} else {
    $status = 'FAIL'
    $r3Detail = "HTTP $($r3.StatusCode) $($r3.Error)"
}
Add-Result -Name 'Vultr runner /health' -Status $status -Detail $r3Detail
Write-Color "    -> $status ($r3Detail)" $status
Write-Host ''

# ---------------------------------------------------------------------------
# Check 4: runner secret enforcement (no header) - expect 401, 405, or local block
# ---------------------------------------------------------------------------

Write-Color '[4/5] GET Vultr runner /run-agent without secret (enforce check) ...' 'INFO'
$r4 = Test-HttpEndpoint -Url $VultrRunUrl -Method GET -TimeoutSec $ShortTimeoutSec
$r4Detail = ''
if (Test-IsLocalNetworkBlock -ErrorMessage $r4.Error -StatusCode $r4.StatusCode) {
    $status = 'SKIP'
    $r4Detail = 'local network blocked - cannot probe the runner directly from here'
} elseif ($r4.Success -and $r4.StatusCode -eq 200) {
    $status = 'FAIL'
    $r4Detail = '200 from /run-agent without x-runner-secret - kill-switch may be off (RUNNER_REQUIRE_SECRET=0)'
} elseif ($r4.StatusCode -eq 401 -or $r4.StatusCode -eq 403) {
    $status = 'PASS'
    $r4Detail = "HTTP $($r4.StatusCode) (secret enforced)"
} elseif ($r4.StatusCode -eq 405) {
    $status = 'PASS'
    $r4Detail = '405 (POST-only - acceptable; secret middleware fires on POST)'
} else {
    $status = 'WARN'
    $r4Detail = "HTTP $($r4.StatusCode) $($r4.Error)"
}
Add-Result -Name 'Runner secret enforced' -Status $status -Detail $r4Detail
Write-Color "    -> $status ($r4Detail)" $status
Write-Host ''

# ---------------------------------------------------------------------------
# Check 5: end-to-end live Gemini run via the proxy (the only critical check)
# ---------------------------------------------------------------------------

Write-Color "[5/5] POST end-to-end live run via /api/runner-proxy (this can take up to ${E2eTimeoutSec}s) ..." 'INFO'
$r5 = Test-HttpEndpoint -Url $VercelProxyUrl -Method POST -TimeoutSec $E2eTimeoutSec -Body $E2ePayload
$r5Detail   = ''
$r5Critical = $true   # this one is the gate for GLOBAL VERDICT
if ($r5.Success -and $r5.StatusCode -eq 200 -and $r5.Content) {
    try {
        $body = $r5.Content | ConvertFrom-Json
    } catch {
        $body = $null
    }
    if ($null -ne $body) {
        $isMocked = $body.is_mocked
        $tokens   = $body.tokens_used
        $cost     = $body.cost_usd
        $model    = $body.model
        $runner   = $body.runner
        $verdict  = $null
        if ($body.verdict) {
            $verdict = $body.verdict.verdict
            if (-not $verdict) { $verdict = $body.verdict }
        }

        $isLive       = ($isMocked -eq $false)
        $hasTokens    = ($tokens -and ($tokens -gt 0))
        $hasCost      = ($null -ne $cost) -and ($cost -ge 0)

        if ($isLive -and $hasTokens -and $hasCost) {
            $invariant  = [System.Globalization.CultureInfo]::InvariantCulture
            $elapsedSec = ([double]($r5.ElapsedMs / 1000.0)).ToString('0.0', $invariant)
            $costStr    = ([double] $cost).ToString('0.000000', $invariant)
            $r5Detail   = "${elapsedSec}s, $tokens tokens, `$$costStr, $verdict, model=$model, runner=$runner"
            $status     = 'PASS'
        } else {
            $status   = 'FAIL'
            $r5Detail = "200 but live invariants not met (is_mocked=$isMocked tokens=$tokens cost=$cost)"
        }
    } else {
        $status = 'FAIL'
        $r5Detail = '200 but body is not parseable JSON'
    }
} else {
    $status = 'FAIL'
    $r5Detail = "HTTP $($r5.StatusCode) $($r5.Error)"
}
Add-Result -Name 'End-to-end live run' -Status $status -Detail $r5Detail
Write-Color "    -> $status ($r5Detail)" $status
Write-Host ''

# ---------------------------------------------------------------------------
# Summary table
# ---------------------------------------------------------------------------

Write-Color '=============================================================' 'HEAD'
Write-Color ' PRE-DEMO CHECK SUMMARY'                                        'HEAD'
Write-Color '=============================================================' 'HEAD'

$nameWidth = ($results | ForEach-Object { $_.Name.Length } | Measure-Object -Maximum).Maximum
if (-not $nameWidth -or $nameWidth -lt 20) { $nameWidth = 22 }

foreach ($r in $results) {
    $padded = $r.Name.PadRight($nameWidth)
    $line   = "{0}  [{1}]  {2}" -f $padded, $r.Status, $r.Detail
    Write-Color $line $r.Status
}

Write-Color '=============================================================' 'HEAD'

# ---------------------------------------------------------------------------
# Global verdict - end-to-end live run is the only gate.
# ---------------------------------------------------------------------------

$e2e = $results | Where-Object { $_.Name -eq 'End-to-end live run' } | Select-Object -First 1
$ready = ($null -ne $e2e -and $e2e.Status -eq 'PASS')

# Defensive: any FAIL on the public-facing Vercel surfaces (checks 1, 2)
# also breaks the demo - mark NOT READY in that case even if check 5 passed.
$publicFailNames = @('Vercel app /control-tower', 'Vercel proxy GET')
$publicFailed = $results | Where-Object { $publicFailNames -contains $_.Name -and $_.Status -eq 'FAIL' }
if ($publicFailed) { $ready = $false }

if ($ready) {
    Write-Color ' GLOBAL VERDICT: READY FOR DEMO' 'PASS'
} else {
    Write-Color ' GLOBAL VERDICT: NOT READY' 'FAIL'
    Write-Color ' (the end-to-end live run via /api/runner-proxy must PASS for the demo to be safe)' 'INFO'
}
Write-Color '=============================================================' 'HEAD'
Write-Host ''

if ($ready) { exit 0 } else { exit 1 }
