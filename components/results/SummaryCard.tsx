// Counts and the best result, for get_summary.
import type { SummaryResult } from '@/lib/tools';
import { ExperimentCard } from './ExperimentCard';

export function SummaryCard({ result }: { result: SummaryResult }) {
  const counts = [
    { label: 'Experiments', value: result.total },
    { label: 'Running', value: result.running },
    { label: 'Completed', value: result.completed },
    { label: 'Significant winners', value: result.significantWinners },
  ];

  return (
    <section aria-label="Summary of experiments" data-testid="summary-card">
      <dl className="counts">
        {counts.map((count) => (
          <div key={count.label}>
            <dt>{count.label}</dt>
            <dd>{count.value}</dd>
          </div>
        ))}
      </dl>
      <p className="section-label">Best result</p>
      <ExperimentCard result={result.best} />
    </section>
  );
}
