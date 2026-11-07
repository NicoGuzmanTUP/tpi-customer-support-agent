# Conclusiones y aprendizaje

Los IDs `CS-xx` son code smells definidos en `docs/diagnostico.md`, sección 3. Los IDs `OR-xx` son observaciones de revisión definidas en `docs/code-review.md`, sección 2.

## 1. Decisiones tomadas

| Decisión | Motivo | Alternativa descartada |
|---|---|---|
| Usar un proyecto open source real y agregarle un módulo de incidencias | Sus problemas de diseño son reales, no sembrados; el módulo cubre entidades, operaciones y persistencia pedidas | Escribir un prototipo propio con defectos a propósito |
| Escribir pruebas de caracterización antes de refactorizar | Sin pruebas no se puede demostrar que el comportamiento externo se conserva | Refactorizar y probar después |
| Simular solo el SDK de Anthropic y el cliente de Bedrock | Las pruebas siguen válidas aunque la lógica cambie de archivo | Simular funciones internas, que se mueven durante el refactor |
| Fijar el system prompt con un snapshot | El prompt es texto largo; un error de copia no se ve a simple vista | Comparar fragmentos sueltos |
| Separar refactors y correcciones en commits distintos | Permite mostrar que el refactor no cambia el comportamiento y que cada corrección sí lo hace a propósito | Mezclar ambos tipos de cambio |
| Invertir dependencias con interfaces chicas | El handler se prueba con dobles simples, y cambiar de proveedor no obliga a tocarlo | Mantener clientes globales |
| Limitar el refactor al backend | Hay pruebas para el backend y no para la interfaz | Refactorizar también `components/` sin red de seguridad |

## 2. Dificultades

- **Sin API key.** La aplicación depende de Claude y Bedrock. Se resolvió con dobles de prueba en los tests y con `scripts/modelo-falso.mjs` para usar la aplicación real.
- **Comportamiento no determinista.** Las respuestas de un modelo cambian entre ejecuciones. Simular el modelo permitió comparar versiones con resultados fijos.
- **Duplicación invisible para las herramientas.** jscpd informó 0 % de duplicación, pero había funciones y tipos repetidos con pequeñas diferencias (CS-03). Las métricas automáticas no reemplazan la lectura del código.
- **Métricas engañosas.** La cobertura de líneas bajó tras el refactor solo porque un archivo de interfaces no tiene código ejecutable. Hubo que interpretar el número, no solo informarlo.
- **Deuda nueva durante la mejora.** La validación de modelos creó una segunda lista de modelos. El code review la detectó y se corrigió (OR-05).
- **Compatibilidad de herramientas.** Vitest 5 no era compatible con las versiones de tipos del proyecto; se usó Vitest 3.

## 3. Límites del trabajo

- Las pruebas no validan la calidad de las respuestas del modelo real ni la recuperación real desde Bedrock.
- La interfaz (`components/`) no tiene pruebas y quedó fuera del refactor (CS-11 y CS-12).
- La persistencia en JSON sirve para el prototipo, pero no para varias instancias del servidor (OR-09).
- La revisión de código la hicieron el estudiante, que revisó y aprobó los cambios de la IA, y Claude Code como segundo revisor. No participó un revisor externo al trabajo.
- La intervención de la IA fue alta: escribió gran parte del código, las pruebas y la documentación, según consta en `docs/ia/registro-prompts.md`.

## 4. Mejoras pendientes

1. Unificar el contrato de errores y de tickets con la interfaz: OR-01, OR-02 y OR-11.
2. Separar los armadores de respuestas HTTP del handler (OR-12).
3. Reemplazar el archivo JSON por una base de datos (OR-09).
4. Agregar pruebas de interfaz y luego refactorizar `ChatArea.tsx` (CS-11) y la comunicación por eventos (CS-12).
5. Dejar de registrar en consola el motivo de la derivación y los fragmentos recuperados de la base de conocimiento (OR-14).

## 5. Relación con los contenidos de la asignatura

| Contenido | Aplicación en el TPI |
|---|---|
| Calidad externa e interna | El sistema funcionaba para el usuario, pero tres defectos de calidad interna eran visibles desde afuera (`docs/diagnostico.md`, sección 1). |
| Deuda técnica y mantenibilidad | Métricas de complejidad, duplicación y tipado; 13 code smells priorizados. |
| SOLID | SRP al separar módulos y funciones; OCP, ISP y DIP con `ContextRetriever`, `ModelClient` y `TicketCreator`; LSP en el contrato de esas interfaces. |
| Clean Code | Nombres que dicen la verdad (`resultCount`, `MAX_SOURCES_SHOWN`), constantes con nombre, comentarios que explican el porqué y manejo de errores coherente. |
| Refactoring seguro | Extract Method, Move Method, Introduce Parameter Object, Replace Magic Number, Decompose Conditional y Extract Interface, con pruebas en verde en cada commit. |
| Patrones de diseño | `AnthropicModelClient` y `bedrockRetriever` funcionan como Adapter: adaptan cada SDK a una interfaz propia del sistema. |
| Verificación y validación | Pruebas de caracterización, dobles de prueba, snapshot, cobertura, análisis estático y ejecución cruzada entre versiones. |
| Code review | Checklist por categorías, observaciones con severidad y decisión, feedback y criterios de aceptación técnica. |
| Control de versiones | Commits atómicos con Conventional Commits, tags por etapa y comparación de versiones con `git archive`. |

## 6. Reflexión individual

Los conceptos vistos en la materia me resultaron muy útiles para refactorizar el código. Para trabajar con más precisión usé IA y decidí clonar un proyecto de ejemplo de una empresa reconocida de inteligencia artificial. Eso me permitió comprobar que incluso las empresas tecnológicas más grandes no siempre tienen el código más limpio: siempre hay algo para mejorar en un proyecto.

La IA me ayudó a filtrar el código y, al terminar, a hacer una segunda pasada de revisión. Gracias a eso avancé mucho más rápido y pude abarcar el código fuente de la forma más completa posible.

El proyecto tiene evidencia de que fue refactorizado. Entiendo la mayoría de los cambios y podría explicarlos sin problemas. Hay otros puntos más difíciles de entender, en los que solo pude ver la capa externa de lo que se hizo. Aun así, están justificados cuando se entienden el proceso, el criterio y el resultado, que al final es lo que muchas empresas valoran.
