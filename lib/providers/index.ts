// Picks the model service from the PROVIDER environment variable.
import { anthropic } from './anthropic';
import { mock } from './mock';
import { ollama } from './ollama';
import type { Provider } from './types';

const providers: Record<string, Provider> = { ollama, anthropic, mock };

export function getProvider(): Provider {
  const name = process.env.PROVIDER || 'ollama';
  const provider = providers[name];
  if (!provider) throw new Error(`PROVIDER is "${name}"; it must be one of: ${Object.keys(providers).join(', ')}.`);
  return provider;
}
