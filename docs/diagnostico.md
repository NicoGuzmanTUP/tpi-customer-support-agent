# Diagnóstico del sistema base

Versión analizada: tag `estado-inicial`. Las evidencias están en `docs/evidencias/estado-inicial/`.

Alcance del refactor: `app/api/chat/route.ts`, `app/lib/utils.ts` y `app/lib/incidencias.ts`. Los componentes de interfaz (`components/`) se analizan, pero quedan fuera del refactor por tiempo y por falta de pruebas de interfaz.

## 1. Calidad externa

Desde la mirada del usuario, el sistema cumple su función:

- Responde consultas de soporte usando el contexto recuperado de la base de conocimiento.
- Informa estado de ánimo detectado, preguntas sugeridas y categorías de la consulta.
- Deriva a un agente humano cuando corresponde y registra un ticket.
- Permite consultar, asignar y cambiar el estado de los tickets.
- Ante fallas del modelo, muestra un mensaje de error comprensible.

Evidencia: 29 pruebas de caracterización pasan (`01-tests.log`). Las pruebas simulan el SDK de Anthropic y el cliente de Bedrock, por lo que no verifican el comportamiento real del modelo ni de la base de conocimiento.

## 2. Calidad interna

El buen funcionamiento externo oculta una estructura difícil de mantener:

| Métrica | Valor | Límite usado | Evidencia |
|---|---|---|---|
| Líneas de `POST` en `route.ts` | 197 | 50 | `03-metricas-eslint.log` |
| Complejidad ciclomática de `POST` | 14 | 5 | `03-metricas-eslint.log` |
| Advertencias de métricas en todo el proyecto | 47 | 0 | `03-metricas-eslint.log` |
| Números mágicos detectados | 24 | 0 | `03-metricas-eslint.log` |
| Usos de `any` | 17 | 0 | `05-usos-any.log` |
| Duplicación textual (jscpd) | 0 % | 5 % | `04-duplicacion-jscpd.log` |
| Cobertura de líneas en el alcance | 97,56 % | - | `02-coverage.log` |

jscpd no detecta clones textuales. La duplicación existe, pero es estructural: funciones y tipos repetidos con pequeñas diferencias (ver CS-03).

Relación con la mantenibilidad: cambiar el prompt, el proveedor del modelo o la forma de la respuesta obliga hoy a modificar la misma función de 197 líneas. Las dependencias externas se crean al importar los módulos, así que probarlos exige reemplazar módulos completos. Esto aumenta el costo de cada cambio y el riesgo de regresiones.

## 3. Code smells y debilidades técnicas

Prioridad: **Alta** si afecta seguridad, corrección o bloquea otros refactors; **Media** si afecta legibilidad o mantenibilidad; **Baja** si su impacto es acotado.

