// The answer to "did it hit significance?", for compare_to_threshold.
import { formatLift, formatP } from '@/lib/format';
import type { ThresholdResult } from '@/lib/tools';

export function VerdictCard({ result }: { result: ThresholdResult }) {
  // Three possible outcomes, each with its own colour and label.
  const outcome = result.tooEarlyToCall ? 'early' : result.significant ? 'yes' : 'no';
  const label = { early: 'Too early to call', yes: 'Significant', no: 'Not significant' }[outcome];

  return (
    <article className={`card verdict verdict-${outcome}`} data-testid="verdict-card">
      <header className="card-header">
        <h3>{result.name}</h3>
        <span className="badge">{label}</span>
      </header>
      <p>{result.verdict}</p>
      <p className="facts-line">
        {formatP(result.pValue)} against a threshold of {result.threshold} · {formatLift(result.liftPercent)} lift ·{' '}
        {result.status}
      </p>
    </article>
  );
}
