import type { RagResult } from "@/app/lib/rag";

// Abstractions the chat handler depends on (DIP). Concrete adapters for
// Bedrock, Anthropic and the ticket store are wired in app/api/chat/route.ts.

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface CompletionRequest {
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
}

export interface ContextRetriever {
  // Must not throw: on failure it returns isRagWorking = false.
  retrieve(query: string, knowledgeBaseId: string): Promise<RagResult>;
}

export interface ModelClient {
  // Returns the model output as a JSON string.
  complete(request: CompletionRequest): Promise<string>;
}

export interface TicketCreator {
  create(query: string, reason: string): Promise<unknown>;
}

export interface ChatDependencies {
  retriever: ContextRetriever;
  modelClient: ModelClient;
  tickets: TicketCreator;
}
