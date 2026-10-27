// Reads a stream of text where every line is one JSON value ("JSON Lines").
// Used twice: by the Ollama provider to read the model's reply, and by the
// browser to read the reply from our own /api/chat route.
export async function* readJsonLines<T>(stream: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    // A chunk can end in the middle of a line, so keep the unfinished part for next time.
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as T;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as T;
}
