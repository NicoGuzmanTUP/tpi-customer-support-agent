import { describe, expect, it, vi } from "vitest";
import { createChatHandler } from "@/app/lib/chat/handler";
import type { ChatDependencies } from "@/app/lib/chat/ports";

// Gracias a la inversión de dependencias, el handler se prueba con dobles
// simples, sin reemplazar módulos ni tocar archivos.
function crearDependencias(salidaModelo: object): ChatDependencies {
  return {
    retriever: {
      retrieve: vi.fn().mockResolvedValue({
        context: "Contexto de prueba",
        isRagWorking: true,
        ragSources: [],
      }),
    },
    modelClient: {
      complete: vi.fn().mockResolvedValue(JSON.stringify(salidaModelo)),
    },
    tickets: { create: vi.fn().mockResolvedValue(undefined) },
  };
}

const SALIDA = {
  thinking: "t",
  response: "r",
  user_mood: "neutral",
  suggested_questions: [],
  debug: { context_used: true },
};

function pedido() {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hola" }],
      model: "claude-haiku-4-5-20251001",
      knowledgeBaseId: "kb",
    }),
  });
}

describe("createChatHandler con dependencias inyectadas", () => {
  it("usa el recuperador y el cliente de modelo recibidos", async () => {
    const deps = crearDependencias(SALIDA);

    const respuesta = await createChatHandler(deps)(pedido());

    expect(respuesta.status).toBe(200);
    expect(deps.retriever.retrieve).toHaveBeenCalledWith("Hola", "kb");
    expect(deps.modelClient.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        messages: [{ role: "user", content: "Hola" }],
      }),
    );
    expect(deps.tickets.create).not.toHaveBeenCalled();
  });

  it("registra el ticket mediante la dependencia de tickets", async () => {
    const deps = crearDependencias({
      ...SALIDA,
      redirect_to_agent: { should_redirect: true, reason: "Motivo" },
    });

    await createChatHandler(deps)(pedido());

    expect(deps.tickets.create).toHaveBeenCalledWith("Hola", "Motivo");
  });
});
