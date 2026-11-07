# Refactorings y aplicación de SOLID y Clean Code

Rango: `etapa-diagnostico..etapa-refactoring`. Cada commit deja las pruebas en verde. Los IDs `CS-xx` son code smells definidos en `docs/diagnostico.md`, sección 3. Los IDs `OR-xx` son observaciones de la revisión, definidas en `docs/code-review.md`, sección 2. Los IDs `R1` a `R6` son los refactorings de este documento. SOLID agrupa cinco principios de diseño: SRP (responsabilidad única), OCP (abierto/cerrado), LSP (sustitución de Liskov), ISP (segregación de interfaces) y DIP (inversión de dependencias).

## Red de seguridad

Antes de modificar la lógica se agregaron 29 pruebas de caracterización (`tests/chat.test.ts`, `tests/incidencias.test.ts`). R1 se verificó con ellas, porque solo mueve funciones y no toca el prompt.

Antes de R2 y R3, que sí afectan el armado del prompt, se agregó un snapshot del system prompt completo, generado y verificado sobre `estado-inicial` (commit `27039b4`). Con el snapshot la suite pasa a 30 pruebas.

Solo se simulan los límites externos: el SDK de Anthropic y el cliente de Bedrock. Por eso las mismas pruebas siguen siendo válidas aunque la lógica cambie de archivo.

## Refactorings

| # | Técnica | Commit | Smell | Resultado |
|---|---|---|---|---|
| R1 | Move Method (mover funciones entre módulos) | `7818d45` | CS-02 (baja cohesión de `utils.ts`), CS-03 (código duplicado) | La recuperación RAG (Retrieval-Augmented Generation: contexto obtenido de una base de conocimiento) pasa de `app/lib/utils.ts` a `app/lib/rag.ts`. La UI (interfaz de usuario) importa `cn` desde `lib/utils.ts` y desaparece la copia duplicada. |
| R2 | Extract Method | `46035f1` | CS-01 (método largo con varias responsabilidades), CS-03, CS-08 (manejo de errores inconsistente) | `POST` delega en 8 funciones con un propósito cada una. Se eliminan la captura duplicada del error de JSON y un `catch` inalcanzable. |
| R3 | Introduce Parameter Object y Move Method | `c6a95be` | CS-06 (bandera siempre `true` y código muerto) | `buildSystemPrompt(context: PromptContext)` en `app/lib/chat/prompt.ts`. Se elimina la bandera `USE_CATEGORIES`, siempre `true`. |
| R4 | Replace Magic Number with Symbolic Constant, Rename y tipado | `e47e7d6` | CS-03, CS-05 (números mágicos), CS-07 (nombre y parámetro engañosos), CS-09 (tipado débil con `any`) | Constantes con nombre, `n` pasa a `resultCount`, filtro repetido unificado en `hasText` y sin `any` en el backend. |
| R5 | Extract Interface e inyección de dependencias | `c6a71d2` | CS-04 (dependencias concretas creadas al importar el módulo) | `createChatHandler(deps)` depende de interfaces. `route.ts` solo conecta los adaptadores. |
| R6 | Decompose Conditional | `d63f5c1` | CS-13 (condición compleja en el filtro) | `filtrarTickets` combina tres predicados con nombre. El mismo commit nombra la constante `JSON_INDENT`. |

### R1. Move Method

Antes, `app/lib/utils.ts` mezclaba una utilidad de estilos con el acceso a Bedrock, y los componentes de UI lo importaban:

```ts
// components/ui/card.tsx (antes)
import { cn } from "@/app/lib/utils"; // este archivo también creaba el cliente de Bedrock
```

Después, cada módulo tiene una sola razón para cambiar:

```ts
// components/ui/card.tsx (después)
import { cn } from "@/lib/utils";
// app/lib/rag.ts: solo recuperación de contexto
```

### R2. Extract Method

Antes, `POST` tenía 197 líneas y complejidad 14. Después, describe el flujo en pasos con nombre:

```ts
const debugData = buildDebugData(messages.length, latestMessage);
const rag = await retrieveRagContext(deps.retriever, latestMessage, knowledgeBaseId);
const systemPrompt = buildSystemPrompt({ ... });
const chatResponse = await generateChatResponse(deps.modelClient, { model, systemPrompt, messages });
await registerAgentRedirect(deps.tickets, chatResponse, latestMessage);
return buildSuccessResponse(chatResponse, rag.ragSources, debugData);
```

### R3. Introduce Parameter Object

```ts
export interface PromptContext {
  retrievedContext: string;
  isRagWorking: boolean;
  categories: SupportCategory[];
}

export function buildSystemPrompt(context: PromptContext): string
```

En el código original no existía una función con una lista larga de parámetros: el prompt se armaba dentro de `POST`. `PromptContext` nace junto con la extracción de `buildSystemPrompt`. Es una aplicación preventiva de Introduce Parameter Object: los datos que el prompt necesita viajan juntos, y agregar uno nuevo no cambia la firma.

