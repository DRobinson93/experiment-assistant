// How the browser builds up one assistant reply from the events the server streams.
// Kept free of React so it can be unit tested.
import type { StreamEvent, ToolResultEvent } from './events';

// A reply is a list of parts, shown in the order they arrived.
export type Part =
  | { kind: 'text'; text: string }
  // A lookup that has been requested but has not come back yet.
  | { kind: 'tool'; id: string; name: string; args: unknown; state: 'loading' }
  // A finished lookup. `event` carries the typed result the component draws.
  | { kind: 'tool'; id: string; name: string; args: unknown; state: 'done'; event: ToolResultEvent }
  | { kind: 'tool'; id: string; name: string; args: unknown; state: 'error'; message: string }
  | { kind: 'error'; message: string };

// Returns a new list of parts with one event applied. Never changes the old list,
// which is what lets React notice the update.
export function applyEvent(parts: Part[], event: StreamEvent): Part[] {
  switch (event.type) {
    case 'text': {
      // Add to the last part if it is text, otherwise start a new text part.
      const last = parts.at(-1);
      if (last?.kind === 'text') return [...parts.slice(0, -1), { kind: 'text', text: last.text + event.delta }];
      return [...parts, { kind: 'text', text: event.delta }];
    }
    case 'tool_call':
      return [...parts, { kind: 'tool', id: event.id, name: event.name, args: event.args, state: 'loading' }];
    case 'tool_result':
      // Swap the loading part with the same id for the finished one.
      return parts.map((part) =>
        part.kind === 'tool' && part.id === event.id ? { ...part, state: 'done', event } : part,
      );
    case 'tool_error':
      return parts.map((part) =>
        part.kind === 'tool' && part.id === event.id ? { ...part, state: 'error', message: event.message } : part,
      );
    case 'error':
      return [...parts, { kind: 'error', message: event.message }];
    case 'done':
      return parts;
  }
}

// The written part of a reply.
export const textOf = (parts: Part[]) =>
  parts
    .map((part) => (part.kind === 'text' ? part.text : ''))
    .join('')
    .trim();

// The lookups a reply ran. Sent back with the conversation history so the
// server can re-run them; the results themselves are never sent from the browser.
export const toolCallsOf = (parts: Part[]) =>
  parts.flatMap((part) => (part.kind === 'tool' ? [{ name: part.name, args: part.args }] : []));
