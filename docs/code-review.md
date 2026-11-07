# Code review profesional

Alcance: código del backend modificado entre `estado-inicial` y `etapa-refactoring` (`app/api/`, `app/lib/`) y su integración con `components/ChatArea.tsx`.

Proceso:

1. Definir la checklist y los criterios de aceptación técnica antes de revisar.
2. Revisar el diff `git diff estado-inicial etapa-refactoring -- app components`.
3. Registrar cada observación con categoría, severidad y decisión.
4. Corregir las observaciones aceptadas en commits que citan su ID.
5. Verificar los criterios de aceptación sobre la versión corregida.

Revisores: el estudiante revisó y aprobó los cambios producidos por la IA, sección por sección, en la sesión 4 de `docs/ia/registro-prompts.md`. Claude Code actuó como segundo revisor. La revisión se hizo con una checklist fija para reducir el sesgo del autor.

Limitación: la entrega es individual y no participó un revisor externo al trabajo.

## 1. Checklist técnica

Categorías tomadas del material de la cátedra (Semana III: Clean Code y code review).

La columna "Observaciones" cita IDs `OR-xx` (observaciones de revisión). Cada uno se define en la sección 2, con su ubicación, severidad y decisión.

| # | Categoría | Pregunta | Resultado | Observaciones |
|---|---|---|---|---|
| 1 | Lógica y funcionalidad | ¿El código hace lo que debe? | Sí | 34 pruebas en verde y escenarios externos iguales a la versión inicial |
| 2 | Lógica y funcionalidad | ¿Cubre casos de borde? | Parcial | OR-01, OR-02 |
| 3 | Legibilidad | ¿Los nombres son descriptivos? | Sí | OR-04 |
| 4 | Legibilidad | ¿Los comentarios explican el porqué y no repiten el código? | No | OR-03 |
| 5 | Legibilidad | ¿Lo entiende un desarrollador nuevo sin preguntar? | Sí | `route.ts` muestra las dependencias; `handleChat` describe el flujo en pasos con nombre |
| 6 | Diseño y arquitectura | ¿Cada módulo tiene una responsabilidad (SRP)? | Mayormente | OR-12 |
| 7 | Diseño y arquitectura | ¿Hay duplicación (DRY)? | Sí | OR-05 |
| 8 | Diseño y arquitectura | ¿Depende de abstracciones (DIP)? | Sí | El handler recibe `ContextRetriever`, `ModelClient` y `TicketCreator` |
| 9 | Diseño y arquitectura | ¿Está en la capa correcta? | Sí | UI en `components/`, lógica en `app/lib/`, rutas HTTP en `app/api/` |
| 10 | Seguridad | ¿Hay datos sensibles expuestos en respuestas o logs? | Parcial | OR-06, OR-07, OR-14 |
| 11 | Seguridad | ¿Se valida la entrada externa? | Sí | Cuerpo del chat, modelo y filtros de tickets validados con zod |
| 12 | Rendimiento | ¿Hay trabajo innecesario? | Sí | OR-08 |
| 13 | Rendimiento | ¿Escala la persistencia? | No | OR-09 |
| 14 | Manejo de errores | ¿Los errores tienen una forma coherente? | Parcial | OR-11 |
| 15 | Pruebas | ¿Los cambios tienen pruebas y métricas confiables? | Sí | OR-10 |
| 16 | Documentación | ¿El README describe el proyecto actual? | Sí, tras OR-13 | OR-13 |

## 2. Observaciones

Severidad: **Alta** bloquea la aprobación; **Media** debe resolverse o justificarse; **Baja** es una mejora.

| ID | Categoría | Ubicación | Observación | Severidad | Decisión |
|---|---|---|---|---|---|
| OR-01 | Funcionalidad | `app/lib/chat/handler.ts`, `registerAgentRedirect` | Si falla el guardado del ticket, el error solo se registra en consola. El usuario ve la derivación, pero no existe ticket. | Media | Postergada: informar el fallo exige cambiar el contrato con la UI |
| OR-02 | Funcionalidad | `buildSuccessResponse` | Los fragmentos RAG viajan en el encabezado `x-rag-sources`. Un fragmento largo puede superar el límite de tamaño de encabezados. Comportamiento heredado del original. | Media | Postergada: moverlo al cuerpo exige cambiar `ChatArea.tsx` |
| OR-03 | Legibilidad | `handler.ts`: comentarios "Input/Output" | Repiten la firma de la función y no aportan información. | Baja | **Corregida** |
| OR-04 | Legibilidad | `handler.ts`: `"Sin motivo informado"` | Texto literal dentro de la lógica. Además, el código mezcla idiomas: el original está en inglés y el dominio de incidencias en español. | Baja | **Corregida** con `DEFAULT_REDIRECT_REASON`. Convención: cada módulo conserva su idioma |
| OR-05 | Diseño (DRY) | `app/lib/chat/models.ts` y `components/ChatArea.tsx` | La lista de modelos estaba duplicada. Si se agrega un modelo en la UI y no en la API, la API lo rechaza. | Media | **Corregida**: `AVAILABLE_MODELS` es la única fuente |
| OR-06 | Seguridad | `handler.ts`: logs de la consulta | Se registraba en consola el texto completo de cada consulta. Puede contener datos personales. | Media | **Corregida**: se registra solo la longitud |
| OR-07 | Seguridad | `app/lib/rag.ts:13-20` | Usa aserciones `!` sobre credenciales de AWS y registra si existen. No expone valores, pero oculta una configuración incompleta. | Baja | Aceptada: sin credenciales la recuperación falla de forma controlada |
| OR-08 | Rendimiento | `handler.ts`, `debugMessage` | `JSON.parse(JSON.stringify(data))` copiaba datos que luego se serializaban de nuevo. Además se limpiaban caracteres no ASCII de una fecha ISO, que siempre es ASCII. Detectado después: `sanitizeHeaderValue` se aplicaba dos veces al mismo valor de `X-Debug-Data`. | Baja | **Corregida**, incluida la doble sanitización |
| OR-09 | Rendimiento | `app/lib/incidencias.ts` | Cada operación lee y reescribe todo el archivo JSON. La cola solo serializa escrituras dentro de un proceso. | Media | Aceptada para el prototipo; documentada como mejora futura (base de datos) |
| OR-10 | Pruebas | `app/lib/chat/ports.ts` | v8 informa 0 % de cobertura porque el archivo solo tiene interfaces, lo que baja la cobertura total. | Baja | Aceptada: explicada en `docs/pruebas.md` |
| OR-11 | Manejo de errores | `buildErrorResponse` | La respuesta 500 no tiene `id` ni `suggested_questions`; la 400 tiene otra forma. | Media | Postergada: depende del contrato con la UI |
| OR-12 | Diseño (SRP) | `app/lib/chat/handler.ts` (246 líneas) | Combina validación, flujo y armado de respuestas HTTP. | Baja | Postergada: separar los armadores de respuesta en otro módulo |
| OR-13 | Documentación | `README.md` | Describe el quickstart original; no menciona el TPI, las pruebas ni los scripts. | Media | **Corregida**: el README se reescribió en el commit `6315c31` |
| OR-14 | Seguridad | `handler.ts`, `registerAgentRedirect`; `app/lib/rag.ts`, `retrieveContext` | Se registra en consola el motivo de la derivación (`redirect_to_agent.reason`), que redacta el modelo a partir de la consulta y puede contener datos del usuario. También se registran los fragmentos recuperados de la base de conocimiento. | Baja | Postergada: registrar solo la longitud del motivo y quitar el registro de los fragmentos |

