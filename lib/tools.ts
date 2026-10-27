// The lookups the model is allowed to run against the experiment data.
//
// The model never sees experiments.json. It asks for one of these by name,
// lib/bot.ts runs it, and the result goes back to the model and to the browser.
//
// Rule for this file: sorting, filtering, comparing and arithmetic happen here,
// in code. The model only chooses a lookup and words the result.
import { z } from 'zod';
import { experiments, today, type Experiment, type Status } from './data';
import { conversionRatePercent, liftPercent } from './stats';

export const SIGNIFICANCE_THRESHOLD = 0.05;

// ---------- Shapes the lookups return ----------

// One experiment with its rates and lift worked out. Every lookup that returns
// experiments uses this shape, so the UI components can share code.
export interface ExperimentResult {
  id: string;
  name: string;
  status: Status;
  controlRatePercent: number;
  variantRatePercent: number;
  // Positive means the variant beat the control.
  liftPercent: number;
  pValue: number;
  significant: boolean;
  startDate?: string;
  endDate?: string;
  // Only for running tests.
  daysRunning?: number;
}

export interface ThresholdResult {
  name: string;
  status: Status;
  liftPercent: number;
  pValue: number;
  threshold: number;
  significant: boolean;
  // A running test can still change, so its result is not final.
  tooEarlyToCall: boolean;
  verdict: string;
}

export interface SummaryResult {
  total: number;
  running: number;
  completed: number;
  significantWinners: number;
  best: ExperimentResult;
}

// ---------- Arithmetic ----------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_DAY);
}

// Turns a stored experiment into the shape above.
export function toResult(experiment: Experiment): ExperimentResult {
  const result: ExperimentResult = {
    id: experiment.id,
    name: experiment.name,
    status: experiment.status,
    controlRatePercent: conversionRatePercent(experiment.control),
    variantRatePercent: conversionRatePercent(experiment.variant),
    liftPercent: liftPercent(experiment.control, experiment.variant),
    pValue: experiment.pValue,
    significant: experiment.pValue < SIGNIFICANCE_THRESHOLD,
  };
  if (experiment.startDate) result.startDate = experiment.startDate;
  if (experiment.endDate) result.endDate = experiment.endDate;
  if (experiment.status === 'running' && experiment.startDate) {
    result.daysRunning = daysBetween(experiment.startDate, today);
  }
  return result;
}

const byLiftHighestFirst = (a: ExperimentResult, b: ExperimentResult) => b.liftPercent - a.liftPercent;

// ---------- Finding an experiment by name ----------

// Words people add that are not part of an experiment's name.
const FILLER_WORDS = new Set(['the', 'a', 'an', 'ab', 'test', 'tests', 'experiment', 'experiments']);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !FILLER_WORDS.has(word));

// The model passes names loosely ("signup form test" for "Signup form length"),
// so an experiment matches when every word asked for appears in its name.
function findExperiment(name: string): Experiment {
  const wanted = words(name);
  const matches = experiments.filter((experiment) => {
    const actual = words(experiment.name);
    return wanted.length > 0 && wanted.every((word) => actual.includes(word));
  });

  const available = experiments.map((experiment) => experiment.name).join(', ');
  if (matches.length === 0) {
    throw new Error(`No experiment named "${name}" is in the data. The experiments are: ${available}.`);
  }
  if (matches.length > 1) {
    throw new Error(`"${name}" matches more than one experiment: ${matches.map((m) => m.name).join(', ')}.`);
  }
  return matches[0];
}

// ---------- The six lookups ----------

export function getExperiment({ name }: { name: string }): ExperimentResult {
  return toResult(findExperiment(name));
}

export function listByStatus({ status }: { status: Status }): ExperimentResult[] {
  return experiments.filter((experiment) => experiment.status === status).map(toResult);
}

export function getTopLift({ status }: { status: Status | 'all' }): ExperimentResult[] {
  return experiments
    .filter((experiment) => status === 'all' || experiment.status === status)
    .map(toResult)
    .sort(byLiftHighestFirst);
}

export function getSignificantWinners(): ExperimentResult[] {
  return listByStatus({ status: 'completed' })
    .filter((result) => result.significant && result.liftPercent > 0)
    .sort(byLiftHighestFirst);
}

export function compareToThreshold({ name }: { name: string }): ThresholdResult {
  const result = getExperiment({ name });
  const tooEarlyToCall = result.status === 'running';

  let verdict: string;
  if (tooEarlyToCall) {
    verdict = result.significant
      ? 'Below the significance threshold so far, but the test is still running, so it is too early to call.'
      : 'Not significant so far, and the test is still running, so it is too early to call.';
  } else {
    verdict = result.significant ? 'Reached significance.' : 'Did not reach significance.';
  }

  return {
    name: result.name,
    status: result.status,
    liftPercent: result.liftPercent,
    pValue: result.pValue,
    threshold: SIGNIFICANCE_THRESHOLD,
    significant: result.significant,
    tooEarlyToCall,
    verdict,
  };
}

