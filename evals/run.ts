// Asks every question in evals.json and checks each answer.
//   npm run eval              each case once
//   npm run eval -- --runs 5  each case five times, to measure how often it passes
// Uses whichever model PROVIDER selects, so the same questions can score
// the local model and the hosted one.
import { runChat, type ChatTurn } from '../lib/bot';
import { getProvider } from '../lib/providers';
import { checkAnswer, type EvalCase, type EvalOutcome } from './check';
import cases from './evals.json';

// A model does not always give the same answer, so one pass proves little.
// Asking several times shows how reliable each answer is.
const runsFlag = process.argv.indexOf('--runs');
const runs = runsFlag === -1 ? 1 : Number(process.argv[runsFlag + 1]);
if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs needs a whole number, for example --runs 5');

const provider = getProvider();
console.log(`Model: ${provider.name}, ${runs} ${runs === 1 ? 'run' : 'runs'} per case\n`);

// Asks one case from a fresh conversation and checks the final answer.
async function runCase(testCase: EvalCase): Promise<EvalOutcome & { text: string; toolsUsed: string[] }> {
  const history: ChatTurn[] = [];
  let text = '';
  let toolsUsed: string[] = [];

  // Ask any lead-up questions first, then the one being checked. Only the last answer is checked.
  for (const question of [...(testCase.after ?? []), testCase.question]) {
    history.push({ role: 'user', content: question });
    const result = await runChat(provider, history, () => {});
    history.push({ role: 'assistant', content: result.text, toolCalls: result.toolCalls });
    text = result.text;
    toolsUsed = result.toolCalls.map((call) => call.name);
  }

  return { ...checkAnswer(text, toolsUsed, testCase), text, toolsUsed };
}

let passedAnswers = 0;
let reliableCases = 0;

for (const testCase of cases as EvalCase[]) {
  const outcomes = [];
  for (let run = 0; run < runs; run++) outcomes.push(await runCase(testCase));

  const passes = outcomes.filter((outcome) => outcome.pass).length;
  passedAnswers += passes;
  if (passes === runs) reliableCases++;

  const followUp = testCase.after ? ` (after ${testCase.after.length} earlier questions)` : '';
  const label = passes === runs ? 'PASS' : passes === 0 ? 'FAIL' : 'FLAKY';
  console.log(`${label}  ${passes}/${runs}  ${testCase.question}${followUp}`);

  // Show the first failing answer, which is usually enough to see what went wrong.
  const failure = outcomes.find((outcome) => !outcome.pass);
  if (failure) {
    for (const problem of failure.problems) console.log(`      ${problem}`);
    console.log(`      lookups:  ${failure.toolsUsed.join(', ') || 'none'}`);
    console.log(`      expected: ${testCase.expected}`);
    console.log(`      answer:   ${failure.text}`);
  }
}

const totalAnswers = cases.length * runs;
console.log(`\n${passedAnswers} of ${totalAnswers} answers passed`);
console.log(`${reliableCases} of ${cases.length} cases passed every time`);
process.exit(passedAnswers === totalAnswers ? 0 : 1);
