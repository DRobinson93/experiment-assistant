// Loads the synthetic experiment data and checks its shape once, at startup.
import { z } from 'zod';
import raw from '../data/experiments.json';

const armSchema = z.object({
  visitors: z.number().int().positive(),
  conversions: z.number().int().nonnegative(),
});

const experimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['running', 'completed']),
  // Running tests have a start date, completed tests an end date.
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pValue: z.number(),
  control: armSchema,
  variant: armSchema,
});

const dataSchema = z.object({
  // Stored in the file so the bot never has to guess the date.
  today: z.string(),
  experiments: z.array(experimentSchema),
});

// The TypeScript types come from the schemas, so the two cannot drift apart.
export type Experiment = z.infer<typeof experimentSchema>;
export type Status = Experiment['status'];

// parse() throws with a readable message if the file does not match the schema.
const data = dataSchema.parse(raw);

export const today = data.today;
export const experiments = data.experiments;
