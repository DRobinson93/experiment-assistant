// Chooses what to draw for one lookup: a loading state, an error, or the
// component that belongs to that lookup.
import type { Part } from '@/lib/chatState';
import type { ToolResultEvent } from '@/lib/events';
import { ExperimentCard } from './results/ExperimentCard';
import { LiftChart } from './results/LiftChart';
import { StatusTable } from './results/StatusTable';
import { SummaryCard } from './results/SummaryCard';
import { VerdictCard } from './results/VerdictCard';
import { WinnerCards } from './results/WinnerCards';

// What the loading state says while each lookup runs.
const LOADING_LABELS: Record<string, string> = {
  get_experiment: 'Looking up the experiment',
  list_by_status: 'Listing experiments',
  get_top_lift: 'Ranking experiments by lift',
  get_significant_winners: 'Finding significant winners',
  compare_to_threshold: 'Checking significance',
  get_summary: 'Summarising the experiments',
};

// Maps each lookup to its component. Because `event.name` and `event.result`
// are tied together in the type, each case knows the exact shape of `result`.
// Adding a lookup without adding a case here is a TypeScript error.
function ResultView({ event }: { event: ToolResultEvent }) {
  switch (event.name) {
    case 'get_experiment':
      return <ExperimentCard result={event.result} />;
    case 'list_by_status':
      return <StatusTable results={event.result} />;
    case 'get_top_lift':
      return <LiftChart results={event.result} />;
    case 'get_significant_winners':
      return <WinnerCards results={event.result} />;
    case 'compare_to_threshold':
      return <VerdictCard result={event.result} />;
    case 'get_summary':
      return <SummaryCard result={event.result} />;
    default:
      // `never` means every lookup has been handled above.
      return event satisfies never;
  }
}

export function ToolResult({ part }: { part: Extract<Part, { kind: 'tool' }> }) {
  if (part.state === 'loading') {
    return (
      <div className="tool-loading" role="status" data-testid="tool-loading">
        <span className="spinner" aria-hidden="true" />
        {LOADING_LABELS[part.name] ?? 'Looking that up'}…
      </div>
    );
  }
  if (part.state === 'error') {
    return (
      <p className="tool-error" data-testid="tool-error">
        Nothing found: {part.message}
      </p>
    );
  }
  return <ResultView event={part.event} />;
}
