// The significant winners side by side, for get_significant_winners.
import type { ExperimentResult } from '@/lib/tools';
import { ExperimentCard } from './ExperimentCard';

export function WinnerCards({ results }: { results: ExperimentResult[] }) {
  if (results.length === 0) return <p className="empty">No completed experiment is a significant winner.</p>;

  return (
    <section aria-label="Significant winners" data-testid="winner-cards">
      <div className="card-grid">
        {results.map((result) => (
          <ExperimentCard key={result.id} result={result} />
        ))}
      </div>
    </section>
  );
}
