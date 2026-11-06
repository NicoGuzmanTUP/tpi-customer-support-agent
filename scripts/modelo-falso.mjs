// Servidor local que imita la API de mensajes de Anthropic, para usar la
// aplicación sin API key. Elige la respuesta según el último mensaje del usuario.
//
// Uso:
//   node scripts/modelo-falso.mjs            # puerto 4599
//   PUERTO=5000 node scripts/modelo-falso.mjs
//
// Y en otra terminal:
//   ANTHROPIC_API_KEY=falsa ANTHROPIC_BASE_URL=http://localhost:4599 npm run dev
//
// Palabras clave (sin distinguir mayúsculas):
//   "agente" o "humano"  -> deriva a un agente humano (crea un ticket)
//   "json"               -> responde texto que no es JSON (error de formato)
//   "falla"              -> responde HTTP 500, como una caída del proveedor
//   cualquier otro texto -> respuesta normal
import http from "node:http";

const PUERTO = Number(process.env.PUERTO ?? 4599);

const RESPUESTA_BASE = {
  thinking: "Respuesta simulada por scripts/modelo-falso.mjs",
  user_mood: "curious",
  suggested_questions: [
    "¿Cómo actualizo mis datos de facturación?",
    "¿Dónde veo mi consumo?",
  ],
  debug: { context_used: false },
  matched_categories: ["billing"],
  redirect_to_agent: { should_redirect: false },
};

const ESCENARIOS = [
  {
    nombre: "derivacion",
    coincide: (texto) => /agente|humano/.test(texto),
    responder: () =>
      json({
        ...RESPUESTA_BASE,
        response:
          "Entiendo. Te comunico con un agente humano para que revise tu caso.",
        user_mood: "frustrated",
        suggested_questions: [],
        redirect_to_agent: {
          should_redirect: true,
          reason: "El usuario pidió hablar con una persona",
        },
      }),
  },
  {
    nombre: "json-invalido",
    coincide: (texto) => texto.includes("json"),
    responder: () => mensaje("Esto no es JSON válido."),
  },
  {
    nombre: "falla-proveedor",
    coincide: (texto) => texto.includes("falla"),
    responder: (res) => {
      // x-should-retry evita que el SDK reintente y demore la respuesta.
      res.writeHead(500, {
        "content-type": "application/json",
        "x-should-retry": "false",
      });
      res.end(
        JSON.stringify({
          type: "error",
          error: { type: "api_error", message: "Falla simulada" },
        }),
      );
    },
  },
  {
    nombre: "normal",
    coincide: () => true,
    responder: () =>
      json({
        ...RESPUESTA_BASE,
        response:
          "Podés ver y descargar tus facturas desde la sección Facturación de tu cuenta.",
      }),
  },
];

// La aplicación agrega "{" como prefill, así que el modelo responde sin la llave inicial.
function json(objeto) {
  return mensaje(JSON.stringify(objeto).slice(1));
}

function mensaje(texto) {
  return {
    id: "msg_simulado",
    type: "message",
    role: "assistant",
    model: "modelo-falso",
    content: [{ type: "text", text: texto }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

function ultimoMensajeDelUsuario(pedido) {
  const mensajes = (pedido.messages ?? []).filter((m) => m.role === "user");
  const contenido = mensajes.at(-1)?.content ?? "";
  return typeof contenido === "string"
    ? contenido
    : contenido.map((bloque) => bloque.text ?? "").join(" ");
}

http
  .createServer((req, res) => {
    let cuerpo = "";
    req.on("data", (parte) => (cuerpo += parte));
    req.on("end", () => {
      if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) {
        res.writeHead(404).end();
        return;
      }
      const texto = ultimoMensajeDelUsuario(JSON.parse(cuerpo || "{}"));
      const escenario = ESCENARIOS.find((e) => e.coincide(texto.toLowerCase()));
      console.log(`[modelo-falso] "${texto}" -> ${escenario.nombre}`);

      const respuesta = escenario.responder(res);
      if (respuesta) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(respuesta));
      }
    });
  })
  .listen(PUERTO, () => {
    console.log(`[modelo-falso] escuchando en http://localhost:${PUERTO}`);
  });
