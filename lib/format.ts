// How numbers from the lookups are shown on screen.
export const formatLift = (liftPercent: number) => `${liftPercent > 0 ? '+' : ''}${liftPercent.toFixed(1)}%`;
export const formatRate = (ratePercent: number) => `${ratePercent.toFixed(1)}%`;
export const formatP = (pValue: number) => `p = ${pValue}`;
