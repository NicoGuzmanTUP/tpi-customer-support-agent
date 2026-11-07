import { z } from "zod";
import crypto from "crypto";
import type { RAGSource } from "@/app/lib/rag";
import { buildSystemPrompt } from "@/app/lib/chat/prompt";
import { ALLOWED_MODELS } from "@/app/lib/chat/models";
import type {
  ChatDependencies,
  CompletionRequest,
  ContextRetriever,
  ModelClient,
  TicketCreator,
} from "@/app/lib/chat/ports";
import customerSupportCategories from "@/app/lib/customer_support_categories.json";

const MAX_DEBUG_LENGTH = 1000;
const MS_PER_SECOND = 1000;
const SECONDS_DECIMALS = 2;

const DEFAULT_REDIRECT_REASON = "Sin motivo informado";

const debugMessage = (msg: string, data: Record<string, unknown> = {}) => {
  console.log(msg, data);
  const timestamp = new Date().toISOString();
  return JSON.stringify({ msg, data, timestamp });
};

// Define the schema for the AI response using Zod
// This ensures type safety and validation for the AI's output
const responseSchema = z.object({
  response: z.string(),
  thinking: z.string(),
  user_mood: z.enum([
    "positive",
    "neutral",
    "negative",
    "curious",
    "frustrated",
    "confused",
  ]),
  suggested_questions: z.array(z.string()),
  debug: z.object({
    context_used: z.boolean(),
  }),
  matched_categories: z.array(z.string()).optional(),
  redirect_to_agent: z
    .object({
      should_redirect: z.boolean(),
      reason: z.string().optional(),
    })
    .optional(),
});

// HTTP header values must be ASCII.
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[^\x00-\x7F]/g, "");
}

const logTimestamp = (label: string, start: number) => {
  const timestamp = new Date().toISOString();
  const time = ((performance.now() - start) / MS_PER_SECOND).toFixed(
    SECONDS_DECIMALS,
  );
  console.log(`⏱️ [${timestamp}] ${label}: ${time}s`);
};

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
  model: z.enum(ALLOWED_MODELS),
  knowledgeBaseId: z.string(),
});
type ChatResponse = z.infer<typeof responseSchema> & { id: string };

// The handler depends only on abstractions; route.ts wires the real adapters.
export function createChatHandler(deps: ChatDependencies) {
  return async function handleChat(req: Request): Promise<Response> {
    const apiStart = performance.now();
    const measureTime = (label: string) => logTimestamp(label, apiStart);

    const request = chatRequestSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!request.success) {
      return buildBadRequestResponse();
    }
    const { messages, model, knowledgeBaseId } = request.data;
    const latestMessage = messages[messages.length - 1].content;

    // Only the length is logged, to keep user content out of server logs.
    console.log("📝 Latest Query length:", latestMessage.length);
    measureTime("User Input Received");

    const debugData = buildDebugData(messages.length, latestMessage);

    measureTime("RAG Start");
    const rag = await retrieveRagContext(
      deps.retriever,
      latestMessage,
      knowledgeBaseId,
    );
    measureTime("RAG Complete");

    const systemPrompt = buildSystemPrompt({
      retrievedContext: rag.context,
      isRagWorking: rag.isRagWorking,
      categories: customerSupportCategories.categories,
    });

    try {
      measureTime("Claude Generation Start");
      const chatResponse = await generateChatResponse(deps.modelClient, {
        model,
        systemPrompt,
        messages,
      });
      measureTime("Claude Generation Complete");

      await registerAgentRedirect(deps.tickets, chatResponse, latestMessage);

      const apiResponse = buildSuccessResponse(
        chatResponse,
        rag.ragSources,
        debugData,
      );
      measureTime("API Complete");
      return apiResponse;
    } catch (error) {
      console.error("💥 Error in message generation:", error);
      return buildErrorResponse();
    }
  };
}

// Prepare debug data sent to the client in the X-Debug-Data header
function buildDebugData(messageCount: number, latestMessage: string): string {
  return sanitizeHeaderValue(
    debugMessage("🚀 API route called", {
      messagesReceived: messageCount,
      latestMessageLength: latestMessage.length,
    }),
  ).slice(0, MAX_DEBUG_LENGTH);
}

async function retrieveRagContext(
  retriever: ContextRetriever,
  query: string,
  knowledgeBaseId: string,
) {
  console.log("🔍 Initiating RAG retrieval");
  const result = await retriever.retrieve(query, knowledgeBaseId);
  if (!result.isRagWorking) {
    console.warn("🚨 RAG Retrieval failed but did not throw!");
  }
  console.log("🔍 RAG Retrieved:", result.isRagWorking ? "YES" : "NO");
  return result;
}

async function generateChatResponse(
  modelClient: ModelClient,
  request: CompletionRequest,
): Promise<ChatResponse> {
  const text = await modelClient.complete(request);
  const validatedResponse = responseSchema.parse(parseModelJson(text));
  return { id: crypto.randomUUID(), ...validatedResponse };
}

// Replace newlines within string values before parsing
function parseModelJson(jsonString: string) {
  const sanitized = jsonString.replace(/(?<=:\s*")(.|\n)*?(?=")/g, (match) =>
    match.replace(/\n/g, "\\n"),
  );

  try {
    return JSON.parse(sanitized);
  } catch (parseError) {
    console.error("Error parsing JSON response:", parseError);
    throw new Error("Invalid JSON response from AI");
  }
}

async function registerAgentRedirect(
  tickets: TicketCreator,
  chatResponse: ChatResponse,
  latestMessage: string,
): Promise<void> {
  if (!chatResponse.redirect_to_agent?.should_redirect) {
    return;
  }
  console.log("🚨 AGENT REDIRECT TRIGGERED!");
  console.log("Reason:", chatResponse.redirect_to_agent.reason);
  try {
    await tickets.create(
      latestMessage,
      chatResponse.redirect_to_agent.reason ?? DEFAULT_REDIRECT_REASON,
    );
  } catch (ticketError) {
    console.error("Error creating ticket:", ticketError);
  }
}

function buildSuccessResponse(
  chatResponse: ChatResponse,
  ragSources: RAGSource[],
  debugData: string,
): Response {
  const apiResponse = new Response(JSON.stringify(chatResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (ragSources.length > 0) {
    apiResponse.headers.set(
      "x-rag-sources",
      sanitizeHeaderValue(JSON.stringify(ragSources)),
    );
  }

  apiResponse.headers.set("X-Debug-Data", debugData);
  return apiResponse;
}

function buildBadRequestResponse(): Response {
  return Response.json({ error: "Invalid chat request" }, { status: 400 });
}

function buildErrorResponse(): Response {
  const errorResponse = {
    response:
      "Sorry, there was an issue processing your request. Please try again later.",
    thinking: "Error occurred during message generation.",
    user_mood: "neutral",
    debug: { context_used: false },
  };
  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
