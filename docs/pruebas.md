# Pruebas y verificación del comportamiento

Objetivo: demostrar que el refactor no alteró el comportamiento externo y que los únicos cambios observables son las dos correcciones intencionales.

## Estrategia

1. **Pruebas de caracterización.** Antes de refactorizar se escribieron pruebas que describen el comportamiento de `estado-inicial`, incluido un comportamiento no deseado (CS-08).
2. **Snapshot del system prompt.** Fija el texto completo enviado al modelo, con y sin contexto RAG.
3. **Límites externos simulados.** Solo se reemplazan el SDK de Anthropic y el cliente de Bedrock. La lógica propia se ejecuta completa, por eso las mismas pruebas sirven aunque el código cambie de archivo.
4. **Ejecución cruzada.** La misma suite se ejecuta sobre la versión inicial y sobre la refactorizada.
5. **Una prueba verde por commit.** Cada commit de refactor se verificó con `npm test` antes de continuar.

Limitación: las pruebas no llaman al modelo real ni a Bedrock. Validan la lógica de la aplicación, no la calidad de las respuestas del modelo.

## Ejecución cruzada

Comando, reproducible desde la raíz del repositorio:

```bash
scripts/comparar-versiones.sh todo
```

| Corrida | Código | Pruebas | Resultado | Log |
|---|---|---|---|---|
| A | `estado-inicial` | Caracterización (`27039b4`) | 30 de 30 | `evidencias/comparacion/A-inicial-con-tests-caracterizacion.log` |
| B | Último refactor, antes de las correcciones (`d63f5c1`) | Caracterización (`27039b4`) | 30 de 30 | `evidencias/comparacion/B-refactor-con-tests-caracterizacion.log` |
| C | `etapa-refactoring` | Finales | 34 de 34 | `evidencias/comparacion/C-final-con-tests-finales.log` |
| D | `estado-inicial` | Finales | 28 de 32, 4 fallan | `evidencias/comparacion/D-inicial-con-tests-finales.log` |

Lectura:

- **A y B** prueban que los seis refactorings conservaron el comportamiento externo: la misma suite pasa completa antes y después.
- **C** prueba que la versión final es estable.
- **D** prueba que las pruebas detectan las correcciones. Sobre el código original fallan solo las 4 pruebas ligadas a CS-08 y CS-10. `chat-handler.test.ts` no se puede ejecutar porque el handler con dependencias inyectadas no existe en esa versión, lo cual es esperado.

## Casos de prueba

Resultado "Antes" = código de `estado-inicial`. Resultado "Después" = código de `etapa-refactoring`.

### Chat: `POST /api/chat` (`tests/chat.test.ts`)

| ID | Caso | Entrada | Resultado esperado | Antes | Después |
|---|---|---|---|---|---|
| CH-01 | Respuesta exitosa | Pedido válido; el modelo responde JSON válido | 200, cuerpo validado con `id` | ✓ | ✓ |
| CH-02 | Llamada al modelo | Pedido válido | Envía historial, modelo, 1000 tokens y prefill `{` | ✓ | ✓ |
| CH-03 | Contenido del prompt | Bedrock devuelve 2 fragmentos | El prompt incluye contexto y categorías | ✓ | ✓ |
| CH-04 | Prompt idéntico | Pedido con y sin base de conocimiento | Texto igual al snapshot | ✓ | ✓ |
| CH-05 | Consulta a Bedrock | Pedido válido | Pregunta más reciente, 3 resultados | ✓ | ✓ |
| CH-06 | Fuentes RAG | 2 resultados | `x-rag-sources` con solo la primera fuente | ✓ | ✓ |
| CH-07 | Datos de depuración | Pedido válido | `X-Debug-Data` con cantidad y longitud de mensajes | ✗ (incluía prefijo de key) | ✓ |
| CH-08 | Sin exponer la key | `ANTHROPIC_API_KEY` definida | `X-Debug-Data` sin la key | ✗ | ✓ |
| CH-09 | Sin base de conocimiento | `knowledgeBaseId` vacío | No consulta Bedrock; prompt sin contexto; sin `x-rag-sources` | ✓ | ✓ |
| CH-10 | Bedrock caído | Bedrock lanza error | 200, prompt sin contexto | ✓ | ✓ |
| CH-11 | Modelo responde texto no JSON | Texto inválido | 500 con mensaje de error | ✓ | ✓ |
| CH-12 | Respuesta fuera de esquema | `user_mood` inválido | 500 con mensaje de error | ✓ | ✓ |
| CH-13 | Falla del SDK | El SDK lanza error | 500 con mensaje de error | ✓ | ✓ |
| CH-14 | Pedido inválido | Sin mensajes o JSON malformado | 400, sin llamar al modelo | ✗ (rechazaba la promesa) | ✓ |
| CH-15 | Modelo no permitido | `model: "otro-modelo"` | 400, sin llamar al modelo | ✗ (lo aceptaba) | ✓ |
| CH-16 | Derivación a agente | `should_redirect: true` con motivo | 200 y ticket abierto con consulta y motivo | ✓ | ✓ |
| CH-17 | Derivación sin motivo | `should_redirect: true` sin motivo | Ticket con "Sin motivo informado" | ✓ | ✓ |
| CH-18 | Sin derivación | `should_redirect: false` | No crea tickets | ✓ | ✓ |
| CH-19 | Falla al guardar ticket | Directorio de datos inválido | 200 igualmente | ✓ | ✓ |

