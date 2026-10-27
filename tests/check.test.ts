// Tests the eval checker itself: a checker that passes wrong answers is worse than none.
import { describe, expect, it } from 'vitest';
import { checkAnswer, type EvalCase } from '../evals/check';

const testCase: EvalCase = {
  question: 'Which test has the highest lift?',
  expected: 'Pricing page layout, +25.0%',
  tool: 'get_top_lift',
  expect: ['pricing page layout', '25(\\.0)?\\s?%'],
  reject: ['offer banner'],
};

describe('checkAnswer', () => {
  it('passes a right answer, whatever the capitals or number format', () => {
    expect(checkAnswer('PRICING PAGE LAYOUT leads with a 25% lift.', ['get_top_lift'], testCase).pass).toBe(true);
    expect(checkAnswer('Pricing page layout, at +25.0 %.', ['get_top_lift'], testCase).pass).toBe(true);
  });

  it('fails when an expected fact is missing', () => {
    const outcome = checkAnswer('Pricing page layout did best.', ['get_top_lift'], testCase);
    expect(outcome.pass).toBe(false);
    expect(outcome.problems).toEqual(['missing: 25(\\.0)?\\s?%']);
  });

  it('fails when the answer says something it should not', () => {
    const outcome = checkAnswer('Pricing page layout (25%) and Offer banner placement.', ['get_top_lift'], testCase);
    expect(outcome.problems).toEqual(['should not say: offer banner']);
  });

  it('fails when the right answer came from the wrong lookup', () => {
    const outcome = checkAnswer('Pricing page layout, 25%.', ['list_by_status'], testCase);
    expect(outcome.problems).toEqual(['should have used get_top_lift, used list_by_status']);
  });
});
