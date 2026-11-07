// Single source for the models the UI offers (components/ChatArea.tsx) and the
// API accepts (app/lib/chat/handler.ts), so a client cannot choose another model.
export const AVAILABLE_MODELS = [
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
] as const;

type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];

export const ALLOWED_MODELS = AVAILABLE_MODELS.map((model) => model.id) as [
  ModelId,
  ...ModelId[],
];

export const DEFAULT_MODEL_ID: ModelId = AVAILABLE_MODELS[0].id;
