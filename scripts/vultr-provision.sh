#!/usr/bin/env bash
# Provisionne une VM Vultr Cloud Compute (runner hackathon) via l'API v2.
# Commentaires en français ; identifiants de code en anglais.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_PATH="${REPO_ROOT}/.vultr-state.json"
VULTR_BASE_URL="https://api.vultr.com/v2"
DEFAULT_REGION_CHAIN=("mil" "fra" "cdg" "ams")

API_KEY="${VULTR_API_KEY:-}"
REGION_PREF="${VULTR_REGION:-mil}"
PLAN_ID="${VULTR_PLAN:-vc2-1c-2gb}"
HOSTNAME="arcadeops-runner"
SSH_KEY_PATH=""
DRY_RUN=0
FORCE=0

die() {
  echo "ERREUR: $*" >&2
  exit 1
}

require_tools() {
  command -v curl >/dev/null 2>&1 || die "curl est requis."
  command -v jq >/dev/null 2>&1 || die "jq est requis (install local, non ajouté au repo)."
}

usage() {
  cat <<'EOF'
Usage:
  export VULTR_API_KEY="VTR-..."
  ./scripts/vultr-provision.sh [--dry-run] [--force] [--hostname NAME] [--ssh-key PATH]

Variables d'environnement:
  VULTR_API_KEY   (obligatoire hors dry-run complet si vous appelez l'API)
  VULTR_REGION    (défaut: mil, avec fallback fra,cdg,ams)
  VULTR_PLAN      (défaut: vc2-1c-2gb)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --force) FORCE=1 ;;
    --hostname) HOSTNAME="${2:?}"; shift ;;
    --ssh-key) SSH_KEY_PATH="${2:?}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Argument inconnu: $1 (essayez --help)" ;;
  esac
  shift
done

test_api_key() {
  if [[ -z "${API_KEY}" ]]; then
    echo "ERREUR : VULTR_API_KEY est vide. Créez une clé API Vultr :" >&2
    echo "  https://my.vultr.com/settings/#settingsapi" >&2
    exit 1
  fi
}

vultr_api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local attempt=1
  local max=3

  while true; do
    local tmp
    tmp="$(mktemp)"
    local http_code
    if [[ -n "${body}" ]]; then
      http_code="$(curl -sS -o "${tmp}" -w "%{http_code}" -X "${method}" \
        -H "Authorization: Bearer ${API_KEY}" \
        -H "Content-Type: application/json" \
        --data-binary "${body}" \
        "${VULTR_BASE_URL}${path}" || true)"
    else
      http_code="$(curl -sS -o "${tmp}" -w "%{http_code}" -X "${method}" \
        -H "Authorization: Bearer ${API_KEY}" \
        "${VULTR_BASE_URL}${path}" || true)"
    fi

    if [[ ! "${http_code}" =~ ^[0-9]{3}$ ]]; then
      rm -f "${tmp}"
      die "Réseau ou curl : code HTTP invalide '${http_code}'."
    fi

    if [[ "${http_code}" =~ ^5 ]]; then
      if [[ "${attempt}" -ge "${max}" ]]; then
        rm -f "${tmp}"
        die "Vultr API ${method} ${path} a échoué après ${max} tentatives (HTTP ${http_code})."
      fi
      echo "  (tentative ${attempt}/${max} : HTTP ${http_code}, nouvel essai dans 2s...)" >&2
      sleep 2
      attempt=$((attempt + 1))
      rm -f "${tmp}"
      continue
    fi

    if [[ "${http_code}" -lt 200 || "${http_code}" -ge 300 ]]; then
      echo "ERREUR API Vultr : ${method} ${path} -> HTTP ${http_code}" >&2
      cat "${tmp}" >&2 || true
      echo "Pistes : 401 -> clé API ; 400 -> région/plan ; 503 -> incident Vultr." >&2
      rm -f "${tmp}"
      exit 1
    fi

    cat "${tmp}"
    rm -f "${tmp}"
    return 0
  done
}

