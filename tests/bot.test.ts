// Tests the tool-calling loop with the scripted mock model, so no real model is needed.
import { describe, expect, it } from 'vitest';
import { runChat } from '../lib/bot';
import type { StreamEvent } from '../lib/events';
import { mock } from '../lib/providers/mock';
import type { Provider } from '../lib/providers/types';

async function collect(provider: Provider, question: string) {
  const events: StreamEvent[] = [];
  const result = await runChat(provider, [{ role: 'user', content: question }], (event) => events.push(event));
  return { events, result };
}

describe('runChat', () => {
  it('runs the requested lookup, then streams the answer', async () => {
    const { events, result } = await collect(mock, 'Which test has the highest lift?');

    expect(events.map((event) => event.type)).toEqual(['tool_call', 'tool_result', 'text', 'text', 'text', 'done']);
    expect(result.toolCalls).toEqual([{ name: 'get_top_lift', args: { status: 'all' } }]);
    expect(result.text).toBe('Here are the tests ranked by lift, highest first.');

    // The numbers the browser draws come from the lookup, not from the model's text.
    const toolResult = events.find((event) => event.type === 'tool_result');
    expect(toolResult?.name).toBe('get_top_lift');
    expect(toolResult?.result).toHaveLength(6);
    expect(toolResult?.result).toMatchObject({ 0: { name: 'Pricing page layout', liftPercent: 25 } });
  });

  it('reports a failed lookup to the model instead of crashing', async () => {
    // A model that asks for an experiment that does not exist, then answers.
    const asksForMissing: Provider = {
      name: 'test',
      async streamTurn({ messages }) {
        const last = messages.at(-1)!;
        if (last.role === 'user') {
          const call = { id: '1', name: 'get_experiment', args: { name: 'cart abandonment' } };
          return { role: 'assistant', content: '', toolCalls: [call] };
        }
        // The loop should have handed the error back as the lookup's result.
        expect(last).toMatchObject({ role: 'tool', isError: true });
        return { role: 'assistant', content: 'That test is not in the data.', toolCalls: [] };
      },
    };

    const { events, result } = await collect(asksForMissing, 'How did the cart abandonment test do?');
    expect(events.map((event) => event.type)).toEqual(['tool_call', 'tool_error', 'done']);
    expect(result.text).toBe('That test is not in the data.');
  });

  it('rebuilds earlier turns with their lookups re-run on the server', async () => {
    let seen: unknown[] = [];
    const recorder: Provider = {
      name: 'test',
      async streamTurn({ messages }) {
        // Copy the list: the loop adds this reply to it afterwards.
        seen = [...messages];
        return { role: 'assistant', content: 'ok', toolCalls: [] };
      },
    };
    await runChat(
      recorder,
      [
        { role: 'user', content: "What's still running?" },
        {
          role: 'assistant',
          content: 'Two tests.',
          toolCalls: [{ name: 'list_by_status', args: { status: 'running' } }],
        },
        { role: 'user', content: 'And which is best?' },
      ],
      () => {},
    );

    // user, assistant asking for the lookup, the recomputed result, assistant text, user.
    expect(seen.map((message) => (message as { role: string }).role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
      'user',
    ]);
    expect((seen[2] as { content: string }).content).toContain('Offer banner placement');
  });

  it('stops a model that never stops asking for lookups', async () => {
    const neverAnswers: Provider = {
      name: 'test',
      streamTurn: async () => ({
        role: 'assistant',
        content: '',
        toolCalls: [{ id: '1', name: 'get_summary', args: {} }],
      }),
    };
    const { result } = await collect(neverAnswers, 'How are the tests going?');
    expect(result.toolCalls).toHaveLength(5);
    expect(result.text).toMatch(/too many lookups/);
  });
});
