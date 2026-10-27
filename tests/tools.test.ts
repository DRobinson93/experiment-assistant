// Unit tests for the lookups: the arithmetic, sorting and filtering that the
// model is never trusted to do.
import { describe, expect, it } from 'vitest';
import {
  compareToThreshold,
  getExperiment,
  getSignificantWinners,
  getSummary,
  getTopLift,
  listByStatus,
  runTool,
  toolSpecs,
} from '../lib/tools';

describe('lift and conversion rate', () => {
  it('computes lift as variant rate / control rate - 1', () => {
    const lifts = Object.fromEntries(getTopLift({ status: 'all' }).map((result) => [result.id, result.liftPercent]));
    expect(lifts).toEqual({ x101: 18, x102: 4, x103: 20, x104: -10, x105: 25, x106: -5 });
  });

  it('computes both conversion rates', () => {
    const result = getExperiment({ name: 'Homepage hero headline' });
    expect(result.controlRatePercent).toBe(5);
    expect(result.variantRatePercent).toBe(5.9);
  });
});

describe('get_experiment', () => {
  it('finds an experiment from a loose name', () => {
    expect(getExperiment({ name: 'signup form test' }).name).toBe('Signup form length');
    expect(getExperiment({ name: 'the checkout button copy experiment' }).id).toBe('x102');
  });

  it('throws for an experiment that is not in the data', () => {
    expect(() => getExperiment({ name: 'cart abandonment test' })).toThrow(/No experiment named/);
  });
});

describe('list_by_status', () => {
  it('returns the running tests with days running', () => {
    const running = listByStatus({ status: 'running' });
    expect(running.map((result) => [result.name, result.daysRunning])).toEqual([
      ['Offer banner placement', 9],
      ['Signup form length', 7],
    ]);
  });

  it('gives completed tests no daysRunning', () => {
    const completed = listByStatus({ status: 'completed' });
    expect(completed).toHaveLength(4);
    expect(completed.every((result) => result.daysRunning === undefined)).toBe(true);
  });
});

describe('get_top_lift', () => {
  it('sorts by lift, highest first', () => {
    expect(getTopLift({ status: 'all' }).map((result) => result.name)).toEqual([
      'Pricing page layout',
      'Offer banner placement',
      'Homepage hero headline',
      'Checkout button copy',
      'Email subject line',
      'Signup form length',
    ]);
  });

  it('can rank only the running tests', () => {
    expect(getTopLift({ status: 'running' })[0].name).toBe('Offer banner placement');
  });
});

describe('get_significant_winners', () => {
  it('returns completed tests with p below 0.05 and positive lift', () => {
    // Offer banner placement is significant so far but still running, so it is left out.
    expect(getSignificantWinners().map((result) => result.name)).toEqual([
      'Pricing page layout',
      'Homepage hero headline',
    ]);
  });
});

describe('compare_to_threshold', () => {
  it('says a completed test with a high p-value did not reach significance', () => {
    const result = compareToThreshold({ name: 'Checkout button copy' });
    expect(result.significant).toBe(false);
    expect(result.tooEarlyToCall).toBe(false);
  });

  it('says a running test is too early to call even when its p-value is low', () => {
    const result = compareToThreshold({ name: 'Offer banner placement' });
    expect(result.significant).toBe(true);
    expect(result.tooEarlyToCall).toBe(true);
  });
});

describe('get_summary', () => {
  it('counts by status and names the best result', () => {
    const summary = getSummary();
    expect(summary).toMatchObject({ total: 6, running: 2, completed: 4, significantWinners: 2 });
    expect(summary.best.name).toBe('Pricing page layout');
  });
});

describe('runTool', () => {
  it('rejects arguments that do not match the schema', () => {
    expect(() => runTool('list_by_status', { status: 'paused' })).toThrow(/Invalid arguments/);
    expect(() => runTool('get_experiment', {})).toThrow(/Invalid arguments/);
  });

  it('rejects a lookup that does not exist', () => {
    expect(() => runTool('delete_everything', {})).toThrow(/no lookup named/);
  });

  it('describes all six lookups to the model with a JSON Schema', () => {
    expect(toolSpecs).toHaveLength(6);
    const listByStatusSpec = toolSpecs.find((spec) => spec.name === 'list_by_status')!;
    expect(listByStatusSpec.parameters).toMatchObject({
      type: 'object',
      properties: { status: { enum: ['running', 'completed'] } },
      required: ['status'],
    });
  });
});
