import { createChatHandler } from "@/app/lib/chat/handler";
import { AnthropicModelClient } from "@/app/lib/chat/anthropic-model";
import { bedrockRetriever } from "@/app/lib/rag";
import { crearTicket } from "@/app/lib/incidencias";

// Composition root: wires the concrete adapters into the chat handler.
export const POST = createChatHandler({
  retriever: bedrockRetriever,
  modelClient: new AnthropicModelClient(),
  tickets: { create: crearTicket },
});
