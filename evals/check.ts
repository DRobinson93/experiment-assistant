// Decides whether one answer passes. Kept separate from the runner so it can be unit tested.

export interface EvalCase {
  // Questions to ask first, in the same conversation, before the one being checked.
  after?: string[];
  question: string;
  // The right answer in words, for a person reading the results.
  expected: string;
  // The lookup the model should have used, if it matters for this question.
  tool?: string;
  // Patterns that must all appear in the answer.
  expect: string[];
  // Patterns that must not appear.
  reject?: string[];
}

export interface EvalOutcome {
  pass: boolean;
  // One line per thing that was wrong; empty when it passed.
  problems: string[];
}

// Patterns are regular expressions, matched without regard to capitals.
const found = (pattern: string, text: string) => new RegExp(pattern, 'i').test(text);

export function checkAnswer(answer: string, toolsUsed: string[], testCase: EvalCase): EvalOutcome {
  const problems: string[] = [];

  if (testCase.tool && !toolsUsed.includes(testCase.tool)) {
    problems.push(`should have used ${testCase.tool}, used ${toolsUsed.join(', ') || 'no lookup'}`);
  }
  for (const pattern of testCase.expect) {
    if (!found(pattern, answer)) problems.push(`missing: ${pattern}`);
  }
  for (const pattern of testCase.reject ?? []) {
    if (found(pattern, answer)) problems.push(`should not say: ${pattern}`);
  }

  return { pass: problems.length === 0, problems };
}
