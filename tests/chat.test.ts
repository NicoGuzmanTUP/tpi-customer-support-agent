import { promises as fs } from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { leerTicketsGuardados, limpiarDatos, prepararDatos } from "./helpers";

// Pruebas de caracterización: fijan el comportamiento externo de POST /api/chat
// en estado-inicial. Solo se simulan los límites externos: el SDK de Anthropic
// y el cliente de Bedrock. Así las pruebas siguen siendo válidas después de
// mover responsabilidades entre archivos.
const { crearMensaje, enviarBedrock } = vi.hoisted(() => ({
  crearMensaje: vi.fn(),
  enviarBedrock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: crearMensaje };
  },
}));

vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => ({
  BedrockAgentRuntimeClient: class {
    send = enviarBedrock;
  },
  RetrieveCommand: class {
    constructor(readonly input: unknown) {}
  },
}));

import { POST } from "@/app/api/chat/route";

const RESPUESTA_VALIDA = {
  thinking: "Razonamiento",
  response: "Respuesta para el usuario",
  user_mood: "curious",
  suggested_questions: ["¿Otra pregunta?"],
  debug: { context_used: true },
  matched_categories: ["billing"],
  redirect_to_agent: { should_redirect: false },
};

// El código agrega "{" como prefill, así que el modelo responde sin la llave inicial.
function respuestaDelModelo(objeto: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(objeto).slice(1) }] };
}

