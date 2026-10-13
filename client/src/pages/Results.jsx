import { Link } from 'react-router-dom';
import { resultsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { Button, Card, EmptyState, ErrorBlock, LoadingBlock, Pill } from '../components/ui.jsx';
import { formatDate, formatDuration } from '../utils/format.js';

export default function Results() {
  const { data, loading, error, reload } = useAsync(() => resultsApi.list(), []);

  if (loading) return <LoadingBlock label="Loading your results" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const { results } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Results</h1>
        <p className="mt-1 text-[15px] text-ink-soft">Every submitted paper, newest first.</p>
      </div>

      {!results.length ? (
        <EmptyState
          title="No results yet"
          body="Sit a paper and your score, accuracy and topic breakdown will appear here."
          action={
            <Button as="link" to="/tests">
              Go to my tests
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <Card key={result._id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/results/${result._id}`} className="font-semibold hover:text-exam">
                    {result.title}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">
                    {result.correct} correct · {result.wrong} wrong · {result.unattempted} skipped ·{' '}
                    {formatDuration(result.timeTakenSeconds)}
                  </p>
                  <p className="mt-1 text-xs text-ink-faint">{formatDate(result.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-semibold">
                    {result.score} / {result.maxScore}
                  </span>
                  <Pill tone={result.percentage >= 60 ? 'right' : 'wrong'}>{result.percentage}%</Pill>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
