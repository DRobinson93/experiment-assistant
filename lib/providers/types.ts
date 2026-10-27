// The provider interface: the one thing lib/bot.ts needs from a model service.
// Ollama, Anthropic and the scripted mock each implement it, so the rest of the
// app does not know or care which one is answering.

// A lookup the model has asked for.
export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

export interface AssistantMessage {
  role: 'assistant';
  content: string;
  toolCalls: ToolCall[];
  // The provider's own copy of this message, if it needs one sent back unchanged
  // on the next request (Anthropic does, for its reasoning blocks).
  raw?: unknown;
}

// Our own message format. Each provider translates it to and from its wire format.
export type Message =
  | { role: 'user'; content: string }
  | AssistantMessage
  | { role: 'tool'; toolCallId: string; name: string; content: string; isError: boolean };

export interface ToolSpec {
  name: string;
  description: string;
  // JSON Schema for the arguments.
  parameters: Record<string, unknown>;
}

export interface TurnRequest {
  system: string;
  messages: Message[];
  tools: ToolSpec[];
  // Called with each piece of text as the model writes it.
  onText: (delta: string) => void;
}

export interface Provider {
  name: string;
  // Sends the conversation to the model and resolves with its reply once the
  // reply is complete: some text, some lookups to run, or both.
  streamTurn(request: TurnRequest): Promise<AssistantMessage>;
}
