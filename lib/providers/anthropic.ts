// Anthropic's hosted Claude models, called through the official SDK. Paid per
// use; this is what the deployed demo runs on. The API key is read from the
// ANTHROPIC_API_KEY environment variable on the server and never reaches the browser.
import Anthropic from '@anthropic-ai/sdk';
import type { AssistantMessage, Message, Provider, TurnRequest } from './types';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

// If the model declines a request, let the API retry it on the fallback model
// Anthropic recommends. Haiku models have no fallback and must not be sent this option.
const USE_FALLBACK = !MODEL.includes('haiku');

type MessageParam = Anthropic.Beta.BetaMessageParam;
type ContentBlockParam = Anthropic.Beta.BetaContentBlockParam;

// Our message format -> Anthropic's.
function toAnthropic(messages: Message[]): MessageParam[] {
  const result: MessageParam[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      result.push({ role: 'user', content: message.content });
    } else if (message.role === 'assistant') {
      // Within one question, send the model's own reply back exactly as it came,
      // because it can contain reasoning blocks that must not be altered.
      // Replies rebuilt from earlier questions have no such copy, so build one.
      const rebuilt: ContentBlockParam[] = [
        ...(message.content ? [{ type: 'text' as const, text: message.content }] : []),
        ...message.toolCalls.map((call) => ({
          type: 'tool_use' as const,
          id: call.id,
          name: call.name,
          input: call.args,
        })),
      ];
      result.push({ role: 'assistant', content: (message.raw as ContentBlockParam[] | undefined) ?? rebuilt });
    } else {
      // Lookup results go back as a user message. Every result for one
      // assistant reply has to be in the same message, so join neighbours together.
      const block: ContentBlockParam = {
        type: 'tool_result',
        tool_use_id: message.toolCallId,
        content: message.content,
        is_error: message.isError,
      };
      const previous = result.at(-1);
      if (previous?.role === 'user' && Array.isArray(previous.content) && previous.content[0]?.type === 'tool_result') {
        previous.content.push(block);
      } else {
        result.push({ role: 'user', content: [block] });
      }
    }
  }
  return result;
}

export const anthropic: Provider = {
  name: `anthropic (${MODEL})`,

  async streamTurn({ system, messages, tools, onText }: TurnRequest): Promise<AssistantMessage> {
    // Created here, not at the top of the file, so the app can start without a key
    // when another provider is in use.
    const client = new Anthropic();

    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      // Short factual answers do not need deep reasoning; low effort is faster and cheaper.
      output_config: { effort: 'low' },
      system,
      messages: toAnthropic(messages),
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters as Anthropic.Beta.BetaTool.InputSchema,
      })),
      ...(USE_FALLBACK && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
    });

    stream.on('text', onText);
    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      // A refusal can cut a lookup request off half-written, so never run this reply's lookups.
      const text = 'The model declined to answer that.';
      onText(text);
      return { role: 'assistant', content: text, toolCalls: [] };
    }
    if (message.stop_reason === 'max_tokens') {
      throw new Error('The model ran out of room before finishing its reply.');
    }

    let content = '';
    const toolCalls: AssistantMessage['toolCalls'] = [];
    for (const block of message.content) {
      if (block.type === 'text') content += block.text;
      if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, args: block.input });
    }

    return { role: 'assistant', content, toolCalls, raw: message.content };
  },
};
