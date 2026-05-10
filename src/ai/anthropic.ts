const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicMessageResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  stop_reason: string;
  model: string;
}

export interface CallClaudeOptions {
  systemPrompt: string;
  userMessage: string;
  tool: object;
  toolName: string;
  model?: string;
  maxTokens?: number;
}

export async function callClaudeForToolUse(opts: CallClaudeOptions): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: opts.systemPrompt,
      messages: [{ role: "user", content: opts.userMessage }],
      tools: [opts.tool],
      tool_choice: { type: "tool", name: opts.toolName },
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as AnthropicMessageResponse;
  const toolUse = json.content.find(
    (b): b is AnthropicToolUseBlock => b.type === "tool_use" && b.name === opts.toolName,
  );
  if (!toolUse) {
    throw new Error(`Claude did not invoke ${opts.toolName} tool`);
  }
  return toolUse.input;
}
