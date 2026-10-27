// A table of experiments, for list_by_status.
import { formatLift, formatP, formatRate } from '@/lib/format';
import type { ExperimentResult } from '@/lib/tools';

export function StatusTable({ results }: { results: ExperimentResult[] }) {
  if (results.length === 0) return <p className="empty">No experiments with that status.</p>;

  // The lookup returns one status at a time, so the first row tells us which.
  const running = results[0].status === 'running';

  return (
    <div className="table-wrap">
      <table data-testid="status-table">
        <caption>
          {results.length} {results[0].status} {results.length === 1 ? 'experiment' : 'experiments'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Experiment</th>
            <th scope="col">Control</th>
            <th scope="col">Variant</th>
            <th scope="col">Lift</th>
            <th scope="col">p-value</th>
            <th scope="col">{running ? 'Days running' : 'Ended'}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id}>
              <th scope="row">{result.name}</th>
              <td>{formatRate(result.controlRatePercent)}</td>
              <td>{formatRate(result.variantRatePercent)}</td>
              <td className={result.liftPercent < 0 ? 'negative' : 'positive'}>{formatLift(result.liftPercent)}</td>
              <td>
                {formatP(result.pValue)}
                {result.significant ? ' *' : ''}
              </td>
              <td>{running ? result.daysRunning : result.endDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="footnote">* significant (p below 0.05)</p>
    </div>
  );
}
