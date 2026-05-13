#Requires -Version 7.0
<#
.SYNOPSIS
    Provisionne une VM Vultr Cloud Compute (runner hackathon) via l'API v2.

.DESCRIPTION
    Alternative automatisée aux étapes 1-3 du runbook DEPLOYMENT_VULTR.md.
    Idempotent : ré-exécution sans -Force ne crée pas de doublon.
    Commentaires en français ; identifiants de code en anglais.
#>
[CmdletBinding()]
param(
    [string]$ApiKey = $env:VULTR_API_KEY,
    [string]$Region = "",
    [string]$Plan = "",
    [string]$Hostname = "arcadeops-runner",
    [string]$SshKeyPath = "",
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$script:VultrBaseUrl = "https://api.vultr.com/v2"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:StatePath = Join-Path $script:RepoRoot ".vultr-state.json"
$script:DefaultRegionChain = @("mil", "fra", "cdg", "ams")

function Test-ApiKey {
    param([string]$Key)
    if ([string]::IsNullOrWhiteSpace($Key)) {
        Write-Host "ERREUR : VULTR_API_KEY est vide. Créez une clé API Vultr :" -ForegroundColor Red
        Write-Host "  https://my.vultr.com/settings/#settingsapi" -ForegroundColor Yellow
        exit 1
    }
}

function Invoke-VultrApi {
    param(
        [ValidateSet("GET", "POST", "DELETE")]
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [int]$MaxAttempts = 3
    )

    $uri = "$script:VultrBaseUrl$Path"
    $headers = @{
        Authorization = "Bearer $script:EffectiveApiKey"
        "Content-Type" = "application/json"
    }

    $attempt = 0
    while ($true) {
        $attempt++
        try {
            $webRequestParams = @{
                Uri                 = $uri
                Method              = $Method
                Headers             = $headers
                SkipHttpErrorCheck  = $true
            }
            if ($null -ne $Body) {
                $webRequestParams.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
            }

            $response = Invoke-WebRequest @webRequestParams
            $status = [int]$response.StatusCode

            if ($status -ge 500 -and $status -le 599) {
                if ($attempt -ge $MaxAttempts) {
                    throw "Vultr API $Method $Path failed after $MaxAttempts attempts (HTTP $status)."
                }
                Write-Host "  (tentative $attempt/$MaxAttempts : HTTP $status, nouvel essai dans 2s...)" -ForegroundColor Yellow
                Start-Sleep -Seconds 2
                continue
            }

            if ($status -lt 200 -or $status -ge 300) {
                $errBody = $response.Content
                Write-Host "ERREUR API Vultr : $Method $Path -> HTTP $status" -ForegroundColor Red
                if ($errBody) { Write-Host $errBody -ForegroundColor Red }
                Write-Host "Pistes : 401 -> clé API ; 400 -> région/plan indisponible (fallback régions) ; 503 -> incident Vultr." -ForegroundColor Yellow
                throw "Vultr API error HTTP $status"
            }

            if ([string]::IsNullOrWhiteSpace($response.Content)) {
                return $null
            }
            return $response.Content | ConvertFrom-Json -Depth 20
        }
        catch {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                $code = [int]$_.Exception.Response.StatusCode
                if ($code -ge 500 -and $code -le 599 -and $attempt -lt $MaxAttempts) {
                    Write-Host "  (tentative $attempt/$MaxAttempts : $code, nouvel essai dans 2s...)" -ForegroundColor Yellow
                    Start-Sleep -Seconds 2
                    continue
                }
            }
            Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
            throw
        }
    }
}

