# Origen del sistema base

Este repositorio parte de la carpeta `customer-support-agent` del proyecto de código abierto [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts), commit `1a18c34` (2026-10-29), publicado bajo licencia MIT. Copyright (c) 2023 Anthropic.

Este trabajo no es un proyecto oficial de Anthropic ni está avalado por esa empresa.

## Dominio, actores y alcance

**Dominio.** Soporte al cliente. Un chat con un modelo de IA responde consultas y, cuando corresponde, deriva el caso a un agente humano mediante un ticket de incidencia.

**Actores.**

- Usuario final: escribe consultas en el chat.
- Agente humano: recibe los tickets derivados, se le asignan y cambia su estado.
- Modelo de IA (Claude) y base de conocimiento (Amazon Bedrock): sistemas externos que generan la respuesta y aportan contexto.

**Entidades.** `Ticket` y `Agente` son las entidades persistentes. El mensaje de chat es la entrada del flujo principal. `EstadoTicket` es un tipo que modela el ciclo de vida del ticket (`abierto`, `en_progreso`, `resuelto`, `cerrado`) y sus transiciones válidas.

**Operaciones verificables.**

1. Consultar al chat y recibir respuesta, estado de ánimo y preguntas sugeridas.
2. Crear un ticket al derivar a un agente humano.
3. Cambiar el estado de un ticket.
4. Asignar un agente a un ticket.
5. Buscar y filtrar tickets por estado, agente y texto.

**Persistencia.** Los tickets se guardan en `data/tickets.json`; los agentes, con datos sintéticos, en `data/agentes.json`.

**Alcance del trabajo.** El TPI analiza y refactoriza el backend: `app/api/` y `app/lib/`. La interfaz (`components/`) se diagnostica pero queda fuera del refactor, por falta de pruebas de interfaz y por tiempo.

**Versión inicial.** Tag `estado-inicial`. Evidencia de funcionamiento: `docs/evidencias/estado-inicial/` y `docs/evidencias/calidad-externa/escenarios-estado-inicial.log`.

**Tecnología.** Next.js 14, React 18, TypeScript, SDK de Anthropic, cliente de Amazon Bedrock Agent Runtime, zod, Vitest, Tailwind CSS y shadcn/ui.

## Trazabilidad

- Tag `upstream-original`: copia sin cambios del código original, más el archivo `LICENSE` tomado de la raíz del repositorio de origen. El historial original no se conserva.
- Tag `estado-inicial`: sistema base del TPI, que agrega al código original el módulo de incidencias.
- Tags `estado-refactorizado` y `estadorefactorizado`: estado final del código.
- Los tags de cada etapa se listan en el `README.md`.

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