function pedido(cuerpo: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

const CUERPO = {
  messages: [{ role: "user", content: "¿Cómo pago mi factura?" }],
  model: "modelo-de-prueba",
  knowledgeBaseId: "kb-1",
};

const RESULTADOS_BEDROCK = {
  retrievalResults: [
    {
      content: { text: "Primer fragmento" },
      location: { s3Location: { uri: "s3://bucket/guia_de_pagos.txt" } },
      metadata: { "x-amz-bedrock-kb-chunk-id": "chunk-a" },
      score: 0.9,
    },
    {
      content: { text: "Segundo fragmento" },
      location: { s3Location: { uri: "s3://bucket/otra_guia.txt" } },
      score: 0.5,
    },
  ],
};

let directorio: string;

beforeEach(async () => {
  directorio = await prepararDatos();
  crearMensaje.mockReset();
  enviarBedrock.mockReset();
  enviarBedrock.mockResolvedValue(RESULTADOS_BEDROCK);
  crearMensaje.mockResolvedValue(respuestaDelModelo(RESPUESTA_VALIDA));
});

afterEach(async () => {
  await limpiarDatos(directorio);
});

describe("POST /api/chat: respuesta exitosa", () => {
  it("devuelve 200 con la respuesta validada y un id", async () => {
    const respuesta = await POST(pedido(CUERPO));
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("application/json");
    expect(cuerpo).toMatchObject(RESPUESTA_VALIDA);
    expect(cuerpo.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("envía el historial, el modelo y el prefill '{' al SDK", async () => {
    await POST(pedido(CUERPO));

    const parametros = crearMensaje.mock.calls[0][0];
    expect(parametros.model).toBe("modelo-de-prueba");
    expect(parametros.max_tokens).toBe(1000);
    expect(parametros.messages).toEqual([
      { role: "user", content: "¿Cómo pago mi factura?" },
      { role: "assistant", content: "{" },
    ]);
  });

  it("incluye el contexto recuperado y las categorías en el system prompt", async () => {
    await POST(pedido(CUERPO));

    const sistema: string = crearMensaje.mock.calls[0][0].system;
    expect(sistema).toContain("Primer fragmento\n\nSegundo fragmento");
    expect(sistema).toContain("The available categories are:");
    expect(sistema).toContain('"matched_categories"');
  });

  // Fija el texto completo del prompt para detectar cualquier cambio durante el refactor.
  it("mantiene el system prompt idéntico, con y sin contexto", async () => {
    await POST(pedido(CUERPO));
    await POST(pedido({ ...CUERPO, knowledgeBaseId: "" }));

    expect(crearMensaje.mock.calls[0][0].system).toMatchSnapshot();
    expect(crearMensaje.mock.calls[1][0].system).toMatchSnapshot();
  });

  it("consulta Bedrock con la pregunta más reciente y 3 resultados", async () => {
    await POST(pedido(CUERPO));

    expect(enviarBedrock.mock.calls[0][0].input).toEqual({
      knowledgeBaseId: "kb-1",
      retrievalQuery: { text: "¿Cómo pago mi factura?" },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: 3 },
      },
    });
  });

  it("publica solo la primera fuente RAG en x-rag-sources", async () => {
    const respuesta = await POST(pedido(CUERPO));

    expect(JSON.parse(respuesta.headers.get("x-rag-sources")!)).toEqual([
      {
        id: "chunk-a",
        fileName: "guia de pagos",
        snippet: "Primer fragmento",
        score: 0.9,
      },
    ]);
  });

  it("publica datos de depuración en X-Debug-Data", async () => {
    const respuesta = await POST(pedido(CUERPO));
    const depuracion = JSON.parse(respuesta.headers.get("X-Debug-Data")!);

    expect(depuracion.msg).toContain("API route called");
    expect(depuracion.data).toMatchObject({
      messagesReceived: 1,
      latestMessageLength: CUERPO.messages[0].content.length,
    });
  });
});

describe("POST /api/chat: sin contexto RAG", () => {
  it("indica en el prompt que no hay información y omite x-rag-sources", async () => {
    const respuesta = await POST(pedido({ ...CUERPO, knowledgeBaseId: "" }));

    expect(enviarBedrock).not.toHaveBeenCalled();
    expect(crearMensaje.mock.calls[0][0].system).toContain(
      "No information found for this query.",
    );
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("x-rag-sources")).toBeNull();
  });

  it("continúa sin contexto cuando Bedrock falla", async () => {
    enviarBedrock.mockRejectedValue(new Error("Bedrock caído"));

    const respuesta = await POST(pedido(CUERPO));

    expect(respuesta.status).toBe(200);
    expect(crearMensaje.mock.calls[0][0].system).toContain(
      "No information found for this query.",
    );
  });
});

describe("POST /api/chat: errores", () => {
  const ERROR_500 = {
    response:
      "Sorry, there was an issue processing your request. Please try again later.",
    thinking: "Error occurred during message generation.",
    user_mood: "neutral",
    debug: { context_used: false },
  };

  it("devuelve 500 si el modelo no responde JSON", async () => {
    crearMensaje.mockResolvedValue({
      content: [{ type: "text", text: "esto no es JSON" }],
    });

    const respuesta = await POST(pedido(CUERPO));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(ERROR_500);
  });

  it("devuelve 500 si la respuesta no cumple el esquema", async () => {
    crearMensaje.mockResolvedValue(
      respuestaDelModelo({ ...RESPUESTA_VALIDA, user_mood: "eufórico" }),
    );

    const respuesta = await POST(pedido(CUERPO));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(ERROR_500);
  });

  it("devuelve 500 si el SDK lanza un error", async () => {
    crearMensaje.mockRejectedValue(new Error("API caída"));

    const respuesta = await POST(pedido(CUERPO));

    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual(ERROR_500);
  });

  // Cambio intencional (CS-08): antes la promesa se rechazaba con TypeError.
  it("devuelve 400 si el pedido no trae mensajes o es inválido", async () => {
    const sinMensajes = await POST(pedido({ ...CUERPO, messages: [] }));
    const malformado = await POST(
      new Request("http://localhost/api/chat", { method: "POST", body: "{" }),
    );

    expect(sinMensajes.status).toBe(400);
    expect(await sinMensajes.json()).toEqual({ error: "Invalid chat request" });
    expect(malformado.status).toBe(400);
    expect(crearMensaje).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat: derivación a agente", () => {
  it("crea un ticket abierto con la consulta y el motivo", async () => {
    crearMensaje.mockResolvedValue(
      respuestaDelModelo({
        ...RESPUESTA_VALIDA,
        redirect_to_agent: { should_redirect: true, reason: "Caso complejo" },
      }),
    );

    const respuesta = await POST(pedido(CUERPO));
    const tickets = await leerTicketsGuardados(directorio);

    expect(respuesta.status).toBe(200);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toMatchObject({
      consulta: "¿Cómo pago mi factura?",
      motivo: "Caso complejo",
      estado: "abierto",
      agenteId: null,
    });
  });

  it("usa un motivo por defecto si el modelo no informa uno", async () => {
    crearMensaje.mockResolvedValue(
      respuestaDelModelo({
        ...RESPUESTA_VALIDA,
        redirect_to_agent: { should_redirect: true },
      }),
    );

    await POST(pedido(CUERPO));

    const [ticket] = await leerTicketsGuardados(directorio);
    expect(ticket.motivo).toBe("Sin motivo informado");
  });

  it("no crea tickets si no hay derivación", async () => {
    await POST(pedido(CUERPO));

    expect(await leerTicketsGuardados(directorio)).toEqual([]);
  });

  it("responde 200 aunque falle el guardado del ticket", async () => {
    const archivo = path.join(directorio, "no-es-directorio");
    await fs.writeFile(archivo, "");
    process.env.INCIDENCIAS_DATA_DIR = archivo;
    crearMensaje.mockResolvedValue(
      respuestaDelModelo({
        ...RESPUESTA_VALIDA,
        redirect_to_agent: { should_redirect: true, reason: "Caso complejo" },
      }),
    );

    const respuesta = await POST(pedido(CUERPO));

    expect(respuesta.status).toBe(200);
  });
});
