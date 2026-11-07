# Registro de uso de inteligencia artificial

Herramienta: Claude Code. Sesiones 1 a 3: modelo Claude Opus 5.5. Sesión 4: modelo Claude Sonnet 5.5.

## Resumen del grado de intervención

| Parte del trabajo | Intervención de la IA | Intervención del estudiante |
|---|---|---|
| Análisis de la consigna y estrategia | Alta: propuso estrategia y calendario | Definió modalidad, fecha y comisión |
| Selección del sistema base | Media: criterios de búsqueda y evaluación | Buscó y eligió el proyecto |
| Módulo de incidencias | Alta: escrito por la IA | Lo pidió y definió persistencia en JSON |
| Pruebas, diagnóstico y refactorings | Alta: escritos por la IA | Pidió avanzar y revisó |
| Evidencias de pruebas y calidad externa | Alta: scripts y documentos escritos por la IA | Pidió la estrategia, revisó y commiteó |
| Code review | Alta: checklist, observaciones y correcciones de la IA | Revisó, pidió mejoras de legibilidad y commiteó |
| Commits y tags | Hasta el pedido 12, la IA hizo los commits; desde el pedido 13, solo los propuso | Desde el pedido 13, hizo y subió los commits |
| Conclusiones | Media: borrador de decisiones, dificultades y límites | Escribe la reflexión individual |

Las respuestas completas de la IA no se transcriben; se registra el resultado de cada interacción. Los pedidos se resumen en las tablas, y solo los más relevantes se transcriben textualmente en la sección final.

## Sesión 1 - 2026-11-01 a 2026-11-05: análisis de la consigna y selección del sistema base

| # | Pedido | Finalidad | Intervención de la IA | Decisión del estudiante |
|---|---|---|---|---|
| 1 | Analizar la consigna, la forma de entrega y una estrategia general (ver textual) | Comprender la consigna | Resumió requisitos, riesgos y una estrategia | Entrega individual |
| 2 | Informar fecha, comisión y modelo de presentación; consultar si se puede usar un repositorio open source existente | Revisar alternativas de sistema base | Analizó la admisibilidad y propuso un calendario | Evaluar un repositorio existente |
| 3 | Cómo buscar en GitHub un proyecto de tamaño acotado y apto para el TPI | Definir criterios de búsqueda | Propuso filtros y comandos de evaluación | Búsqueda y selección del candidato |
| 4 | Opinión sobre el candidato `anthropics/claude-quickstarts/customer-support-agent` | Evaluar el candidato | Inspeccionó código y métricas; opinó en contra | Continuar el análisis |
| 5 | Señalar que el TPI no exige ejecutar el proyecto y proponer adaptarlo (ver textual) | Revisar alternativas | Corrigió su opinión y propuso pruebas con stubs y un módulo de incidencias | Usar este proyecto |
| 6 | Armar el repositorio con el proyecto elegido | Preparar el repositorio | Importó el código, creó el tag `upstream-original` y estos documentos | Usar el proyecto como sistema base |
| 7 | Escribir el módulo de incidencias con persistencia en JSON (ver textual) | Implementar el módulo de incidencias | Escribió el módulo completo, sus rutas y la integración con el chat, y ejecutó verificaciones | Pidió que la IA escriba el módulo y definió persistencia en JSON |
| 8 | Consultar el motivo de este registro | Entender el registro de IA | Explicó que la consigna exige registrar prompts y qué incluía el archivo | Mantener el registro |
| 9 | Consultar qué dice la consigna sobre el uso de IA en el código | Comprender la política de IA de la consigna | Citó el punto 7 de la consigna sobre el uso de IA | Declarar en este registro todo uso de IA |

## Sesión 2 - 2026-11-05: diagnóstico, refactoring y pruebas

| # | Pedido | Finalidad | Intervención de la IA | Decisión del estudiante |
|---|---|---|---|---|
| 10 | Continuar con el trabajo | Avanzar con el trabajo | Creó `estado-inicial`, escribió 29 pruebas de caracterización, ejecutó métricas, redactó `docs/diagnostico.md` y creó `etapa-diagnostico` | Continuar con la IA como asistente de código, declarando su intervención |
| 11 | Resumir el avance y los pendientes | Planificar | Resumió el avance y los pendientes | - |
| 12 | Continuar con la etapa de refactoring | Refactorizar | Escribió y commiteó los refactorings, las correcciones, `docs/refactorings.md` y el tag `etapa-refactoring` | Continuar |
| 13 | Pedir que no haga commits sin consultar y cómo obtener evidencia de estabilidad funcional (ver textual) | Planificar la verificación | Propuso la ejecución cruzada de pruebas entre versiones | Desde aquí, el estudiante hace los commits |
| 14 | Generar la evidencia sin commitear y recomendar el commit | Generar evidencia de pruebas | Escribió `scripts/comparar-versiones.sh` y `docs/pruebas.md`, y generó los logs | Revisó y commiteó |
| 15 | Cómo evaluar la calidad externa sin la API key del proyecto (ver textual) | Revisar alternativas | Propuso reemplazar el modelo por un servidor local simulado | Aceptó la propuesta |
| 16 | Crear el modelo falso, la guía breve y ampliar la sección 1 del diagnóstico | Evaluar calidad externa | Escribió `scripts/modelo-falso.mjs`, `scripts/escenarios-externos.sh` y `docs/calidad-externa.md`, y amplió el diagnóstico | Revisó y commiteó |

