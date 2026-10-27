// POST /api/chat: takes the conversation so far, runs the tool-calling loop on
// the server, and streams the events back to the browser one JSON line at a time.
// The model's API key is only ever used here, on the server.
import { z } from 'zod';
import { runChat } from '@/lib/bot';
import type { StreamEvent } from '@/lib/events';
import { getProvider } from '@/lib/providers';
import { allowRequest } from '@/lib/rateLimit';

const MAX_QUESTION_LENGTH = 500;
const MAX_TURNS = 20;

// What the browser is allowed to send. Anything else is rejected before a model is called.
const bodySchema = z.object({
  messages: z
    .array(
      z.discriminatedUnion('role', [
        z.object({ role: z.literal('user'), content: z.string().min(1).max(MAX_QUESTION_LENGTH) }),
        z.object({
          role: z.literal('assistant'),
          content: z.string().max(4000),
          // Names and arguments only. The server re-runs these lookups itself,
          // and runTool checks each one against its schema.
          toolCalls: z
            .array(z.object({ name: z.string().max(50), args: z.unknown() }))
            .max(5)
            .optional(),
        }),
      ]),
    )
    .min(1)
    .max(MAX_TURNS),
});

const error = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!allowRequest(address)) return error('Too many questions. Wait a minute and try again.', 429);

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return error('The request was not in the expected format.', 400);

  const { messages } = body.data;
  if (messages.at(-1)!.role !== 'user') return error('The last message must be a question.', 400);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Each event becomes one line of JSON, sent as soon as it happens.
      const emit = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      try {
        await runChat(getProvider(), messages, emit);
      } catch (cause) {
        // Log the detail on the server; send the browser a message that reveals nothing.
        console.error(cause);
        emit({ type: 'error', message: 'Something went wrong while answering. Please try again.' });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
