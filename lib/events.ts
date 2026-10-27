// The messages the server streams to the browser while it answers, one JSON
// object per line. Text and lookup results travel separately, so the UI can
// draw a chart from the lookup's own numbers instead of from the model's wording.
import type { ToolName, ToolResults } from './tools';

// A tool_result event for each lookup, with `result` typed to match `name`.
// Checking `event.name` in a switch tells TypeScript the type of `event.result`.
export type ToolResultEvent = {
  [Name in ToolName]: { type: 'tool_result'; id: string; name: Name; result: ToolResults[Name] };
}[ToolName];

export type StreamEvent =
  // The model asked for a lookup. The UI shows a loading state for it.
  | { type: 'tool_call'; id: string; name: string; args: unknown }
  // The lookup finished. Replaces the loading state with the real component.
  | ToolResultEvent
  // The lookup failed, for example an experiment that is not in the data.
  | { type: 'tool_error'; id: string; name: string; message: string }
  // A piece of the model's written answer.
  | { type: 'text'; delta: string }
  // Something went wrong on the server.
  | { type: 'error'; message: string }
  | { type: 'done' };