## 3. Feedback profesional

Feedback sobre el refactor del handler de chat y el módulo de incidencias:

1. **Buen resultado estructural.** El handler pasó de una función de 197 líneas a pasos con nombre, y sus dependencias se inyectan. Esto permitió probar el flujo con dobles simples. Se recomienda mantener esta forma al agregar funcionalidades.
2. **La duplicación nueva debe evitarse en el mismo cambio.** La validación de modelos creó una segunda lista de modelos. Un cambio que agrega una regla debe dejar una sola fuente de verdad (OR-05).
3. **Los logs también son una interfaz.** Registrar el contenido de las consultas expone datos de usuarios en los logs del servidor. Se recomienda registrar métricas y no contenidos (OR-06).
4. **Los comentarios deben explicar decisiones.** Los comentarios "Input/Output" repetían la firma. Los comentarios útiles del cambio son los que explican por qué: por ejemplo, por qué se muestra una sola fuente RAG (OR-03).
5. **Los contratos con la UI limitan algunas mejoras.** OR-01, OR-02 y OR-11 requieren cambiar respuestas que consume `ChatArea.tsx`. Conviene resolverlos juntos, con pruebas de la interfaz.

## 4. Criterios de aceptación técnica

| # | Criterio | Verificación | Resultado |
|---|---|---|---|
| CA-01 | Compila sin errores de tipos | `npx tsc --noEmit` | Cumple |
| CA-02 | Sin advertencias de lint | `npx next lint` | Cumple |
| CA-03 | Todas las pruebas pasan | `npm test`: 34 de 34 | Cumple |
| CA-04 | El refactor conserva el comportamiento | `scripts/comparar-versiones.sh todo`, corrida B: 30 de 30 | Cumple |
| CA-05 | Los cambios de comportamiento tienen prueba propia | Corrida D: fallan solo las 4 pruebas de CS-08 y CS-10 | Cumple |
| CA-06 | El backend no empeora sus métricas | `npm run analisis:metricas`: 1 advertencia en `app/`, igual que en `etapa-refactoring` | Cumple |
| CA-07 | Sin `any` en el backend | `npm run analisis:any`: en `app/` solo aparece la palabra en un comentario y en el texto del prompt, no como tipo | Cumple |
| CA-08 | Sin datos sensibles en respuestas ni logs | Revisión de `X-Debug-Data` y de los logs del handler | Cumple para las consultas del usuario tras OR-06. Parcial para el motivo de la derivación y los fragmentos RAG (OR-14, postergada) |
| CA-09 | La aplicación compila para producción | `npx next build` | Cumple |
| CA-10 | Observaciones de severidad alta resueltas | Tabla de observaciones | Cumple: no hubo de severidad alta |

## 5. Correcciones realizadas

| Observación | Cambio |
|---|---|
| OR-03 | Se eliminan los comentarios "Input/Output"; queda uno que explica por qué los encabezados se limpian a ASCII. |
| OR-04 | Constante `DEFAULT_REDIRECT_REASON`. |
| OR-05 | `AVAILABLE_MODELS` en `app/lib/chat/models.ts`; la API deriva `ALLOWED_MODELS` y `ChatArea.tsx` importa la lista y el modelo por defecto. |
| OR-06 | El handler registra la longitud de la consulta, no su texto. |
| OR-08 | `debugMessage` serializa una sola vez y `buildSuccessResponse` ya no vuelve a sanitizar `X-Debug-Data`, que `buildDebugData` entrega sanitizado. Las 34 pruebas, `tsc` y `next lint` siguen en verde. |
| OR-13 | El README describe el TPI: origen, funcionalidades, uso con y sin API key, API, pruebas y análisis, estructura, documentación por etapa y tags. |

Todas las correcciones se verificaron con los criterios CA-01 a CA-09.
