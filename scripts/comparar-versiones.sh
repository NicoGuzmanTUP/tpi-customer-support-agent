#!/usr/bin/env bash
# Ejecuta una suite de pruebas de una versión sobre el código de otra versión.
#
# Uso:
#   scripts/comparar-versiones.sh <version-codigo> <version-tests>
#   scripts/comparar-versiones.sh todo    # corridas A a D, con logs en docs/evidencias/comparacion
#
# Las versiones son tags o commits. El repositorio no se modifica: cada corrida
# se arma en un directorio temporal con `git archive` y reutiliza node_modules.
set -uo pipefail

RAIZ="$(git rev-parse --show-toplevel)"
cd "$RAIZ"

if [ ! -d node_modules ]; then
  echo "Falta node_modules. Ejecutar primero: npm install" >&2
  exit 1
fi

correr() {
  local codigo="$1" tests="$2" temporal estado
  temporal="$(mktemp -d)"
  git archive "$codigo" | tar -x -C "$temporal"
  rm -rf "$temporal/tests"
  git archive "$tests" tests vitest.config.ts | tar -x -C "$temporal"
  ln -s "$RAIZ/node_modules" "$temporal/node_modules"

  echo "Código: $codigo ($(git rev-parse --short "$codigo"))"
  echo "Tests:  $tests ($(git rev-parse --short "$tests"))"
  echo
  (cd "$temporal" && npx vitest run --reporter=verbose 2>&1) |
    sed -e 's/\x1b\[[0-9;]*m//g' -e "s#$temporal#.#g"
  estado=${PIPESTATUS[0]}
  rm -rf "$temporal"
  return "$estado"
}

if [ "${1:-}" = "todo" ]; then
  SUITE_CARACTERIZACION=27039b4 # tests de etapa-diagnostico más el snapshot del prompt
  ULTIMO_REFACTOR=d63f5c1       # último commit de refactor, antes de las correcciones
  SALIDA=docs/evidencias/comparacion
  mkdir -p "$SALIDA"

  correr estado-inicial "$SUITE_CARACTERIZACION" > "$SALIDA/A-inicial-con-tests-caracterizacion.log"
  correr "$ULTIMO_REFACTOR" "$SUITE_CARACTERIZACION" > "$SALIDA/B-refactor-con-tests-caracterizacion.log"
  correr etapa-refactoring etapa-refactoring > "$SALIDA/C-final-con-tests-finales.log"
  correr estado-inicial etapa-refactoring > "$SALIDA/D-inicial-con-tests-finales.log"

  for log in "$SALIDA"/*.log; do
    printf '%-45s %s\n' "$(basename "$log")" "$(grep -E '^ +Tests ' "$log" | tr -s ' ')"
  done
  exit 0
fi

if [ $# -ne 2 ]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
fi

correr "$1" "$2"