| ID | Smell | Ubicación | Evidencia | Impacto | Riesgo de mantenimiento | Prioridad |
|---|---|---|---|---|---|---|
| CS-01 | Long Method y múltiples responsabilidades (SRP) | `app/api/chat/route.ts:65` | `POST` tiene 197 líneas y complejidad 14. Lee el pedido, consulta RAG, arma el prompt, llama al modelo, parsea, valida, crea tickets y arma encabezados. | Difícil de leer, probar y modificar. | Todo cambio toca la misma función. | Alta |
| CS-02 | Baja cohesión en `app/lib/utils.ts` | `app/lib/utils.ts:9-31` | Mezcla `cn`, una utilidad de estilos, con el cliente de Bedrock y la recuperación RAG. Componentes de UI como `components/ui/card.tsx:3` y `components/ui/button.tsx:5` importan este archivo. | Al importar `cn` se crea el cliente de Bedrock y se registra en consola si existen credenciales AWS. | Cambios de RAG impactan la UI y al revés. | Alta |
| CS-03 | Código duplicado estructural | `lib/utils.ts:4` y `app/lib/utils.ts:20`; `app/lib/utils.ts:24` y `components/RightSidebar.tsx:8`; `components/ChatArea.tsx:43` y `components/LeftSidebar.tsx:17`; `components/ChatArea.tsx:51` y `:206`; `app/lib/utils.ts:64` y `:82`; `app/api/chat/route.ts:207-209` y `:249-251` | `cn` existe dos veces; los componentes de UI usan una u otra. Hay tipos y filtros repetidos, y el error de JSON se captura, registra y vuelve a lanzar dos veces. | Cambiar una definición no actualiza sus copias. | Inconsistencias silenciosas. | Media |
| CS-04 | Dependencias concretas globales (DIP) | `app/api/chat/route.ts:8`, `app/lib/utils.ts:12-13` | Los clientes de Anthropic y Bedrock se crean al cargar el módulo; la región está fija en `us-east-1`. | Las pruebas deben reemplazar módulos enteros con `vi.mock`. | Cambiar proveedor o región exige editar código. | Alta |
| CS-05 | Números mágicos y configuración fija | `app/api/chat/route.ts:231` (`max_tokens: 1000`), `:77` (`MAX_DEBUG_LENGTH`), `:82` (`slice(0, 4)`), `app/lib/utils.ts:34` (`n = 3`), `:77` (`slice(0, 1)`) | 24 advertencias `no-magic-numbers` en el proyecto. | El significado de cada valor no es evidente. | Ajustes dispersos y propensos a error. | Media |
| CS-06 | Generalidad especulativa y código muerto | `app/api/chat/route.ts:121` | `USE_CATEGORIES` es siempre `true`; sus ramas alternativas nunca se ejecutan (`02-coverage.log`, línea 133 sin cubrir). | Ruido al leer el prompt. | Lógica que nadie prueba. | Baja |
| CS-07 | Nombre y parámetro engañosos | `app/lib/utils.ts:34` y `:77` | `retrieveContext` acepta `n` resultados, pero `ragSources` siempre devuelve solo el primero. La prueba "publica solo la primera fuente RAG" fija este comportamiento. | Quien lee la firma espera `n` fuentes. | Errores al reutilizar la función. | Media |
| CS-08 | Manejo de errores inconsistente | `app/api/chat/route.ts:70-71`, `:110-116`, `:300` | La lectura del cuerpo está fuera del `try`: un pedido sin mensajes rechaza la promesa (prueba "rechaza la promesa"). `retrieveContext` ya captura sus errores, así que el `catch` de `:110-116` es inalcanzable (líneas sin cubrir). El error 500 no tiene `id` ni `suggested_questions`. | Errores no controlados y respuestas con forma distinta. | El cliente debe contemplar dos formatos. | Alta |
| CS-09 | Tipado débil | `app/lib/utils.ts:64-83`, `app/api/chat/route.ts:15`, `:218`, `components/` | 17 usos de `any` (uno de ellos es texto del prompt). | El compilador no detecta errores de forma. | Fallas en tiempo de ejecución. | Media |
| CS-10 | Exposición de información y entrada sin validar | `app/api/chat/route.ts:70`, `:82`, `:230`, `:292` | El encabezado `X-Debug-Data`, enviado al navegador, incluye el prefijo de la API key. El modelo llega del cliente y se usa sin validar. Se registran las consultas del usuario en consola. | Riesgo de seguridad y de costos. | Difícil de auditar. | Alta |
| CS-11 | God Component (fuera del alcance) | `components/ChatArea.tsx` | Archivo de 653 líneas; `ChatArea` tiene 380 líneas y su envío de mensajes tiene complejidad 11. | Interfaz difícil de modificar. | Alto, pero sin pruebas de UI. | Media, se posterga |
| CS-12 | Acoplamiento por eventos globales (fuera del alcance) | `components/ChatArea.tsx:354-379`, `components/RightSidebar.tsx:103-117` | Los componentes se comunican con eventos de `window` y `as any`. | Dependencias implícitas entre componentes. | Cambios en un evento rompen otro componente sin aviso. | Baja, se posterga |
| CS-13 | Condición compleja en el filtro | `app/lib/incidencias.ts:176` | Complejidad 7 en un solo predicado de filtrado. | Menor legibilidad. | Bajo. | Baja |

## 4. Prioridad de corrección

1. CS-04 y CS-01: separar dependencias y responsabilidades de `POST`. Son la base para los demás cambios.
2. CS-08 y CS-10: corregir errores y exposición de información.
3. CS-02, CS-03 y CS-07: reubicar la lógica RAG y eliminar duplicados.
4. CS-05, CS-06, CS-09 y CS-13: limpieza de legibilidad.
5. CS-11 y CS-12: quedan como mejoras pendientes.

Los cambios que alteran comportamiento externo a propósito (CS-08 y CS-10) se harán en commits separados de los refactors, con la prueba afectada actualizada en el mismo commit.
