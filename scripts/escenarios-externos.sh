#!/usr/bin/env bash
# Ejecuta, como un cliente externo, los escenarios de calidad externa contra
# una aplicación levantada con scripts/modelo-falso.mjs.
#
# Uso: scripts/escenarios-externos.sh [url-base]   (por defecto http://localhost:3000)
set -u

URL="${1:-http://localhost:3000}"
MODELO="claude-haiku-4-5-20251001"

chat() { # $1 título, $2 cuerpo JSON
  echo "### $1"
  echo "Pedido: $2"
  curl -s -D - -o /tmp/escenario-cuerpo.$$ -X POST "$URL/api/chat" \
    -H "Content-Type: application/json" -d "$2" |
    grep -iE '^(HTTP/|x-debug-data|x-rag-sources)' | tr -d '\r'
  echo "Cuerpo: $(head -c 400 /tmp/escenario-cuerpo.$$)"
  echo
}

pedido() { # $1 mensaje, $2 modelo (opcional)
  printf '{"messages":[{"role":"user","content":"%s"}],"model":"%s","knowledgeBaseId":""}' \
    "$1" "${2:-$MODELO}"
}

echo "Aplicación: $URL"
echo "Fecha: $(date -Iseconds)"
echo

chat "1. Consulta normal" "$(pedido '¿Dónde veo mis facturas?')"
chat "2. Pedido de agente humano" "$(pedido 'Quiero hablar con un agente')"
chat "3. El modelo no responde JSON" "$(pedido 'Probar json invalido')"
chat "4. Falla del proveedor del modelo" "$(pedido 'Simular falla')"
chat "5. Pedido sin mensajes" "{\"messages\":[],\"model\":\"$MODELO\",\"knowledgeBaseId\":\"\"}"
chat "6. Modelo no ofrecido por la interfaz" "$(pedido 'Hola' 'claude-modelo-costoso')"

echo "### 7. Tickets creados por la derivación"
TICKETS="$(curl -s "$URL/api/tickets?estado=abierto")"
echo "$TICKETS"
ID="$(echo "$TICKETS" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)"
echo

if [ -n "$ID" ]; then
  echo "### 8. Asignar agente y avanzar estado"
  curl -s -w ' [HTTP %{http_code}]\n' -X PATCH "$URL/api/tickets/$ID" \
    -H "Content-Type: application/json" -d '{"agenteId":"agente-1"}'
  curl -s -w ' [HTTP %{http_code}]\n' -X PATCH "$URL/api/tickets/$ID" \
    -H "Content-Type: application/json" -d '{"estado":"en_progreso"}'
  curl -s -w ' [HTTP %{http_code}]\n' -X PATCH "$URL/api/tickets/$ID" \
    -H "Content-Type: application/json" -d '{"estado":"cerrado"}'
fi

rm -f /tmp/escenario-cuerpo.$$
