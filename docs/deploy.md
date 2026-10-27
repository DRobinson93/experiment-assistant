# Deploying to Vercel

The deployed demo cannot use Ollama, because Ollama runs on your own computer. It uses the hosted Anthropic provider instead, which is paid per question.

## Before you deploy

1. **Try the hosted provider locally.** It has not been run yet: it was written and type-checked without an API key.
   - Create a key at https://platform.claude.com and copy `.env.example` to `.env.local`.
   - In `.env.local`, set `PROVIDER=anthropic` and paste the key after `ANTHROPIC_API_KEY=`. This file is ignored by git. Do not paste the key anywhere else.
   - Run `npm run eval`, then `npm run dev` and ask a few questions in the browser.
2. **Set a spend limit** in the Anthropic Console (Settings, then Limits) before the site is public. This is the only hard cap on cost. The rate limit in `lib/rateLimit.ts` slows abuse down but is counted separately in each running copy of the server.
3. **Choose the model.** `ANTHROPIC_MODEL` defaults to `claude-opus-5-5`, roughly 2 cents a question for this app. `claude-haiku-5-5` is roughly 40 times cheaper and is likely enough for these questions; run `npm run eval` with it to check before relying on it.

## Deploy

1. Put the project on GitHub (`git init`, commit, create the repository, push). Check that `.env.local` is not in the commit.
2. At https://vercel.com, choose Add New, then Project, and import the repository. Vercel detects Next.js; leave the build settings as they are.
3. Under Environment Variables, add:
   - `PROVIDER` = `anthropic`
   - `ANTHROPIC_API_KEY` = your key
   - `ANTHROPIC_MODEL` = the model you chose
4. Deploy, then open the site and ask each of the suggested questions.

## What protects the deployed site

- The API key exists only in Vercel's environment variables and is only read in `app/api/chat/route.ts` on the server. It is never sent to the browser and never in the repository.
- Questions are limited to 500 characters and conversations to 20 messages (`app/api/chat/route.ts`).
- Each address is limited to 10 questions a minute (`lib/rateLimit.ts`).
- The browser sends the names and arguments of earlier lookups, never their results. The server re-runs them, and every lookup's arguments are checked against its Zod schema.
- The spend limit you set with the provider.
