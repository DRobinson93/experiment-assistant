// Ollama: a model running on this computer. Free, used for local development.
import { readJsonLines } from '../jsonLines';
import type { AssistantMessage, Message, Provider, ToolCall, TurnRequest } from './types';

const URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/chat';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

// One line of Ollama's streamed reply.
interface OllamaChunk {
  message?: {
    content?: string;
    tool_calls?: { function: { name: string; arguments: unknown } }[];
  };
  error?: string;
}

// Our message format -> Ollama's.
function toOllama(message: Message) {
  switch (message.role) {
    case 'user':
      return { role: 'user', content: message.content };
    case 'assistant':
      return {
        role: 'assistant',
        content: message.content,
        tool_calls: message.toolCalls.map((call) => ({ function: { name: call.name, arguments: call.args } })),
      };
    case 'tool':
      return { role: 'tool', tool_name: message.name, content: message.content };
  }
}

export const ollama: Provider = {
  name: `ollama (${MODEL})`,

  async streamTurn({ system, messages, tools, onText }: TurnRequest): Promise<AssistantMessage> {
    const response = await fetch(URL, {
      method: 'POST',
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        // The model's separate "thinking" step made answers about ten times slower.
        think: false,
        messages: [{ role: 'system', content: system }, ...messages.map(toOllama)],
        tools: tools.map((tool) => ({ type: 'function', function: tool })),
      }),
    });
    if (!response.ok || !response.body) {
      throw new Error(`Ollama answered ${response.status}: ${await response.text()}`);
    }

    let content = '';
    const toolCalls: ToolCall[] = [];

    for await (const chunk of readJsonLines<OllamaChunk>(response.body)) {
      if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
      const text = chunk.message?.content;
      if (text) {
        content += text;
        onText(text);
      }
      for (const call of chunk.message?.tool_calls ?? []) {
        // Ollama does not number its tool calls, so we make our own ids.
        toolCalls.push({ id: crypto.randomUUID(), name: call.function.name, args: call.function.arguments });
      }
    }

    return { role: 'assistant', content, toolCalls };
  },
};
