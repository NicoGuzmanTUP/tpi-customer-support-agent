# TPI Metodología de Sistemas II: refactoring de un agente de soporte

Trabajo Práctico Integrador de Metodología de Sistemas II. Tecnicatura Universitaria en Programación a Distancia, UTN. Comisión 4. Entrega individual.

El trabajo toma un sistema existente, diagnostica su calidad interna y externa, identifica deuda técnica y code smells, y lo mejora con refactorings seguros, principios SOLID y Clean Code. Cada cambio se verifica con pruebas y se revisa con una checklist de code review.

## Origen

El sistema base es `customer-support-agent`, del proyecto de código abierto [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts), commit `1a18c34`, con licencia MIT. Se agregó un módulo de incidencias para cumplir los requisitos de la consigna. Detalle en [`docs/ORIGEN.md`](docs/ORIGEN.md).

Este trabajo no es un proyecto oficial de Anthropic ni está avalado por esa empresa. El README original puede consultarse con `git show upstream-original:README.md`.

## Funcionalidades

- **Chat de soporte:** responde consultas con Claude, usando contexto de una base de conocimiento de Amazon Bedrock (RAG).
- **Análisis de la consulta:** informa estado de ánimo del usuario, preguntas sugeridas y categorías.
- **Derivación a un agente humano:** cuando corresponde, avisa al usuario y registra un ticket.
- **Gestión de incidencias:** consultar, filtrar, asignar agentes y cambiar el estado de los tickets.

Entidades del dominio de incidencias: `Ticket`, `Agente` y `EstadoTicket` (`abierto`, `en_progreso`, `resuelto`, `cerrado`). Los tickets se guardan en `data/tickets.json`.

## Tecnologías

- Next.js 14, React 18 y TypeScript.
- SDK de Anthropic y cliente de Amazon Bedrock Agent Runtime.
- zod para validar entradas y respuestas.
- Vitest para pruebas y cobertura; ESLint y jscpd para métricas.
- Tailwind CSS y componentes shadcn/ui.

## Instalación

Requisitos: Node.js 20 o superior.

```bash
npm install
```

## Uso

### Sin API key (modelo simulado)

`scripts/modelo-falso.mjs` imita la API de Anthropic. Permite usar la aplicación completa sin credenciales.

```bash
node scripts/modelo-falso.mjs
```

En otra terminal:

```bash
ANTHROPIC_API_KEY=falsa ANTHROPIC_BASE_URL=http://localhost:4599 npm run dev
```

Abrir `http://localhost:3000`. Los escenarios disponibles están en [`docs/calidad-externa.md`](docs/calidad-externa.md).

### Con credenciales reales

Crear `.env.local`:

```
ANTHROPIC_API_KEY=...
BAWS_ACCESS_KEY_ID=...
BAWS_SECRET_ACCESS_KEY=...
BEDROCK_REGION=us-east-1
```

Luego ejecutar `npm run dev`. `BEDROCK_REGION` es opcional; su valor por defecto es `us-east-1`. Sin credenciales de AWS, el chat funciona sin contexto de la base de conocimiento.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chat` | Recibe `messages`, `model` y `knowledgeBaseId`. Responde 200, 400 si el pedido es inválido o 500 si falla el modelo. |
| `GET` | `/api/tickets` | Lista tickets. Filtros opcionales: `estado`, `agenteId` y `texto`. |
| `PATCH` | `/api/tickets/{id}` | Recibe `{ "estado": ... }` o `{ "agenteId": ... }`. Responde 400, 404 o 409 ante errores. |

## Pruebas y análisis

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta las 34 pruebas. |
| `npm run coverage` | Pruebas con reporte de cobertura. |
| `npm run analisis:metricas` | Complejidad, longitud de funciones, profundidad y números mágicos. |
| `npm run analisis:dup` | Duplicación de código con jscpd. |
| `npm run analisis:any` | Usos de `any`. |
| `scripts/comparar-versiones.sh todo` | Ejecuta las pruebas sobre la versión inicial y la refactorizada. |
| `scripts/escenarios-externos.sh <url>` | Prueba la API como cliente externo. |

## Estructura

```
app/
  api/chat/route.ts        Conecta los adaptadores con el handler del chat
  api/tickets/             Rutas de incidencias
  lib/chat/                Handler, prompt, interfaces, adaptador de Anthropic y modelos
  lib/rag.ts               Recuperación de contexto desde Bedrock
  lib/incidencias.ts       Dominio y persistencia de incidencias
components/                Interfaz de usuario
data/agentes.json          Agentes con datos sintéticos
docs/                      Documentación y evidencias del TPI
scripts/                   Comparación de versiones, modelo simulado y escenarios externos
tests/                     Pruebas de caracterización, del handler y de incidencias
```

## Documentación del TPI

| Etapa | Documento |
|---|---|
| 1. Sistema base | [`docs/ORIGEN.md`](docs/ORIGEN.md) |
| 2 y 3. Calidad externa e interna, deuda técnica y code smells | [`docs/diagnostico.md`](docs/diagnostico.md), [`docs/calidad-externa.md`](docs/calidad-externa.md) |
| 4 y 5. SOLID, Clean Code y refactoring seguro | [`docs/refactorings.md`](docs/refactorings.md) |
| 6. Pruebas y verificación | [`docs/pruebas.md`](docs/pruebas.md) |
| 7. Code review | [`docs/code-review.md`](docs/code-review.md) |
| 8. Conclusiones | [`docs/conclusiones.md`](docs/conclusiones.md) |
| Uso de IA | [`docs/ia/registro-prompts.md`](docs/ia/registro-prompts.md) |
| Evidencias | [`docs/evidencias/`](docs/evidencias/) |

## Tags

| Tag | Hito |
|---|---|
| `upstream-original` | Código original sin cambios |
| `estado-inicial` | Sistema base del TPI |
| `etapa-diagnostico` | Pruebas de caracterización y diagnóstico |
| `etapa-refactoring` | Refactorings y correcciones |
| `etapa-pruebas` | Evidencia de verificación antes y después |
| `etapa-docs` | Documentación final |
| `estado-refactorizado` y `estadorefactorizado` | Estado final del código |

`estadorefactorizado` existe porque la consigna escribe el tag sin guion. Ambos apuntan al mismo commit.

## Uso de inteligencia artificial

Se usó Claude Code durante todo el trabajo. La herramienta, la finalidad y el grado de intervención de cada interacción están en [`docs/ia/registro-prompts.md`](docs/ia/registro-prompts.md).

## Licencia

MIT. Ver [`LICENSE`](LICENSE).
