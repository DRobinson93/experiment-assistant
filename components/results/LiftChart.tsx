// A ranked bar chart of lift, for get_top_lift. Drawn with plain HTML and CSS:
// positive bars grow right from a centre line, negative bars grow left.
import { formatLift } from '@/lib/format';
import type { ExperimentResult } from '@/lib/tools';

export function LiftChart({ results }: { results: ExperimentResult[] }) {
  if (results.length === 0) return <p className="empty">No experiments to rank.</p>;

  // The longest bar fills its half of the track; the rest are scaled against it.
  const largest = Math.max(...results.map((result) => Math.abs(result.liftPercent)), 1);

  // The same information as a sentence, for people who cannot see the bars.
  const summary = results.map((result) => `${result.name} ${formatLift(result.liftPercent)}`).join(', ');

  return (
    <figure className="chart" data-testid="lift-chart">
      <figcaption>Lift by experiment, highest first</figcaption>

      {/* Screen readers get the list below; the drawn bars are hidden from them. */}
      <ol className="sr-only">
        {results.map((result) => (
          <li key={result.id}>
            {result.name}: {formatLift(result.liftPercent)} lift, {result.status},{' '}
            {result.significant ? 'significant' : 'not significant'}
          </li>
        ))}
      </ol>

      <div className="bars" role="img" aria-label={`Bar chart of lift. ${summary}.`}>
        {results.map((result) => {
          const width = (Math.abs(result.liftPercent) / largest) * 50;
          const negative = result.liftPercent < 0;
          return (
            <div className="bar-row" key={result.id} data-testid="lift-bar" aria-hidden="true">
              <span className="bar-name">
                {result.name}
                {result.status === 'running' && <span className="bar-note"> (running)</span>}
              </span>
              <span className="bar-track">
                <span
                  className={`bar ${negative ? 'bar-negative' : 'bar-positive'} ${result.significant ? '' : 'bar-faded'}`}
                  // Start at the centre line and grow away from it.
                  style={negative ? { right: '50%', width: `${width}%` } : { left: '50%', width: `${width}%` }}
                />
              </span>
              <span className={`bar-value ${negative ? 'negative' : 'positive'}`}>
                {formatLift(result.liftPercent)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="footnote" aria-hidden="true">
        Faded bars are not statistically significant.
      </p>
    </figure>
  );
}
