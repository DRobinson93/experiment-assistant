// Chat in the terminal, without the web app. Useful for trying a change quickly.
//   npm run chat                                        chat
//   npm run chat -- "Which test has the highest lift?"  ask one question and exit
import readline from 'node:readline';
import { runChat, type ChatTurn } from '../lib/bot';
import type { StreamEvent } from '../lib/events';
import { getProvider } from '../lib/providers';

const provider = getProvider();
const history: ChatTurn[] = [];

// Prints events as they arrive: lookups on their own line, text as it streams.
function print(event: StreamEvent) {
  if (event.type === 'tool_call') console.log(`  [lookup: ${event.name} ${JSON.stringify(event.args)}]`);
  if (event.type === 'tool_error') console.log(`  [lookup failed: ${event.message}]`);
  if (event.type === 'text') process.stdout.write(event.delta);
  if (event.type === 'done') process.stdout.write('\n');
}

async function ask(question: string) {
  history.push({ role: 'user', content: question });
  const { text, toolCalls } = await runChat(provider, history, print);
  history.push({ role: 'assistant', content: text, toolCalls });
}

const question = process.argv.slice(2).join(' ');

if (question) {
  await ask(question);
} else {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '\n> ' });
  console.log(`Ask about the experiments (${provider.name}). Type "exit" to stop.`);
  // When input is piped in from a file it can end while an answer is still being written.
  let open = true;
  terminal.on('close', () => (open = false));
  terminal.prompt();
  for await (const input of terminal) {
    const line = input.trim();
    if (line === 'exit' || line === 'quit') break;
    if (line) await ask(line);
    if (open) terminal.prompt();
  }
  terminal.close();
}
