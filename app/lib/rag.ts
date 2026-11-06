import {
  BedrockAgentRuntimeClient,
  KnowledgeBaseRetrievalResult,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const BEDROCK_REGION = process.env.BEDROCK_REGION ?? "us-east-1";
const DEFAULT_RESULT_COUNT = 3;
// All retrieved results feed the prompt, but the UI shows only the most relevant source.
const MAX_SOURCES_SHOWN = 1;
const CHUNK_ID_METADATA_KEY = "x-amz-bedrock-kb-chunk-id";

console.log("🔑 Have AWS AccessKey?", !!process.env.BAWS_ACCESS_KEY_ID);
console.log("🔑 Have AWS Secret?", !!process.env.BAWS_SECRET_ACCESS_KEY);

const bedrockClient = new BedrockAgentRuntimeClient({
  region: BEDROCK_REGION,
  credentials: {
    accessKeyId: process.env.BAWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BAWS_SECRET_ACCESS_KEY!,
  },
});

export interface RAGSource {
  id: string;
  fileName: string;
  snippet: string;
  score: number;
}

export interface RagResult {
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}

type ResultWithText = KnowledgeBaseRetrievalResult & {
  content: { text: string };
};

function emptyResult(): RagResult {
  return { context: "", isRagWorking: false, ragSources: [] };
}

function hasText(result: KnowledgeBaseRetrievalResult): result is ResultWithText {
  return Boolean(result.content?.text);
}

function toRagSource(result: ResultWithText, index: number): RAGSource {
  const uri = result.location?.s3Location?.uri || "";
  const fileName = uri.split("/").pop() || `Source-${index}.txt`;
  const chunkId = result.metadata?.[CHUNK_ID_METADATA_KEY] as string | undefined;

  return {
    id: chunkId || `chunk-${index}`,
    fileName: fileName.replace(/_/g, " ").replace(".txt", ""),
    snippet: result.content.text,
    score: result.score || 0,
  };
}

// Never throws: on any failure it returns isRagWorking = false.
export async function retrieveContext(
  query: string,
  knowledgeBaseId: string,
  resultCount: number = DEFAULT_RESULT_COUNT,
): Promise<RagResult> {
  if (!knowledgeBaseId) {
    console.error("knowledgeBaseId is not provided");
    return emptyResult();
  }

  try {
    const response = await bedrockClient.send(
      new RetrieveCommand({
        knowledgeBaseId,
        retrievalQuery: { text: query },
        retrievalConfiguration: {
          vectorSearchConfiguration: { numberOfResults: resultCount },
        },
      }),
    );

    const results = (response?.retrievalResults ?? []).filter(hasText);
    const ragSources = results.map(toRagSource).slice(0, MAX_SOURCES_SHOWN);
    console.log("🔍 Parsed RAG Sources:", ragSources);

    return {
      context: results.map((result) => result.content.text).join("\n\n"),
      isRagWorking: true,
      ragSources,
    };
  } catch (error) {
    console.error("RAG Error:", error);
    return emptyResult();
  }
}
