// Models the UI offers (components/ChatArea.tsx). The API accepts only these,
// so a client cannot choose a more expensive model.
export const ALLOWED_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
] as const;