### Handler con dependencias inyectadas (`tests/chat-handler.test.ts`)

| ID | Caso | Resultado esperado | Antes | Después |
|---|---|---|---|---|
| HD-01 | Usa las dependencias recibidas | Llama al recuperador y al modelo inyectados | No aplica | ✓ |
| HD-02 | Registra tickets por la dependencia | Llama a `tickets.create` con consulta y motivo | No aplica | ✓ |

### Incidencias (`tests/incidencias.test.ts`)

| ID | Caso | Resultado esperado | Antes | Después |
|---|---|---|---|---|
| IN-01 | Sin archivo de tickets | Lista vacía | ✓ | ✓ |
| IN-02 | Crear ticket | Abierto, sin agente y guardado en JSON | ✓ | ✓ |
| IN-03 | 10 creaciones en paralelo | Se conservan los 10 tickets | ✓ | ✓ |
| IN-04 | Ciclo completo de estados | abierto, en progreso, resuelto, cerrado | ✓ | ✓ |
| IN-05 | Transición inválida | Error de conflicto | ✓ | ✓ |
| IN-06 | Operación fallida | No modifica el archivo | ✓ | ✓ |
| IN-07 | Asignar agente | Ticket con `agenteId` | ✓ | ✓ |
| IN-08 | Agente o ticket inexistente | Error "no encontrado" | ✓ | ✓ |
| IN-09 | Asignar ticket cerrado | Error de conflicto | ✓ | ✓ |
| IN-10 | Filtros | Por estado, agente y texto sin distinguir mayúsculas | ✓ | ✓ |
| IN-11 | `GET /api/tickets` | 200 con filtro válido; 400 con filtro inválido | ✓ | ✓ |
| IN-12 | `PATCH /api/tickets/{id}` | Cambia estado o asigna agente | ✓ | ✓ |
| IN-13 | Errores de `PATCH` | 400, 404 y 409 | ✓ | ✓ |

## Métricas antes y después

Evidencias en `evidencias/estado-inicial/` y `evidencias/estado-final/`.

| Métrica | Antes | Después |
|---|---|---|
| Líneas del handler de chat | 197 (`POST`) | 47 (`handleChat`) |
| Complejidad ciclomática del handler | 14 | 3 |
| Advertencias de métricas en el backend (`app/`) | 12 | 1 |
| Advertencias de métricas en todo el proyecto | 47 | 36 |
| Usos de `any` | 17 | 12, todos en `components/` |
| Duplicación textual (jscpd) | 0 % | 0 % |
| Cobertura de ramas | 88,78 % | 94,01 % |
| Cobertura de líneas | 97,56 % | 93,91 % |
| Pruebas | 30 | 34 |

La cobertura de líneas baja porque `app/lib/chat/ports.ts` contiene solo interfaces de TypeScript: no genera código ejecutable y v8 lo informa con 0 %. Sin ese archivo, todos los módulos del backend tienen 94 % o más de líneas cubiertas.

La advertencia restante del backend es `buildSystemPrompt`, cuyas líneas son casi todas texto del prompt. Las demás advertencias están en `components/`, fuera del alcance.

## Verificaciones adicionales

| Verificación | Resultado | Evidencia |
|---|---|---|
| `tsc --noEmit` | Sin errores | `evidencias/estado-final/00-typecheck.log` |
| `next lint` | Sin advertencias | `evidencias/estado-final/00-next-lint.log` |
| `next build` | Compila las 5 rutas | Ejecución manual |
