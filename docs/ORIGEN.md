# Origen del sistema base

Este repositorio parte de la carpeta `customer-support-agent` del proyecto de código abierto [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts), commit `1a18c34` (2026-10-29), publicado bajo licencia MIT. Copyright (c) 2023 Anthropic.

Este trabajo no es un proyecto oficial de Anthropic ni está avalado por esa empresa.

## Trazabilidad

- Tag `upstream-original`: copia sin cambios del código original, más el archivo `LICENSE` tomado de la raíz del repositorio de origen. El historial original no se conserva.
- Tag `estado-inicial`: sistema base del TPI, que agrega al código original el módulo de incidencias. Pendiente de crear.
- Tag `estado-refactorizado`: estado final del código. Pendiente de crear.

Las diferencias entre el código original y el sistema base pueden consultarse con:

```bash
git diff upstream-original estado-inicial
```

## Cambios respecto del original

Se agrega un módulo de incidencias para cubrir entidades, operaciones y persistencia pedidas por la consigna. Este módulo fue escrito por Claude Code a pedido del estudiante.

- `app/lib/incidencias.ts`: entidades `Ticket`, `Agente` y `EstadoTicket`, y operaciones de creación, cambio de estado, asignación y filtrado.
- `app/api/tickets/route.ts`: `GET /api/tickets`, con filtros `estado`, `agenteId` y `texto`.
- `app/api/tickets/[id]/route.ts`: `PATCH /api/tickets/{id}`, con cuerpo `{ "estado": ... }` o `{ "agenteId": ... }`.
- `app/api/chat/route.ts`: crea un ticket cuando la respuesta deriva a un agente humano.
- `data/agentes.json`: agentes con datos sintéticos.
- `data/tickets.json`: tickets creados en ejecución. Git ignora este archivo.