plan_locations_json() {
  local plans_json="$1"
  local plan_id="$2"
  echo "${plans_json}" | jq -c --arg pid "${plan_id}" '
    if (.plans | type) == "array" then
      ((.plans // []) | map(select(.id == $pid) | .locations) | .[0] // [])
    elif (.plans | type) == "object" then
      (.plans[$pid].locations // [])
    else
      []
    end
  '
}

build_region_order() {
  local preferred="$1"
  shift
  local -a chain=("$@")
  local -a out=()
  local seen="|"

  add_unique() {
    local r="$1"
    [[ -z "${r}" ]] && return 0
    r="$(echo "${r}" | tr "[:upper:]" "[:lower:]")"
    case "${seen}" in
      *"|${r}|"*) return 0 ;;
    esac
    seen="${seen}${r}|"
    out+=("${r}")
  }

  add_unique "${preferred}"
  local x
  for x in "${chain[@]}"; do add_unique "${x}"; done

  printf "%s\n" "${out[@]}"
}

find_region_with_fallback() {
  local preferred="$1"
  local plan="$2"
  local plans_json
  plans_json="$(vultr_api "GET" "/plans?type=vc2")"
  local locs_json
  locs_json="$(plan_locations_json "${plans_json}" "${plan}")"
  local loc_count
  loc_count="$(echo "${locs_json}" | jq 'length')"
  [[ "${loc_count}" -gt 0 ]] || die "Plan '${plan}' introuvable ou sans locations dans GET /plans?type=vc2."

  local regions_json
  regions_json="$(vultr_api "GET" "/regions")"

  local order
  order="$(build_region_order "${preferred}" "${DEFAULT_REGION_CHAIN[@]}")"

  while IFS= read -r rid; do
    [[ -z "${rid}" ]] && continue
    if echo "${locs_json}" | jq -e --arg r "${rid}" 'index($r) != null' >/dev/null; then
      local label
      label="$(echo "${regions_json}" | jq -r --arg r "${rid}" '
        (.regions // []) as $rs
        | ($rs | map(select(.id == $r)) | .[0]) as $m
        | if $m == null then $r
          elif ($m.city != null) and ($m.country != null) then "\($m.city), \($m.country)"
          elif ($m.city != null) then $m.city
          else $r end
      ')"
      echo "${rid}|${label}"
      return 0
    fi
  done <<< "${order}"

  die "Aucune région disponible pour le plan '${plan}' avec la chaîne demandée."
}

find_os_id() {
  local name="$1"
  local os_json id
  os_json="$(vultr_api "GET" "/os")"
  id="$(echo "${os_json}" | jq -r --arg n "${name}" '(.os // [])[] | select(.name == $n) | .id' | head -n 1)"
  [[ -n "${id}" ]] || die "OS '${name}' introuvable dans GET /os."
  echo "${id}"
}

resolve_ssh_public_key() {
  local explicit="${SSH_KEY_PATH}"
  local home_ssh="${HOME}/.ssh"
  local candidates=()
  if [[ -n "${explicit}" ]]; then
    candidates+=("${explicit}")
  else
    candidates+=("${home_ssh}/id_ed25519.pub" "${home_ssh}/id_rsa.pub")
  fi

  local p
  for p in "${candidates[@]}"; do
    if [[ -f "${p}" ]]; then
      local content
      content="$(tr -d "\r" <"${p}" | sed -e "s/[[:space:]]*$//")"
      [[ -n "${content}" ]] || continue
      echo "${p}"
      echo "${content}"
      return 0
    fi
  done

  die "Clé publique SSH introuvable. Ajoutez ~/.ssh/id_ed25519.pub (ou id_rsa.pub) ou passez --ssh-key."
}

ssh_fingerprint_preview() {
  local line="$1"
  echo "${line}" | awk '{print $2}' | head -c 20 || true
}

ensure_vultr_ssh_key() {
  local name="$1"
  local pubkey="$2"
  local keys_json
  keys_json="$(vultr_api "GET" "/ssh-keys")"
  local existing
  existing="$(echo "${keys_json}" | jq -r --arg n "${name}" '
    (.ssh_keys // [])[] | select(.name == $n) | .id
  ' | head -n 1)"
  if [[ -n "${existing}" ]]; then
    echo "${existing}"
    return 0
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[DRY-RUN] POST /ssh-keys serait exécuté (name=${name})." >&2
    echo "(new-ssh-key)"
    return 0
  fi

  local body resp id
  body="$(jq -nc --arg n "${name}" --arg k "${pubkey}" '{name:$n, ssh_key:$k}')"
  resp="$(vultr_api "POST" "/ssh-keys" "${body}")"
  id="$(echo "${resp}" | jq -r '.ssh_key.id // empty')"
  [[ -n "${id}" ]] || die "Réponse POST /ssh-keys invalide."
  echo "${id}"
}

ensure_firewall_group() {
  local description="$1"
  local fw_json
  fw_json="$(vultr_api "GET" "/firewalls")"
  local existing
  existing="$(echo "${fw_json}" | jq -r --arg d "${description}" '
    (.firewall_groups // [])[] | select(.description == $d) | .id
  ' | head -n 1)"
  if [[ -n "${existing}" ]]; then
    echo "${existing}"
    return 0
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[DRY-RUN] POST /firewalls serait exécuté (description=${description}) + règles." >&2
    echo "(new-firewall)"
    return 0
  fi

  local body
  body="$(jq -nc --arg d "${description}" '{description:$d}')"
  local resp
  resp="$(vultr_api "POST" "/firewalls" "${body}")"
  local gid
  gid="$(echo "${resp}" | jq -r '.firewall_group.id // empty')"
  [[ -n "${gid}" ]] || die "Réponse POST /firewalls invalide."

  for port in 22 80 443; do
    local rule
    rule="$(jq -nc --argjson p "${port}" '{ip_type:"v4", protocol:"tcp", subnet:"0.0.0.0", subnet_size:0, port:($p|tostring)}')"
    vultr_api "POST" "/firewalls/${gid}/rules" "${rule}" >/dev/null
  done

  echo "${gid}"
}

find_existing_instance() {
  local label="$1"
  local enc resp
  enc="$(jq -nr --arg l "${label}" '$l|@uri')"
  resp="$(vultr_api "GET" "/instances?label=${enc}")"
  echo "${resp}" | jq -c --arg l "${label}" '((.instances // []) | map(select(.label == $l)) | first) // null'
}

remove_instance() {
  local id="$1"
  vultr_api "DELETE" "/instances/${id}" >/dev/null
}

wait_instance_ready() {
  local id="$1"
  local timeout="${2:-300}"
  local poll="${3:-10}"
  local start
  start="$(date +%s)"

  echo "Attente de l'instance (timeout ${timeout}s, poll ${poll}s)..." >&2
  while true; do
    local now
    now="$(date +%s)"
    if [[ $((now - start)) -ge "${timeout}" ]]; then
      echo "" >&2
      die "Timeout : l'instance ${id} n'est pas devenue active avec IP valide."
    fi

    local resp inst ip status pwr
    resp="$(vultr_api "GET" "/instances/${id}")"
    inst="$(echo "${resp}" | jq -c '.instance // empty')"
    [[ -n "${inst}" ]] || die "Réponse GET /instances/${id} invalide."
    ip="$(echo "${inst}" | jq -r '.main_ip // ""')"
    status="$(echo "${inst}" | jq -r '.status // ""')"
    pwr="$(echo "${inst}" | jq -r '.power_status // ""')"

    if [[ "${status}" == "active" && "${pwr}" == "running" && -n "${ip}" && "${ip}" != "0.0.0.0" ]]; then
      echo "" >&2
      echo "${inst}"
      return 0
    fi

    printf "." >&2
    sleep "${poll}"
  done
}

save_vultr_state() {
  local instance_id="$1"
  local ip="$2"
  local region="$3"
  local plan="$4"
  jq -nc \
    --arg id "${instance_id}" \
    --arg ip "${ip}" \
    --arg r "${region}" \
    --arg p "${plan}" \
    --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{instance_id:$id, main_ip:$ip, region:$r, plan:$p, created_at:$ts}' >"${STATE_PATH}"
}

require_tools
test_api_key

echo ""
echo "=== ArcadeOps Control Tower — provisioning Vultr (API) ==="
echo "Préférence région : ${REGION_PREF} (chaîne : ${DEFAULT_REGION_CHAIN[*]})"
echo "Plan             : ${PLAN_ID}"
echo "Hostname/label   : ${HOSTNAME}"
echo "DryRun           : ${DRY_RUN}"
echo ""

picked="$(find_region_with_fallback "${REGION_PREF}" "${PLAN_ID}")"
IFS="|" read -r PICKED_REGION PICKED_LABEL <<< "${picked}"
echo "Région retenue   : ${PICKED_REGION} (${PICKED_LABEL})"

OS_NAME="Ubuntu 24.04 LTS x64"
OS_ID="$(find_os_id "${OS_NAME}")"
echo "OS               : ${OS_NAME} (os_id=${OS_ID})"

mapfile -t KEY_LINES < <(resolve_ssh_public_key)
KEY_PATH="${KEY_LINES[0]}"
PUBKEY="${KEY_LINES[1]}"
FP="$(ssh_fingerprint_preview "${PUBKEY}")"
echo "Clé SSH          : ${KEY_PATH} (empreinte courte : ${FP}...)"

SSH_ID="$(ensure_vultr_ssh_key "arcadeops-local-key" "${PUBKEY}")"
echo "SSH key Vultr id : ${SSH_ID}"

FW_ID="$(ensure_firewall_group "arcadeops-runner-fw")"
echo "Firewall group id: ${FW_ID}"

EXIST_JSON="$(find_existing_instance "${HOSTNAME}")"
if echo "${EXIST_JSON}" | jq -e 'type == "object"' >/dev/null 2>&1; then
  EID="$(echo "${EXIST_JSON}" | jq -r '.id')"
  EIP="$(echo "${EXIST_JSON}" | jq -r '.main_ip // ""')"
  echo "Instance existante détectée : id=${EID} label=${HOSTNAME} ip=${EIP}"
  if [[ "${FORCE}" -ne 1 ]]; then
    echo "Statut : ALREADY_PROVISIONED (aucune mutation, sortie 0)."
    echo "SSH : ssh root@${EIP}"
    echo "Pour recréer : relancez avec --force."
    exit 0
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    echo "[DRY-RUN] DELETE /instances/${EID} serait exécuté avant recréation (--force)." >&2
  else
    echo "Suppression de l'instance existante (mode --force)..." >&2
    remove_instance "${EID}"
    sleep 5
  fi
fi

INSTANCE_BODY="$(jq -nc \
  --arg r "${PICKED_REGION}" \
  --arg p "${PLAN_ID}" \
  --arg os "${OS_ID}" \
  --arg h "${HOSTNAME}" \
  --arg sid "${SSH_ID}" \
  --arg fid "${FW_ID}" \
  '{
    region:$r,
    plan:$p,
    os_id:($os|tonumber),
    hostname:$h,
    label:$h,
    sshkey_id:[$sid],
    firewall_group_id:$fid,
    tags:["arcadeops","control-tower","hackathon"],
    backups:"disabled",
    enable_ipv6:false
  }')"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  echo ""
  echo "[DRY-RUN] Résumé (aucun POST/DELETE de mutation, hors GET déjà effectués) :"
  echo "${INSTANCE_BODY}" | jq .
  echo ""
  echo "Sortie 0 (dry-run)."
  exit 0
fi

if [[ "${SSH_ID}" == *"(new-"* || "${FW_ID}" == *"(new-"* ]]; then
  die "État incohérent : relancez sans --dry-run pour créer clé/pare-feu avant l'instance."
fi

CREATE_JSON="$(vultr_api "POST" "/instances" "${INSTANCE_BODY}")"
NEW_ID="$(echo "${CREATE_JSON}" | jq -r '.instance.id // empty')"
[[ -n "${NEW_ID}" ]] || die "Réponse POST /instances invalide."
echo "Instance créée   : ${NEW_ID}"

READY_JSON="$(wait_instance_ready "${NEW_ID}" 300 10)"
PUBLIC_IP="$(echo "${READY_JSON}" | jq -r '.main_ip')"

save_vultr_state "${NEW_ID}" "${PUBLIC_IP}" "${PICKED_REGION}" "${PLAN_ID}"

echo ""
echo "=== Provisioning terminé ==="
echo "IP publique      : ${PUBLIC_IP}"
echo "SSH              : ssh root@${PUBLIC_IP}"
echo "État écrit       : ${STATE_PATH}"
echo ""
echo "Suite : reprenez docs/runbooks/DEPLOYMENT_VULTR.md à partir de l'étape 4 (Docker)."
echo "Coût indicatif  : ~12 USD/mois (~0.40 USD/jour) — détruisez après le hackathon :"
echo "  ./scripts/vultr-destroy.sh"
echo ""