function Get-PlanLocations {
    param([object]$PlansPayload, [string]$PlanId)

    # Réponse Vultr : plans peut être un tableau ou un objet indexé par id.
    $candidates = @()

    if ($null -eq $PlansPayload) { return @() }

    if ($PlansPayload.PSObject.Properties.Name -contains "plans") {
        $p = $PlansPayload.plans
    }
    else {
        $p = $PlansPayload
    }

    if ($null -eq $p) { return @() }

    if ($p -is [System.Collections.IEnumerable] -and $p -isnot [string] -and $p -isnot [System.Collections.IDictionary]) {
        foreach ($item in $p) {
            if ($item.id -eq $PlanId) {
                $candidates = @($item.locations)
                break
            }
        }
    }
    else {
        $prop = $p.PSObject.Properties[$PlanId]
        if ($prop) {
            $planObj = $prop.Value
            if ($planObj.locations) {
                $candidates = @($planObj.locations)
            }
        }
    }

    if ($candidates.Count -eq 0 -and $p.PSObject.Properties) {
        foreach ($prop in $p.PSObject.Properties) {
            $item = $prop.Value
            if ($item -and $item.id -eq $PlanId -and $item.locations) {
                $candidates = @($item.locations)
                break
            }
        }
    }

    return @($candidates)
}

function Build-RegionOrder {
    param([string]$Preferred, [string[]]$Chain)

    $order = [System.Collections.Generic.List[string]]::new()
    $seen = @{}

    function Add-Unique([string]$R) {
        if ([string]::IsNullOrWhiteSpace($R)) { return }
        $k = $R.Trim().ToLowerInvariant()
        if (-not $seen.ContainsKey($k)) {
            $seen[$k] = $true
            $order.Add($k) | Out-Null
        }
    }

    Add-Unique $Preferred
    foreach ($r in $Chain) { Add-Unique $r }

    return , $order.ToArray()
}

function Find-RegionWithFallback {
    param(
        [string]$Preferred,
        [string]$Plan
    )

    $chain = Build-RegionOrder -Preferred $Preferred -Chain $script:DefaultRegionChain
    $plansPayload = Invoke-VultrApi -Method "GET" -Path "/plans?type=vc2"
    $locations = Get-PlanLocations -PlansPayload $plansPayload -PlanId $Plan

    if ($locations.Count -eq 0) {
        throw "Plan '$Plan' introuvable ou sans champ 'locations' dans GET /plans?type=vc2."
    }

    $regionsPayload = Invoke-VultrApi -Method "GET" -Path "/regions"
    $regionMeta = @{}
    $regionList = @()
    if ($regionsPayload.regions) {
        $regionList = @($regionsPayload.regions)
    }
    foreach ($r in $regionList) {
        if ($r.id) { $regionMeta[$r.id] = $r }
    }

    foreach ($rid in $chain) {
        if ($locations -contains $rid) {
            $meta = $regionMeta[$rid]
            $label = if ($meta) {
                $city = $meta.city
                $country = $meta.country
                if ($city -and $country) { "$city, $country" } elseif ($city) { $city } else { $rid }
            }
            else { $rid }
            return @{ Id = $rid; Label = $label }
        }
    }

    throw "Aucune région disponible parmi $($chain -join ', ') pour le plan '$Plan'."
}

function Find-OsId {
    param([string]$Name)

    $osPayload = Invoke-VultrApi -Method "GET" -Path "/os"
    $list = @()
    if ($osPayload.os) { $list = @($osPayload.os) }

    foreach ($o in $list) {
        if ($o.name -eq $Name) {
            return [int]$o.id
        }
    }

    throw "OS '$Name' introuvable dans GET /os."
}

function Resolve-SshPublicKey {
    param([string]$ExplicitPath)

    $candidates = [System.Collections.Generic.List[string]]::new()
    if (-not [string]::IsNullOrWhiteSpace($ExplicitPath)) {
        $candidates.Add((Resolve-Path $ExplicitPath).Path) | Out-Null
    }
    else {
        $homeSsh = Join-Path $env:USERPROFILE ".ssh"
        $candidates.Add((Join-Path $homeSsh "id_ed25519.pub")) | Out-Null
        $candidates.Add((Join-Path $homeSsh "id_rsa.pub")) | Out-Null
    }

    foreach ($p in $candidates) {
        if (Test-Path -LiteralPath $p) {
            $content = (Get-Content -LiteralPath $p -Raw).Trim()
            if (-not [string]::IsNullOrWhiteSpace($content)) {
                return @{ Path = $p; Content = $content }
            }
        }
    }

    throw "Clé publique SSH introuvable. Placez id_ed25519.pub ou id_rsa.pub dans ~/.ssh/ ou passez -SshKeyPath."
}