export function getSummary(): SummaryResult {
  return {
    total: experiments.length,
    running: listByStatus({ status: 'running' }).length,
    completed: listByStatus({ status: 'completed' }).length,
    significantWinners: getSignificantWinners().length,
    best: getTopLift({ status: 'all' })[0],
  };
}

// ---------- What the model is told about each lookup ----------

// Zod schemas for the arguments each lookup accepts. They do two jobs:
// they are converted to JSON Schema to tell the model what it may pass,
// and they check what the model actually passed before the lookup runs.
const nameInput = z.object({
  name: z.string().min(1).describe('The experiment name, or the main words of it'),
});
const statusInput = z.object({ status: z.enum(['running', 'completed']) });
// "all" is an explicit choice on purpose. When this was an optional filter, the
// local model kept adding status "completed" to questions that never asked for it.
const rankingInput = z.object({
  status: z
    .enum(['all', 'running', 'completed'])
    .describe('Use "all" unless the user specifically says running or completed'),
});
const noInput = z.object({});

// Ties a description, an input schema and a function together, and makes
// TypeScript check that the function accepts what the schema produces.
function defineTool<Input extends z.ZodType, Output>(tool: {
  description: string;
  input: Input;
  run: (args: z.infer<Input>) => Output;
}) {
  return tool;
}

// The description is what the model reads to decide which lookup to call.
export const tools = {
  get_experiment: defineTool({
    description:
      'Full results for one experiment by name: status, control and variant conversion rates, lift, p-value, whether it is significant, and its dates. Use this when the user asks how a specific test did or is doing.',
    input: nameInput,
    run: getExperiment,
  }),
  list_by_status: defineTool({
    description:
      'Every experiment that is "running" or every experiment that is "completed". Running tests include daysRunning. Use this when the user asks what is running, what has finished, or how long tests have been going.',
    input: statusInput,
    run: listByStatus,
  }),
  get_top_lift: defineTool({
    description:
      'Experiments ranked by lift, highest first; the first item is the best. Use this whenever the user asks for the highest, best, top, worst or lowest lift, or for a ranking. Rank all tests, or only the running or only the completed ones.',
    input: rankingInput,
    run: getTopLift,
  }),
  get_significant_winners: defineTool({
    description:
      'Completed experiments where the variant won: p-value below 0.05 and positive lift. Use this when the user asks which tests won, which were significant winners, or what is worth shipping.',
    input: noInput,
    run: getSignificantWinners,
  }),
  compare_to_threshold: defineTool({
    description:
      'Whether one experiment reached statistical significance (p-value below 0.05), and whether it is too early to call because it is still running. Use this when the user asks if a specific test is significant or hit significance.',
    input: nameInput,
    run: compareToThreshold,
  }),
  get_summary: defineTool({
    description:
      'An overview: how many experiments there are, how many are running and completed, how many significant winners, and the best overall result. Use this for general questions such as "how are our tests going?".',
    input: noInput,
    run: getSummary,
  }),
};

export type ToolName = keyof typeof tools;

// What each lookup returns, worked out from the functions above. The browser
// uses this to know, for example, that a get_top_lift result is a list.
export type ToolResults = { [Name in ToolName]: ReturnType<(typeof tools)[Name]['run']> };

export const isToolName = (name: string): name is ToolName => Object.hasOwn(tools, name);

// The list sent to the model: name, description, and arguments as JSON Schema.
export const toolSpecs = Object.entries(tools).map(([name, tool]) => {
  const parameters: Record<string, unknown> = { ...z.toJSONSchema(tool.input) };
  // Zod adds a line naming the JSON Schema version, which model APIs do not need.
  delete parameters.$schema;
  return { name, description: tool.description, parameters };
});

// Runs the lookup the model asked for. Throws if the lookup does not exist,
// the arguments are not valid, or the lookup itself fails (unknown experiment).
export function runTool(name: string, rawArgs: unknown): unknown {
  if (!isToolName(name)) throw new Error(`There is no lookup named "${name}".`);
  const tool = tools[name];

  // Never trust the model's arguments: check them against the schema first.
  const parsed = tool.input.safeParse(rawArgs ?? {});
  if (!parsed.success) throw new Error(`Invalid arguments for ${name}: ${z.prettifyError(parsed.error)}`);

  // TypeScript cannot follow that this tool's schema matches this tool's function
  // once they are picked by a name known only at run time, hence the cast.
  return (tool.run as (args: unknown) => unknown)(parsed.data);
}