## Sesión 3 - 2026-11-06: code review y documentación

| # | Pedido | Finalidad | Intervención de la IA | Decisión del estudiante |
|---|---|---|---|---|
| 17 | Continuar con la etapa siguiente | Code review | Escribió `docs/code-review.md` y aplicó 5 correcciones | Revisó y commiteó |
| 18 | Aclarar dónde se definen los IDs antes de usarlos en las tablas (ver textual) | Mejorar la legibilidad de la documentación | Agregó las aclaraciones pedidas en cuatro documentos | Detectó el problema de legibilidad |
| 19 | Cómo agrupar los commits desde VS Code | Organizar commits | Indicó cómo agrupar los commits en VS Code | Hizo los commits |
| 20 | Crear el tag `etapa-pruebas` | Crear tag | Comprobó que el tag ya existía | Subir tags desde VS Code |
| 21 | Continuar con la etapa 8 | Conclusiones y documentación | Escribió `README.md` y `docs/conclusiones.md`, y actualizó este registro | Debe escribir la reflexión individual |

## Sesión 4 - 2026-11-07: revisión humana sección por sección

El estudiante pidió contrastar el material de la cátedra sobre calidad externa e interna con la implementación, y revisar cada sección del trabajo antes de cerrar. La IA verificó cada afirmación de la documentación contra el código, los logs y los commits, y propuso cambios. El estudiante decidió cuáles aplicar.

| # | Pedido | Finalidad | Intervención de la IA | Decisión del estudiante |
|---|---|---|---|---|
| 22 | Analizar el material sobre calidad externa e interna y cómo se implementó; revisar cada sección antes de cerrar | Revisión final | Contrastó el material con `docs/` y el código, y listó huecos | Revisar por secciones; los tags los crea la IA y los commits los hace el estudiante al terminar |
| 23 | Sección 1: agregar a `ORIGEN.md` lo recomendado | Describir dominio, actores y alcance | Redactó la sección "Dominio, actores y alcance" | Pidió agregarla; cuestionó dos afirmaciones de la IA y se comprobó que `TRANSICIONES` está en `app/lib/incidencias.ts` y que C1 es una captura definida en `docs/calidad-externa.md` |
| 24 | Secciones 2 y 3: aplicar los ajustes propuestos | Calidad externa e interna, smells | Agregó filas de rendimiento y usabilidad, el mapa de atributos internos, el cierre antes/después, la corrección de 653 a 724 líneas y la nota sobre smells no registrados | Aprobó los ajustes |
| 25 | Secciones 4 y 5: aplicar los ajustes propuestos | SOLID, Clean Code y refactorings | Agregó la tabla de Clean Code, matizó SRP y LSP, corrigió el orden de la red de seguridad y aclaró R1, R3 y R6; ejecutó las pruebas en cada commit | Aprobó los ajustes |
| 26 | Sección 6: aplicar todo | Pruebas y verificación | Corrigió el conteo de `any` (11), agregó limitaciones y la fila de escenarios externos, y generó `06-next-build.log` | Aprobó los ajustes |
| 27 | Sección 7: actualizar la línea obsoleta, agregar OR-14 (severidad baja), corregir la doble sanitización y explicar las siglas de `refactorings.md` | Code review | Escribió OR-14, quitó la sanitización redundante en `handler.ts` con las pruebas, `tsc` y lint en verde, y definió las siglas | Eligió registrar OR-14 y corregir el código en lugar de postergarlo; pidió las definiciones de siglas |
| 28 | Cuestionar la frase "falta de revisor humano" | Precisión de la documentación | Reconoció la imprecisión y reescribió la limitación en `code-review.md` y `conclusiones.md` | Detectó el error |

## Prompts textuales seleccionados

Se transcriben los pedidos que definieron el rumbo del trabajo.

- **#1:** "tengo que resolver un TPI que se encuentra en este directorio. Lo voy a resolver de forma individual y con las fuentes que se encuentran en este directorio. quiero que analices @"TPI/TP MS2V2.pdf" , la forma de entrega y cómo podemos preparar la estrategia general para la entrega"
- **#5:** "pero el TPI no pide correr el proyecto, sólo está pidiendo la refactorizacion del mismo, no hace falta que tenga al api key de antropic. tambien una vez clonado el repo, podriamos modificarlo un poco para el fin que se pide en el TPI"
- **#7:** "escribi vos el modulo de incidencias en JSON como uso de memoria"
- **#13:** "no vuelvas a hacer el commit sin haberme preguntado antes. con lo que tengo hasta ahora. como puedo hacer para tener la evidencia del refactor como pide la actividad (Define casos de prueba, capturas o evidencias que respalden la estabilidad funcional) ?"
- **#15:** "cómo podriamos hacer sobre este proyecto el diagnóstico por calidad externa, si no tenemos la api key que exige el proyecto para ser funcional?"
- **#18:** "hay algo que quier que cambies de "code-review" y es que cuando se lee por primera vez "OR-01" no se sabe hasta scrolear hacia mas abajo, lo mismo para las demas. lo que hay que hacer, es que antes del cuadro dejes una aclaracion que esos IDs se definen en la seccion 2. Haz esto mismo para otras secciones si ocurre algo parecido"