function Get-SshKeyFingerprintPreview {
    param([string]$PublicKeyLine)
    $parts = $PublicKeyLine -split "\s+", 3
    if ($parts.Length -ge 2) {
        $blob = $parts[1]
        $take = [Math]::Min(20, $blob.Length)
        return $blob.Substring(0, $take)
    }
    return ($PublicKeyLine.Substring(0, [Math]::Min(20, $PublicKeyLine.Length)))
}

function Ensure-VultrSshKey {
    param(
        [string]$Name,
        [string]$PublicKey,
        [switch]$DryRun
    )

    $keysPayload = Invoke-VultrApi -Method "GET" -Path "/ssh-keys"
    $keys = @()
    if ($keysPayload.ssh_keys) { $keys = @($keysPayload.ssh_keys) }

    foreach ($k in $keys) {
        if ($k.name -eq $Name) {
            return @{ Id = $k.id; Created = $false }
        }
    }

    if ($DryRun) {
        Write-Host "[DRY-RUN] POST /ssh-keys serait exécuté (name=$Name)." -ForegroundColor Yellow
        return @{ Id = "(new-ssh-key)"; Created = $true }
    }

    $body = @{ name = $Name; ssh_key = $PublicKey }
    $resp = Invoke-VultrApi -Method "POST" -Path "/ssh-keys" -Body $body
    if (-not $resp.ssh_key.id) { throw "Réponse POST /ssh-keys invalide." }
    return @{ Id = $resp.ssh_key.id; Created = $true }
}

function Ensure-FirewallRules {
    param(
        [string]$FirewallGroupId,
        [switch]$DryRun
    )

    if ($DryRun) {
        Write-Host "[DRY-RUN] POST /firewalls/$FirewallGroupId/rules x3 (22,80,443 tcp)." -ForegroundColor Yellow
        return
    }

    foreach ($port in @("22", "80", "443")) {
        $rule = @{
            ip_type     = "v4"
            protocol    = "tcp"
            subnet      = "0.0.0.0"
            subnet_size = 0
            port        = $port
        }
        Invoke-VultrApi -Method "POST" -Path "/firewalls/$FirewallGroupId/rules" -Body $rule | Out-Null
    }
}

function Ensure-FirewallGroup {
    param(
        [string]$Description,
        [switch]$DryRun
    )

    $fwPayload = Invoke-VultrApi -Method "GET" -Path "/firewalls"
    $groups = @()
    if ($fwPayload.firewall_groups) { $groups = @($fwPayload.firewall_groups) }

    foreach ($g in $groups) {
        if ($g.description -eq $Description) {
            return @{ Id = $g.id; Created = $false }
        }
    }

    if ($DryRun) {
        Write-Host "[DRY-RUN] POST /firewalls serait exécuté (description=$Description) + règles." -ForegroundColor Yellow
        return @{ Id = "(new-firewall)"; Created = $true }
    }

    $body = @{ description = $Description }
    $resp = Invoke-VultrApi -Method "POST" -Path "/firewalls" -Body $body
    if (-not $resp.firewall_group.id) { throw "Réponse POST /firewalls invalide." }
    $id = $resp.firewall_group.id
    Ensure-FirewallRules -FirewallGroupId $id -DryRun:$false
    return @{ Id = $id; Created = $true }
}

function Find-ExistingInstance {
    param([string]$Label)

    $enc = [System.Uri]::EscapeDataString($Label)
    $resp = Invoke-VultrApi -Method "GET" -Path "/instances?label=$enc"
    $instances = @()
    if ($resp.instances) { $instances = @($resp.instances) }

    foreach ($i in $instances) {
        if ($i.label -eq $Label) {
            return $i
        }
    }

    return $null
}

