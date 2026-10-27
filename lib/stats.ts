// Conversion rate and lift for one experiment: the arithmetic the model is
// never trusted to do.

// One side of a test: how many people saw it and how many converted.
export interface Arm {
  visitors: number;
  conversions: number;
}

// Conversion rate and lift are
// not stored in the data: this is the one place they are calculated.
// conversions / visitors, as a percent rounded to one decimal place.
// 600 of 12000 visitors is 5.
export function conversionRatePercent(arm: Arm): number {
  if (arm.visitors === 0) {
    throw new Error('Arm has no visitors');
  }
  return Math.round((arm.conversions / arm.visitors) * 1000) / 10;
}

// variant rate / control rate - 1(Example: Control: 5, Var 5.9. 5.9 / 5 = 1.18, which is 118%, -1 = 0.18),
// as a percent rounded to one decimal place.
// Positive means the variant beat the control.
export function liftPercent(control: Arm, variant: Arm): number {
  if (control.visitors === 0) {
    throw new Error('Control arm has no visitors');
  }
  if (variant.visitors === 0) {
    throw new Error('Variant arm has no visitors');
  }
  if (control.conversions === 0) {
    throw new Error('Control arm has no conversions');
  }
  return (
    Math.round((variant.conversions / variant.visitors / (control.conversions / control.visitors) - 1) * 1000) / 10
  );
}
