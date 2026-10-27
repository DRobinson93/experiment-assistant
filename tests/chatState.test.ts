// Tests how the browser turns streamed events into the parts of a reply.
import { describe, expect, it } from 'vitest';
import { applyEvent, textOf, type Part } from '../lib/chatState';
import type { StreamEvent } from '../lib/events';
import { getTopLift } from '../lib/tools';

const apply = (events: StreamEvent[]) => events.reduce<Part[]>(applyEvent, []);

describe('applyEvent', () => {
  it('joins text that arrives in pieces', () => {
    const parts = apply([
      { type: 'text', delta: 'Pricing page ' },
      { type: 'text', delta: 'layout.' },
    ]);
    expect(parts).toEqual([{ kind: 'text', text: 'Pricing page layout.' }]);
  });

  it('shows a lookup as loading, then replaces it with its result', () => {
    const call: StreamEvent = { type: 'tool_call', id: 'a', name: 'get_top_lift', args: {} };
    const result: StreamEvent = {
      type: 'tool_result',
      id: 'a',
      name: 'get_top_lift',
      result: getTopLift({ status: 'all' }),
    };

    expect(apply([call])).toEqual([{ kind: 'tool', id: 'a', name: 'get_top_lift', args: {}, state: 'loading' }]);

    const parts = apply([call, result, { type: 'text', delta: 'Done.' }]);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ kind: 'tool', state: 'done', event: { name: 'get_top_lift' } });
    expect(textOf(parts)).toBe('Done.');
  });

  it('marks a failed lookup', () => {
    const parts = apply([
      { type: 'tool_call', id: 'a', name: 'get_experiment', args: { name: 'cart' } },
      { type: 'tool_error', id: 'a', name: 'get_experiment', message: 'No experiment named "cart".' },
    ]);
    expect(parts).toEqual([
      {
        kind: 'tool',
        id: 'a',
        name: 'get_experiment',
        args: { name: 'cart' },
        state: 'error',
        message: 'No experiment named "cart".',
      },
    ]);
  });
});
