#Requires -Version 7.0
<#
.SYNOPSIS
    Détruit l'instance Vultr provisionnée (lecture de .vultr-state.json).

.DESCRIPTION
    Supprime l'instance via DELETE /instances/{id}, retire le fichier d'état.
    Option -Full : supprime aussi le groupe pare-feu et la clé SSH Vultr créés par le provisionnement.
    Commentaires en français ; identifiants de code en anglais.
#>
[CmdletBinding()]
param(
    [string]$ApiKey = $env:VULTR_API_KEY,
    [switch]$Force,
    [switch]$Full
)

$ErrorActionPreference = "Stop"
$script:VultrBaseUrl = "https://api.vultr.com/v2"
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:StatePath = Join-Path $script:RepoRoot ".vultr-state.json"

function Test-ApiKey {
    param([string]$Key)
    if ([string]::IsNullOrWhiteSpace($Key)) {
        Write-Host "ERREUR : VULTR_API_KEY est vide." -ForegroundColor Red
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
                Write-Host "ERREUR API Vultr : $Method $Path -> HTTP $status" -ForegroundColor Red
                if ($response.Content) { Write-Host $response.Content -ForegroundColor Red }
                throw "Vultr API error HTTP $status"
            }

            if ([string]::IsNullOrWhiteSpace($response.Content)) { return $null }
            return $response.Content | ConvertFrom-Json -Depth 20
        }
        catch {
            Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
            throw
        }
    }
}

try {
    $script:EffectiveApiKey = $ApiKey
    Test-ApiKey -Key $script:EffectiveApiKey

    if (-not (Test-Path -LiteralPath $script:StatePath)) {
        Write-Host "ERREUR : fichier d'état introuvable : $script:StatePath" -ForegroundColor Red
        Write-Host "Astuce : provisionnez d'abord avec .\scripts\vultr-provision.ps1" -ForegroundColor Yellow
        exit 1
    }

    $state = Get-Content -LiteralPath $script:StatePath -Raw | ConvertFrom-Json
    if (-not $state.instance_id) {
        Write-Host "ERREUR : instance_id manquant dans le fichier d'état." -ForegroundColor Red
        exit 1
    }

    $id = [string]$state.instance_id
    $ip = [string]$state.main_ip

    Write-Host ""
    Write-Host "=== ArcadeOps Control Tower — destruction Vultr ===" -ForegroundColor Cyan
    Write-Host "Instance id : $id" -ForegroundColor Cyan
    Write-Host "IP          : $ip" -ForegroundColor Cyan
    Write-Host "Full        : $Full" -ForegroundColor Cyan
    Write-Host ""

    if (-not $Force) {
        $answer = Read-Host "Tapez 'yes' pour confirmer la suppression (facturation s'arrête après destruction)"
        if ($answer -ne "yes") {
            Write-Host "Annulé." -ForegroundColor Yellow
            exit 0
        }
    }

    Write-Host "Suppression de l'instance..." -ForegroundColor Yellow
    Invoke-VultrApi -Method "DELETE" -Path "/instances/$id" | Out-Null

    if ($Full) {
        Write-Host "Mode -Full : suppression pare-feu + clé SSH (si trouvés)..." -ForegroundColor Yellow

        $fw = Invoke-VultrApi -Method "GET" -Path "/firewalls"
        $groups = @()
        if ($fw.firewall_groups) { $groups = @($fw.firewall_groups) }
        foreach ($g in $groups) {
            if ($g.description -eq "arcadeops-runner-fw") {
                Invoke-VultrApi -Method "DELETE" -Path "/firewalls/$($g.id)" | Out-Null
                Write-Host "Firewall supprimé : $($g.id)" -ForegroundColor Green
            }
        }

        $keys = Invoke-VultrApi -Method "GET" -Path "/ssh-keys"
        $sshKeys = @()
        if ($keys.ssh_keys) { $sshKeys = @($keys.ssh_keys) }
        foreach ($k in $sshKeys) {
            if ($k.name -eq "arcadeops-local-key") {
                Invoke-VultrApi -Method "DELETE" -Path "/ssh-keys/$($k.id)" | Out-Null
                Write-Host "Clé SSH supprimée : $($k.id)" -ForegroundColor Green
            }
        }
    }

    Remove-Item -LiteralPath $script:StatePath -Force
    Write-Host ""
    Write-Host "OK : instance supprimée et $script:StatePath retiré." -ForegroundColor Green
    Write-Host "Si vous n'avez pas utilisé -Full, le pare-feu et la clé SSH restent dans Vultr (sans coût notable)." -ForegroundColor Yellow
    exit 0
}
catch {
    Write-Host ""
    Write-Host "ECHEC : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
