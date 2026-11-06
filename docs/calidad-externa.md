# Guía: evaluar la calidad externa sin API key

La calidad externa se evalúa como caja negra: lo que observa un usuario en la interfaz o un cliente de la API. El modelo de Anthropic es una dependencia externa, así que se reemplaza por `scripts/modelo-falso.mjs`, un servidor local que responde con el mismo formato que la API real.

Requisito: haber ejecutado `npm install` en el repositorio.

## 1. Levantar el modelo falso

```bash
node scripts/modelo-falso.mjs
```

Queda escuchando en `http://localhost:4599`. Elige la respuesta según el mensaje del usuario:

| Si el mensaje contiene | Respuesta del modelo falso |
|---|---|
| "agente" o "humano" | Deriva a un agente humano |
| "json" | Texto que no es JSON |
| "falla" | Error HTTP 500 del proveedor |
| Cualquier otro texto | Respuesta normal |

## 2. Levantar la versión final

En otra terminal, desde la raíz del repositorio:

```bash
ANTHROPIC_API_KEY=falsa ANTHROPIC_BASE_URL=http://localhost:4599 npm run dev
```

Abrir `http://localhost:3000`.

## 3. Levantar la versión inicial

En otra terminal, desde la raíz del repositorio:

```bash
git worktree add ../tpi-estado-inicial estado-inicial
ln -s "$PWD/node_modules" ../tpi-estado-inicial/node_modules
cd ../tpi-estado-inicial
ANTHROPIC_API_KEY=falsa ANTHROPIC_BASE_URL=http://localhost:4599 npx next dev -p 3001
```

Abrir `http://localhost:3001`. Al terminar, desde el repositorio principal:

```bash
git worktree remove --force ../tpi-estado-inicial
```

## 4. Escenarios en la interfaz

La interfaz usa por defecto la base de conocimiento `your-knowledge-base-id`. Sin credenciales de AWS, la recuperación falla y la aplicación responde sin contexto. Ese es el comportamiento esperado y también es una evidencia de degradación controlada.

| Escenario | Mensaje a escribir | Resultado esperado en ambas versiones |
|---|---|---|
| Consulta normal | "¿Dónde veo mis facturas?" | Respuesta, estado de ánimo y preguntas sugeridas |
| Derivación | "Quiero hablar con un agente" | Aviso de derivación a un agente humano |
| Respuesta inválida del modelo | "Probar json" | Mensaje de error, sin que la aplicación se rompa |
| Falla del proveedor | "Simular falla" | Mensaje de error, sin que la aplicación se rompa |

Después de la derivación, abrir `http://localhost:3000/api/tickets` para ver el ticket creado.

## 5. Escenarios de la API

Con la aplicación levantada:

```bash
scripts/escenarios-externos.sh http://localhost:3000   # versión final
scripts/escenarios-externos.sh http://localhost:3001   # versión inicial
```

Las salidas de referencia están en `docs/evidencias/calidad-externa/`.

## 6. Capturas para el informe

| # | Captura | Versión |
|---|---|---|
| C1 | Conversación con respuesta normal | Final |
| C2 | Derivación a agente y `/api/tickets` con el ticket creado | Final |
| C3 | Mensaje de error ante "Simular falla" | Final |
| C4 | DevTools, pestaña Network, pedido a `/api/chat`, encabezado `X-Debug-Data` | Inicial y final |
| C5 | Terminal con escenarios 5 y 6 de `escenarios-externos.sh` | Inicial y final |

C4 es la captura más importante: en la versión inicial el encabezado muestra `anthropicKeySlice` con el inicio de la API key; en la final ya no aparece.

## Limitación

Con el modelo falso no se evalúa la calidad de las respuestas del modelo real: precisión, tono ni clasificación. Se evalúa el comportamiento de la aplicación frente a cada tipo de respuesta.
