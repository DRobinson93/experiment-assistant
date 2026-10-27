// Unit tests for lib/stats.ts, written before the code (exercise 1).
import { describe, expect, it } from 'vitest';
import { conversionRatePercent, liftPercent } from '../lib/stats';

describe('conversionRatePercent', () => {
  it('divides conversions by visitors and gives a percent', () => {
    expect(conversionRatePercent({ visitors: 12000, conversions: 600 })).toBe(5);
    expect(conversionRatePercent({ visitors: 12000, conversions: 708 })).toBe(5.9);
  });

  it('rounds to one decimal place', () => {
    // 1 / 3 is 33.333...%
    expect(conversionRatePercent({ visitors: 3, conversions: 1 })).toBe(33.3);
  });

  it('is 0 when nobody converted', () => {
    expect(conversionRatePercent({ visitors: 500, conversions: 0 })).toBe(0);
  });

  // The message must say what is wrong with the input.
  it('throws when there are no visitors', () => {
    expect(() => conversionRatePercent({ visitors: 0, conversions: 0 })).toThrow(/visitors/i);
  });
});

describe('liftPercent', () => {
  it('is variant rate / control rate - 1, as a percent', () => {
    // 5% to 5.9%: the experiment x101 in the data.
    expect(liftPercent({ visitors: 12000, conversions: 600 }, { visitors: 12000, conversions: 708 })).toBe(18);
  });

  it('is negative when the variant did worse', () => {
    expect(liftPercent({ visitors: 1000, conversions: 100 }, { visitors: 1000, conversions: 90 })).toBe(-10);
  });

  it('is 0 when both sides convert at the same rate', () => {
    expect(liftPercent({ visitors: 1000, conversions: 50 }, { visitors: 2000, conversions: 100 })).toBe(0);
  });

  it('uses the rates, not the raw conversion counts, when the sides have different visitor counts', () => {
    // Control 100 / 1000 = 10%, variant 120 / 800 = 15%: a 50% lift.
    expect(liftPercent({ visitors: 1000, conversions: 100 }, { visitors: 800, conversions: 120 })).toBe(50);
  });

  it('rounds only at the end, not the rates first', () => {
    // The exact rates are 33.333...% and 66.666...%, a lift of exactly 100%.
    // Rounding the rates first gives 66.7 / 33.3 - 1 = 100.3%.
    expect(liftPercent({ visitors: 3, conversions: 1 }, { visitors: 3, conversions: 2 })).toBe(100);
  });

  it('throws when the control converted nobody, because the lift cannot be worked out', () => {
    expect(() => liftPercent({ visitors: 1000, conversions: 0 }, { visitors: 1000, conversions: 10 })).toThrow(
      /control/i,
    );
  });
});