function Remove-ExistingInstance {
    param([string]$InstanceId)
    Invoke-VultrApi -Method "DELETE" -Path "/instances/$InstanceId" | Out-Null
}

function Wait-InstanceReady {
    param(
        [string]$InstanceId,
        [int]$TimeoutSec = 300,
        [int]$PollSec = 10
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Attente de l'instance (timeout ${TimeoutSec}s, poll ${PollSec}s)..." -ForegroundColor Cyan

    while ((Get-Date) -lt $deadline) {
        $resp = Invoke-VultrApi -Method "GET" -Path "/instances/$InstanceId"
        $inst = $resp.instance
        if (-not $inst) { throw "Réponse GET /instances/$InstanceId invalide." }

        $ip = [string]$inst.main_ip
        $ok = ($inst.status -eq "active") -and ($inst.power_status -eq "running") -and ($ip -ne "0.0.0.0") -and (-not [string]::IsNullOrWhiteSpace($ip))

        if ($ok) {
            Write-Host ""
            return $inst
        }

        Write-Host "." -NoNewline -ForegroundColor Yellow
        Start-Sleep -Seconds $PollSec
    }

    Write-Host ""
    throw "Timeout : l'instance $InstanceId n'est pas devenue active avec IP valide dans ${TimeoutSec}s."
}

function Save-VultrState {
    param(
        [string]$InstanceId,
        [string]$Ip,
        [string]$Region,
        [string]$Plan
    )

    $obj = [ordered]@{
        instance_id = $InstanceId
        main_ip     = $Ip
        region      = $Region
        plan        = $Plan
        created_at  = (Get-Date).ToUniversalTime().ToString("o")
    }

    $json = $obj | ConvertTo-Json -Depth 5
    Set-Content -LiteralPath $script:StatePath -Value $json -Encoding utf8
}

try {
    $script:EffectiveApiKey = $ApiKey

    $resolvedPlan = if (-not [string]::IsNullOrWhiteSpace($Plan)) { $Plan } elseif (-not [string]::IsNullOrWhiteSpace($env:VULTR_PLAN)) { $env:VULTR_PLAN } else { "vc2-1c-2gb" }
    $resolvedRegionPref = if (-not [string]::IsNullOrWhiteSpace($Region)) { $Region } elseif (-not [string]::IsNullOrWhiteSpace($env:VULTR_REGION)) { $env:VULTR_REGION } else { "mil" }

    Test-ApiKey -Key $script:EffectiveApiKey

    Write-Host ""
    Write-Host "=== ArcadeOps Control Tower — provisioning Vultr (API) ===" -ForegroundColor Cyan
    Write-Host "Préférence région : $resolvedRegionPref (chaîne : $($script:DefaultRegionChain -join ' -> '))" -ForegroundColor Cyan
    Write-Host "Plan             : $resolvedPlan" -ForegroundColor Cyan
    Write-Host "Hostname/label   : $Hostname" -ForegroundColor Cyan
    Write-Host "DryRun           : $DryRun" -ForegroundColor Cyan
    Write-Host ""

    $picked = Find-RegionWithFallback -Preferred $resolvedRegionPref -Plan $resolvedPlan
    Write-Host "Région retenue   : $($picked.Id) ($($picked.Label))" -ForegroundColor Green

    $osName = "Ubuntu 24.04 LTS x64"
    $osId = Find-OsId -Name $osName
    Write-Host "OS               : $osName (os_id=$osId)" -ForegroundColor Green

    $keyInfo = Resolve-SshPublicKey -ExplicitPath $SshKeyPath
    $fp = Get-SshKeyFingerprintPreview -PublicKeyLine $keyInfo.Content
    Write-Host "Clé SSH          : $($keyInfo.Path) (empreinte courte : $fp...)" -ForegroundColor Green

    $ssh = Ensure-VultrSshKey -Name "arcadeops-local-key" -PublicKey $keyInfo.Content -DryRun:$DryRun
    Write-Host "SSH key Vultr id : $($ssh.Id)" -ForegroundColor Green

    $fw = Ensure-FirewallGroup -Description "arcadeops-runner-fw" -DryRun:$DryRun
    Write-Host "Firewall group id: $($fw.Id)" -ForegroundColor Green

    $existing = Find-ExistingInstance -Label $Hostname
    if ($null -ne $existing) {
        $eip = [string]$existing.main_ip
        Write-Host "Instance existante détectée : id=$($existing.id) label=$($existing.label) ip=$eip" -ForegroundColor Yellow
        if (-not $Force) {
            Write-Host "Statut : ALREADY_PROVISIONED (aucune mutation, sortie 0)." -ForegroundColor Green
            Write-Host "SSH : ssh root@$eip" -ForegroundColor Cyan
            Write-Host "Pour recréer : relancez avec -Force (supprime l'instance puis recrée)." -ForegroundColor Yellow
            exit 0
        }

        if (-not $DryRun) {
            Write-Host "Suppression de l'instance existante (mode -Force)..." -ForegroundColor Yellow
            Remove-ExistingInstance -InstanceId $existing.id
            Start-Sleep -Seconds 5
        }
        else {
            Write-Host "[DRY-RUN] DELETE /instances/$($existing.id) serait exécuté avant recréation (-Force)." -ForegroundColor Yellow
        }
    }

    $instanceBody = [ordered]@{
        region             = $picked.Id
        plan               = $resolvedPlan
        os_id              = $osId
        hostname           = $Hostname
        label              = $Hostname
        sshkey_id          = @($ssh.Id)
        firewall_group_id = $fw.Id
        tags               = @("arcadeops", "control-tower", "hackathon")
        backups            = "disabled"
        enable_ipv6        = $false
    }

    if ($DryRun) {
        Write-Host ""
        Write-Host "[DRY-RUN] Résumé (aucun POST/DELETE de mutation, hors GET déjà effectués) :" -ForegroundColor Yellow
        $instanceBody | ConvertTo-Json -Depth 10 | Write-Host
        Write-Host ""
        Write-Host "Sortie 0 (dry-run)." -ForegroundColor Green
        exit 0
    }

    if ($ssh.Id -like "(new-*" -or $fw.Id -like "(new-*") {
        throw "État incohérent : relancez sans -DryRun pour créer clé/pare-feu avant l'instance."
    }

    $createResp = Invoke-VultrApi -Method "POST" -Path "/instances" -Body ([hashtable]$instanceBody)
    if (-not $createResp.instance.id) { throw "Réponse POST /instances invalide." }
    $newId = $createResp.instance.id
    Write-Host "Instance créée   : $newId" -ForegroundColor Green

    $ready = Wait-InstanceReady -InstanceId $newId -TimeoutSec 300 -PollSec 10
    $publicIp = [string]$ready.main_ip

    Save-VultrState -InstanceId $newId -Ip $publicIp -Region $picked.Id -Plan $resolvedPlan

    Write-Host ""
    Write-Host "=== Provisioning terminé ===" -ForegroundColor Green
    Write-Host "IP publique      : $publicIp" -ForegroundColor Green
    Write-Host "SSH              : ssh root@$publicIp" -ForegroundColor Cyan
    Write-Host "État écrit       : $script:StatePath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Suite : reprenez docs/runbooks/DEPLOYMENT_VULTR.md à partir de l'étape 4 (Docker)." -ForegroundColor Cyan
    Write-Host "Coût indicatif  : ~12 USD/mois (~0.40 USD/jour) — détruisez après le hackathon :" -ForegroundColor Yellow
    Write-Host "  .\scripts\vultr-destroy.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}
catch {
    Write-Host ""
    Write-Host "ECHEC : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
