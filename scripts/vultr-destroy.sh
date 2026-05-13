#!/usr/bin/env bash
# Détruit l'instance Vultr provisionnée (lecture de .vultr-state.json).
# Commentaires en français ; identifiants de code en anglais.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STATE_PATH="${REPO_ROOT}/.vultr-state.json"
VULTR_BASE_URL="https://api.vultr.com/v2"

API_KEY="${VULTR_API_KEY:-}"
FORCE=0
FULL=0

die() {
  echo "ERREUR: $*" >&2
  exit 1
}

require_tools() {
  command -v curl >/dev/null 2>&1 || die "curl est requis."
  command -v jq >/dev/null 2>&1 || die "jq est requis."
}

usage() {
  cat <<'EOF'
Usage:
  export VULTR_API_KEY="VTR-..."
  ./scripts/vultr-destroy.sh [--force] [--full]

Options:
  --force   Ne demande pas de confirmation interactive
  --full    Supprime aussi le groupe pare-feu et la clé SSH nommés par le provisionnement
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1 ;;
    --full) FULL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Argument inconnu: $1" ;;
  esac
  shift
done

require_tools

if [[ -z "${API_KEY}" ]]; then
  echo "ERREUR : VULTR_API_KEY est vide." >&2
  echo "  https://my.vultr.com/settings/#settingsapi" >&2
  exit 1
fi

if [[ ! -f "${STATE_PATH}" ]]; then
  echo "ERREUR : fichier d'état introuvable : ${STATE_PATH}" >&2
  echo "Astuce : provisionnez d'abord avec ./scripts/vultr-provision.sh" >&2
  exit 1
fi

IID="$(jq -r '.instance_id // empty' "${STATE_PATH}")"
IP="$(jq -r '.main_ip // empty' "${STATE_PATH}")"
[[ -n "${IID}" ]] || die "instance_id manquant dans le fichier d'état."

echo ""
echo "=== ArcadeOps Control Tower — destruction Vultr ==="
echo "Instance id : ${IID}"
echo "IP          : ${IP}"
echo "Full        : ${FULL}"
echo ""

if [[ "${FORCE}" -ne 1 ]]; then
  read -r -p "Tapez 'yes' pour confirmer la suppression : " ans
  if [[ "${ans}" != "yes" ]]; then
    echo "Annulé."
    exit 0
  fi
fi

vultr_api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local tmp http_code
  tmp="$(mktemp)"
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

  if [[ "${http_code}" -lt 200 || "${http_code}" -ge 300 ]]; then
    echo "ERREUR API Vultr : ${method} ${path} -> HTTP ${http_code}" >&2
    cat "${tmp}" >&2 || true
    rm -f "${tmp}"
    exit 1
  fi

  cat "${tmp}"
  rm -f "${tmp}"
}

echo "Suppression de l'instance..." >&2
vultr_api "DELETE" "/instances/${IID}" >/dev/null

if [[ "${FULL}" -eq 1 ]]; then
  echo "Mode --full : suppression pare-feu + clé SSH (si trouvés)..." >&2
  fw_json="$(vultr_api "GET" "/firewalls")"
  while read -r gid; do
    [[ -z "${gid}" ]] && continue
    vultr_api "DELETE" "/firewalls/${gid}" >/dev/null
    echo "Firewall supprimé : ${gid}" >&2
  done < <(echo "${fw_json}" | jq -r '(.firewall_groups // [])[] | select(.description=="arcadeops-runner-fw") | .id')

  keys_json="$(vultr_api "GET" "/ssh-keys")"
  while read -r kid; do
    [[ -z "${kid}" ]] && continue
    vultr_api "DELETE" "/ssh-keys/${kid}" >/dev/null
    echo "Clé SSH supprimée : ${kid}" >&2
  done < <(echo "${keys_json}" | jq -r '(.ssh_keys // [])[] | select(.name=="arcadeops-local-key") | .id')
fi

rm -f "${STATE_PATH}"
echo ""
echo "OK : instance supprimée et ${STATE_PATH} retiré."
echo "Si vous n'avez pas utilisé --full, le pare-feu et la clé SSH restent dans Vultr (sans coût notable)."
