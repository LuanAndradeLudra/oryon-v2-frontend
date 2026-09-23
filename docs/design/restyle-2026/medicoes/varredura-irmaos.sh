#!/usr/bin/env bash
# Varredura transversal "altura vinda de padding" — SCRUM-1097.
# Roda docs/design/restyle-2026/sonda-irmaos.js rota a rota no portal
# "localhost" (maestri), grava a saída crua de cada rota num arquivo
# separado nesta mesma pasta. Só leitura — nenhum clique, nenhuma escrita.
#
# Uso (com o portal livre e logado):
#   bash docs/design/restyle-2026/medicoes/varredura-irmaos.sh
#
# Pré-requisito: rodar de dentro do worktree (caminhos relativos ao
# repo). Ajuste BASE_URL se a porta do dev server for outra.

set -euo pipefail

BASE_URL="http://localhost:3011"
PORTAL="localhost"
SONDA="docs/design/restyle-2026/sonda-irmaos.js"
OUT_DIR="docs/design/restyle-2026/medicoes"
WAIT_S=8

ROTAS=(
  /home
  /dashboard
  /contacts
  /pipelines
  /conversations
  /schedule
  /automations
  /agents
  /settings
)

SONDA_JS="$(cat "$SONDA")"

for rota in "${ROTAS[@]}"; do
  slug="$(echo "$rota" | tr -d '/')"
  [ -z "$slug" ] && slug="root"
  echo "== $rota =="
  maestri portal navigate "$PORTAL" "${BASE_URL}${rota}"
  sleep "$WAIT_S"
  maestri portal evaluate "$PORTAL" "$SONDA_JS" | tee "${OUT_DIR}/${slug}.json"
  echo
done

echo "Pronto. Saída por rota em ${OUT_DIR}/*.json"
