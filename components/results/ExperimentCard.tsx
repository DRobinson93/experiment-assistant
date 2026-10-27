// One experiment as a card. Used for get_experiment, and reused for winners and the summary.
import { formatLift, formatP, formatRate } from '@/lib/format';
import type { ExperimentResult } from '@/lib/tools';

export function ExperimentCard({ result }: { result: ExperimentResult }) {
  // Every number here comes from the lookup result, not from the model's text.
  const direction = result.liftPercent > 0 ? 'up' : result.liftPercent < 0 ? 'down' : 'flat';

  return (
    <article className="card" data-testid="experiment-card">
      <header className="card-header">
        <h3>{result.name}</h3>
        <span className={`badge badge-${result.status}`}>{result.status}</span>
      </header>

      <p className={`lift lift-${direction}`}>
        {formatLift(result.liftPercent)} <span className="lift-label">lift</span>
      </p>

      <dl className="facts">
        <div>
          <dt>Control</dt>
          <dd>{formatRate(result.controlRatePercent)}</dd>
        </div>
        <div>
          <dt>Variant</dt>
          <dd>{formatRate(result.variantRatePercent)}</dd>
        </div>
        <div>
          <dt>Significance</dt>
          <dd>
            {formatP(result.pValue)} ({result.significant ? 'significant' : 'not significant'})
          </dd>
        </div>
        <div>
          {result.status === 'running' ? (
            <>
              <dt>Running for</dt>
              <dd>{result.daysRunning} days</dd>
            </>
          ) : (
            <>
              <dt>Ended</dt>
              <dd>{result.endDate}</dd>
            </>
          )}
        </div>
      </dl>
    </article>
  );
}
