// A scripted stand-in for a model. It always asks for the lift ranking and then
// gives a fixed sentence, so the automated tests are fast, free and repeatable.
import type { AssistantMessage, Provider, TurnRequest } from './types';

const REPLY = ['Here are the tests ', 'ranked by lift, ', 'highest first.'];

export const mock: Provider = {
  name: 'mock (scripted)',

  async streamTurn({ messages, onText }: TurnRequest): Promise<AssistantMessage> {
    // First turn of a question: the last message is the user's, so ask for a lookup.
    if (messages.at(-1)?.role === 'user') {
      return {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'mock-1', name: 'get_top_lift', args: { status: 'all' } }],
      };
    }
    // Second turn: the lookup result has come back, so "write" the answer in pieces.
    for (const piece of REPLY) onText(piece);
    return { role: 'assistant', content: REPLY.join(''), toolCalls: [] };
  },
};