El snapshot confirma que el texto generado es idéntico.

### R4. Constantes, nombres y tipos

```ts
// Antes
.slice(0, 1);                       // ¿por qué 1, si se piden n = 3?
// Después
// All retrieved results feed the prompt, but the UI shows only the most relevant source.
const MAX_SOURCES_SHOWN = 1;
```

### R5. Inversión de dependencias

```ts
// app/api/chat/route.ts: raíz de composición
export const POST = createChatHandler({
  retriever: bedrockRetriever,
  modelClient: new AnthropicModelClient(),
  tickets: { create: crearTicket },
});
```

`tests/chat-handler.test.ts` prueba el handler con dobles simples, sin reemplazar módulos.

## Relación con SOLID

| Principio | Aplicación |
|---|---|
| SRP | R1 separa estilos de RAG en módulos distintos. R2 y R3 separan en funciones la lectura del pedido, el prompt (que pasa a `prompt.ts`), la llamada al modelo, los tickets y el armado de la respuesta HTTP. Esas funciones siguen en `handler.ts` (246 líneas); separarlas en módulos queda pendiente (OR-12: `handler.ts` combina validación, flujo y armado de respuestas). |
| OCP | Un proveedor de modelo o de contexto nuevo se agrega implementando `ModelClient` o `ContextRetriever`, sin modificar el handler. |
| LSP | Aplicado a interfaces, no a herencia de clases. Cualquier `ContextRetriever` debe cumplir el contrato documentado en `ports.ts`: no lanzar errores y devolver `isRagWorking = false` ante una falla. `bedrockRetriever` lo cumple con su `try/catch` y los dobles de prueba también. |
| ISP | Tres interfaces chicas (`ContextRetriever`, `ModelClient`, `TicketCreator`) en lugar de un servicio general. |
| DIP | R5: el handler depende de abstracciones; los adaptadores concretos se inyectan en `route.ts`. |

## Relación con Clean Code

Puntos tomados del material de la cátedra (Semana III).

| Punto | Aplicación |
|---|---|
| Nombres claros | `n` pasa a `resultCount` (R4), `hasText` reemplaza un filtro repetido y `DEFAULT_REDIRECT_REASON` reemplaza un texto literal (OR-04: texto literal dentro de la lógica). |
| Funciones pequeñas | `POST` de 197 líneas pasa a `handleChat` de 47, apoyado en funciones de un solo propósito (R2). |
| Manejo de errores | Un pedido inválido responde 400 en lugar de rechazar la promesa (`b21cba4`). Se eliminan un `catch` inalcanzable y la captura duplicada del error de JSON (R2). `parseModelJson` relanza el error con un mensaje claro. |
| Cohesión | `app/lib/utils.ts` se divide: estilos en `lib/utils.ts` y recuperación RAG en `app/lib/rag.ts` (R1). |
| Acoplamiento | El handler recibe sus dependencias por parámetro y no las crea al importar el módulo (R5). |
| Gestión de límites (wrappers) | `AnthropicModelClient` y `bedrockRetriever` envuelven los SDK de terceros. Si cambia la API de un SDK o el proveedor, solo se modifica el adaptador. |

Tensión con el material: el material desaconseja ocultar errores. `registerAgentRedirect` captura el fallo al crear un ticket y solo lo registra en consola. No es un `catch` vacío, pero el usuario no se entera del fallo. Está documentado como OR-01 (fallo al guardar el ticket sin informar al usuario) y se posterga porque informarlo exige cambiar el contrato con la interfaz.

## Correcciones con cambio de comportamiento

Se hicieron en commits separados, cada uno con su prueba actualizada o nueva:

| Commit | Smell | Antes | Después |
|---|---|---|---|
| `b21cba4` | CS-08 | Un pedido sin mensajes rechazaba la promesa con `TypeError`. | Responde 400 sin llamar al modelo. |
| `bd7fafc` | CS-10 (exposición de información y entrada sin validar) | `X-Debug-Data` incluía el prefijo de la API key y se aceptaba cualquier modelo. | El encabezado no incluye la key; solo se aceptan los modelos que ofrece la UI. |

## Pendientes y decisiones

- `buildSystemPrompt` mide 56 líneas, pero casi todas son el texto del prompt, que debe mantenerse idéntico.
- La lista de modelos se unificó en `app/lib/chat/models.ts` (OR-05) y `components/ChatArea.tsx` la importa.
- La respuesta de error 500 mantiene su forma original, sin `id`, para no romper la interfaz.
- El handler registra la longitud de la consulta y no su texto (OR-06). Sigue registrándose el motivo de la derivación y los fragmentos RAG recuperados (OR-14).
- CS-11 (componente `ChatArea` demasiado grande) y CS-12 (acoplamiento por eventos globales entre componentes) quedan como mejoras futuras.
