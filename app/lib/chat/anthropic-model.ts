import Anthropic from "@anthropic-ai/sdk";
import type { CompletionRequest, ModelClient } from "@/app/lib/chat/ports";

const MAX_RESPONSE_TOKENS = 1000;
// Prefill: the model continues a JSON object that starts with "{".
const JSON_PREFILL = "{";

export class AnthropicModelClient implements ModelClient {
  private readonly client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  async complete(request: CompletionRequest): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "assistant", content: JSON_PREFILL },
    ];

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: MAX_RESPONSE_TOKENS,
      messages,
      system: request.systemPrompt,
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join(" ");
    return JSON_PREFILL + text;
  }
}
