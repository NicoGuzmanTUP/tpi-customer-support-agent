import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { retrieveContext, RAGSource } from "@/app/lib/rag";
import { crearTicket } from "@/app/lib/incidencias";
import crypto from "crypto";
import customerSupportCategories from "@/app/lib/customer_support_categories.json";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Debug message helper function
// Input: message string and optional data object
// Output: JSON string with message, sanitized data, and timestamp
const debugMessage = (msg: string, data: any = {}) => {
  console.log(msg, data);
  const timestamp = new Date().toISOString().replace(/[^\x20-\x7E]/g, "");
  const safeData = JSON.parse(JSON.stringify(data));
  return JSON.stringify({ msg, data: safeData, timestamp });
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

// Helper function to sanitize header values
// Input: string value
// Output: sanitized string (ASCII characters only)
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[^\x00-\x7F]/g, "");
}

// Helper function to log timestamps for performance measurement
// Input: label string and start time
// Output: Logs the duration for the labeled operation
const logTimestamp = (label: string, start: number) => {
  const timestamp = new Date().toISOString();
  const time = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`⏱️ [${timestamp}] ${label}: ${time}s`);
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatResponse = z.infer<typeof responseSchema> & { id: string };

// Main POST request handler
export async function POST(req: Request) {
  const apiStart = performance.now();
  const measureTime = (label: string) => logTimestamp(label, apiStart);

  // Extract data from the request body
  const { messages, model, knowledgeBaseId } = await req.json();
  const latestMessage = messages[messages.length - 1].content;

  console.log("📝 Latest Query:", latestMessage);
  measureTime("User Input Received");

  const debugData = buildDebugData(messages.length, latestMessage);

  measureTime("RAG Start");
  const rag = await retrieveRagContext(latestMessage, knowledgeBaseId);
  measureTime("RAG Complete");

  const systemPrompt = buildSystemPrompt(rag.context, rag.isRagWorking);

  try {
    measureTime("Claude Generation Start");
    const chatResponse = await generateChatResponse(
      messages,
      model,
      systemPrompt,
    );
    measureTime("Claude Generation Complete");

    await registerAgentRedirect(chatResponse, latestMessage);

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
}

// Prepare debug data sent to the client in the X-Debug-Data header
function buildDebugData(messageCount: number, latestMessage: string): string {
  const MAX_DEBUG_LENGTH = 1000;
  return sanitizeHeaderValue(
    debugMessage("🚀 API route called", {
      messagesReceived: messageCount,
      latestMessageLength: latestMessage.length,
      anthropicKeySlice: process.env.ANTHROPIC_API_KEY?.slice(0, 4) + "****",
    }),
  ).slice(0, MAX_DEBUG_LENGTH);
}

// retrieveContext never throws: on failure it returns isRagWorking = false
async function retrieveRagContext(query: string, knowledgeBaseId: string) {
  console.log("🔍 Initiating RAG retrieval for query:", query);
  const result = await retrieveContext(query, knowledgeBaseId);
  if (!result.isRagWorking) {
    console.warn("🚨 RAG Retrieval failed but did not throw!");
  }
  console.log("🔍 RAG Retrieved:", result.isRagWorking ? "YES" : "NO");
  return result;
}

function buildSystemPrompt(
  retrievedContext: string,
  isRagWorking: boolean,
): string {
  // Prepare categories context for the system prompt
  const USE_CATEGORIES = true;
  const categoryListString = customerSupportCategories.categories
    .map((c) => c.id)
    .join(", ");

  const categoriesContext = USE_CATEGORIES
    ? `
    To help with our internal classification of inquiries, we would like you to categorize inquiries in addition to answering them. We have provided you with ${customerSupportCategories.categories.length} customer support categories.
    Check if your response fits into any category and include the category IDs in your "matched_categories" array.
    The available categories are: ${categoryListString}
    If multiple categories match, include multiple category IDs. If no categories match, return an empty array.
  `
    : "";


  // Change the system prompt company for your use case
  return `You are acting as an Anthropic customer support assistant chatbot inside a chat window on a website. You are chatting with a human user who is asking for help about Anthropic's products and services. When responding to the user, aim to provide concise and helpful responses while maintaining a polite and professional tone.

  To help you answer the user's question, we have retrieved the following information for you. It may or may not be relevant (we are using a RAG pipeline to retrieve this information):
  ${isRagWorking ? `${retrievedContext}` : "No information found for this query."}

  Please provide responses that only use the information you have been given. If no information is available or if the information is not relevant for answering the question, you can redirect the user to a human agent for further assistance.

  ${categoriesContext}

  If the question is unrelated to Anthropic's products and services, you should redirect the user to a human agent.

  You are the first point of contact for the user and should try to resolve their issue or provide relevant information. If you are unable to help the user or if the user explicitly asks to talk to a human, you can redirect them to a human agent for further assistance.
  
  To display your responses correctly, you must format your entire response as a valid JSON object with the following structure:
  {
      "thinking": "Brief explanation of your reasoning for how you should address the user's query",
      "response": "Your concise response to the user",
      "user_mood": "positive|neutral|negative|curious|frustrated|confused",
      "suggested_questions": ["Question 1?", "Question 2?", "Question 3?"],
      "debug": {
        "context_used": true|false
      },
      ${USE_CATEGORIES ? '"matched_categories": ["category_id1", "category_id2"],' : ""}
      "redirect_to_agent": {
        "should_redirect": boolean,
        "reason": "Reason for redirection (optional, include only if should_redirect is true)"
      }
    }

  Here are a few examples of how your response should look like:

  Example of a response without redirection to a human agent:
  {
    "thinking": "Providing relevant information from the knowledge base",
    "response": "Here's the information you requested...",
    "user_mood": "curious",
    "suggested_questions": ["How do I update my account?", "What are the payment options?"],
    "debug": {
      "context_used": true
    },
    "matched_categories": ["account_management", "billing"],
    "redirect_to_agent": {
      "should_redirect": false
    }
  }

  Example of a response with redirection to a human agent:
  {
    "thinking": "User request requires human intervention",
    "response": "I understand this is a complex issue. Let me connect you with a human agent who can assist you better.",
    "user_mood": "frustrated",
    "suggested_questions": [],
    "debug": {
      "context_used": false
    },
    "matched_categories": ["technical_support"],
    "redirect_to_agent": {
      "should_redirect": true,
      "reason": "Complex technical issue requiring human expertise"
    }
  }
  `;
}

async function generateChatResponse(
  messages: ChatMessage[],
  model: string,
  systemPrompt: string,
): Promise<ChatResponse> {
  const anthropicMessages: Anthropic.MessageParam[] = messages.map(
    (msg: any) => ({
      role: msg.role,
      content: msg.content,
    }),
  );

  // Prefill: the model continues a JSON object that starts with "{"
  anthropicMessages.push({
    role: "assistant",
    content: "{",
  });

  const response = await client.messages.create({
    model: model,
    max_tokens: 1000,
    messages: anthropicMessages,
    system: systemPrompt,
  });

  const textContent = "{" + response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join(" ");

  const validatedResponse = responseSchema.parse(parseModelJson(textContent));
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
  chatResponse: ChatResponse,
  latestMessage: string,
): Promise<void> {
  if (!chatResponse.redirect_to_agent?.should_redirect) {
    return;
  }
  console.log("🚨 AGENT REDIRECT TRIGGERED!");
  console.log("Reason:", chatResponse.redirect_to_agent.reason);
  try {
    await crearTicket(
      latestMessage,
      chatResponse.redirect_to_agent.reason ?? "Sin motivo informado",
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

  apiResponse.headers.set("X-Debug-Data", sanitizeHeaderValue(debugData));
  return apiResponse;
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
