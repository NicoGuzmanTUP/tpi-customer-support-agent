# Refactorings y aplicación de SOLID y Clean Code

Rango: `etapa-diagnostico..etapa-refactoring`. Cada commit deja las pruebas en verde. Los IDs `CS-xx` son code smells definidos en `docs/diagnostico.md`, sección 3.

## Red de seguridad

Antes de modificar el código se agregaron:

- 29 pruebas de caracterización (`tests/chat.test.ts`, `tests/incidencias.test.ts`).
- Un snapshot del system prompt completo, generado y verificado sobre `estado-inicial` (commit `27039b4`).

Solo se simulan los límites externos: el SDK de Anthropic y el cliente de Bedrock. Por eso las mismas pruebas siguen siendo válidas aunque la lógica cambie de archivo.

## Refactorings

| # | Técnica | Commit | Smell | Resultado |
|---|---|---|---|---|
| R1 | Move Method | `7818d45` | CS-02, CS-03 | La recuperación RAG pasa de `app/lib/utils.ts` a `app/lib/rag.ts`. La UI importa `cn` desde `lib/utils.ts` y desaparece la copia duplicada. |
| R2 | Extract Method | `46035f1` | CS-01, CS-03, CS-08 | `POST` delega en 8 funciones con un propósito cada una. Se eliminan la captura duplicada del error de JSON y un `catch` inalcanzable. |
| R3 | Introduce Parameter Object y Move Method | `c6a95be` | CS-06 | `buildSystemPrompt(context: PromptContext)` en `app/lib/chat/prompt.ts`. Se elimina la bandera `USE_CATEGORIES`, siempre `true`. |
| R4 | Replace Magic Number with Symbolic Constant, Rename y tipado | `e47e7d6` | CS-03, CS-05, CS-07, CS-09 | Constantes con nombre, `n` pasa a `resultCount`, filtro repetido unificado en `hasText` y sin `any` en el backend. |
| R5 | Extract Interface e inyección de dependencias | `c6a71d2` | CS-04 | `createChatHandler(deps)` depende de interfaces. `route.ts` solo conecta los adaptadores. |
| R6 | Decompose Conditional | `d63f5c1` | CS-13 | `filtrarTickets` combina tres predicados con nombre. |

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

Los datos que el prompt necesita viajan juntos, y agregar uno nuevo no cambia la firma. El snapshot confirma que el texto generado es idéntico.

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
| SRP | R1 separa estilos de RAG. R2 y R3 separan lectura del pedido, prompt, llamada al modelo, tickets y armado de la respuesta HTTP. |
| OCP | Un proveedor de modelo o de contexto nuevo se agrega implementando `ModelClient` o `ContextRetriever`, sin modificar el handler. |
| LSP | Cualquier `ContextRetriever` debe cumplir el contrato documentado en `ports.ts`: no lanzar errores y devolver `isRagWorking = false` ante una falla. Los dobles de prueba lo respetan. |
| ISP | Tres interfaces chicas (`ContextRetriever`, `ModelClient`, `TicketCreator`) en lugar de un servicio general. |
| DIP | R5: el handler depende de abstracciones; los adaptadores concretos se inyectan en `route.ts`. |

## Correcciones con cambio de comportamiento

Se hicieron en commits separados, cada uno con su prueba actualizada o nueva:

| Commit | Smell | Antes | Después |
|---|---|---|---|
| `b21cba4` | CS-08 | Un pedido sin mensajes rechazaba la promesa con `TypeError`. | Responde 400 sin llamar al modelo. |
| `bd7fafc` | CS-10 | `X-Debug-Data` incluía el prefijo de la API key y se aceptaba cualquier modelo. | El encabezado no incluye la key; solo se aceptan los modelos que ofrece la UI. |

## Pendientes y decisiones

- `buildSystemPrompt` mide 56 líneas, pero casi todas son el texto del prompt, que debe mantenerse idéntico.
- La lista de modelos ahora existe en `app/lib/chat/models.ts` y en `components/ChatArea.tsx`. Unificarla requiere modificar la UI, que quedó fuera del alcance.
- La respuesta de error 500 mantiene su forma original, sin `id`, para no romper la interfaz.
- Se siguen registrando las consultas del usuario en consola.
- CS-11 y CS-12 (componentes de UI) quedan como mejoras futuras.
