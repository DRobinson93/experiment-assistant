'use client';

// The chat screen. Sends the conversation to /api/chat and draws the reply as
// it streams back: text as text, each lookup as its own component.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { applyEvent, textOf, toolCallsOf, type Part } from '@/lib/chatState';
import type { StreamEvent } from '@/lib/events';
import { readJsonLines } from '@/lib/jsonLines';
import { ToolResult } from './ToolResult';

type Turn = { role: 'user'; text: string } | { role: 'assistant'; parts: Part[] };

const MAX_QUESTION_LENGTH = 500;

const SUGGESTIONS = [
  'Which test has the highest lift?',
  "What's still running?",
  'Which completed tests were significant winners?',
  'Did the checkout button copy test hit significance?',
  'How are our tests going overall?',
];

export function Chat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  // Keep the newest content in view as it streams in.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [turns]);

  // Applies one event to the reply being written, which is always the last turn.
  function update(event: StreamEvent) {
    setTurns((current) => {
      const last = current.at(-1);
      if (last?.role !== 'assistant') return current;
      return [...current.slice(0, -1), { role: 'assistant', parts: applyEvent(last.parts, event) }];
    });
  }

  async function ask(question: string) {
    if (!question || busy) return;
    setBusy(true);
    setInput('');

    // The server keeps no memory, so send the whole conversation: each question,
    // and for each reply its text and which lookups it ran (not their results).
    const history = [...turns, { role: 'user' as const, text: question }];
    const messages = history.map((turn) =>
      turn.role === 'user'
        ? { role: 'user', content: turn.text }
        : { role: 'assistant', content: textOf(turn.parts), toolCalls: toolCallsOf(turn.parts) },
    );

    // Show the question and an empty reply straight away.
    setTurns([...history, { role: 'assistant', parts: [] }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok || !response.body) {
        // Rate limit and validation errors come back as ordinary JSON.
        const body = await response.json().catch(() => null);
        update({ type: 'error', message: body?.error ?? 'The server could not answer.' });
      } else {
        for await (const event of readJsonLines<StreamEvent>(response.body)) update(event);
      }
    } catch {
      update({ type: 'error', message: 'Could not reach the server.' });
    }
    setBusy(false);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(input.trim());
  }

  return (
    <div className="chat">
      {/* role="log" makes screen readers announce new replies as they arrive. */}
      <div className="turns" role="log" aria-live="polite" aria-busy={busy}>
        {turns.length === 0 && (
          <div className="intro">
            <p>Ask about the A/B tests. Try one of these:</p>
            <ul className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button type="button" onClick={() => ask(suggestion)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {turns.map((turn, index) =>
          turn.role === 'user' ? (
            <p className="turn turn-user" key={index}>
              {turn.text}
            </p>
          ) : (
            <div className="turn turn-assistant" key={index} data-testid="assistant-turn">
              {/* Nothing has arrived yet: the model is still deciding what to do. */}
              {turn.parts.length === 0 && (
                <div className="tool-loading" role="status">
                  <span className="spinner" aria-hidden="true" />
                  Thinking…
                </div>
              )}
              {turn.parts.map((part, partIndex) => {
                if (part.kind === 'text') return <p key={partIndex}>{part.text}</p>;
                if (part.kind === 'error') {
                  return (
                    <p className="tool-error" role="alert" key={partIndex}>
                      {part.message}
                    </p>
                  );
                }
                return <ToolResult key={part.id} part={part} />;
              })}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>

      <form className="composer" onSubmit={onSubmit}>
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <input
          id="question"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about the experiments"
          maxLength={MAX_QUESTION_LENGTH}
          autoComplete="off"
          autoFocus
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {busy ? 'Answering…' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
