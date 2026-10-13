import { useState } from 'react';
import { Link } from 'react-router-dom';
import { testsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Card, ConfirmDialog, EmptyState, ErrorBlock, LoadingBlock, Pill } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

const STATUS_TONE = {
  not_started: ['neutral', 'Not started'],
  in_progress: ['warm', 'In progress'],
  completed: ['right', 'Completed'],
  expired: ['wrong', 'Time expired'],
};

export default function MyTests() {
  const { data, loading, error, reload } = useAsync(() => testsApi.list(), []);
  const toast = useToast();
  const [pendingDelete, setPendingDelete] = useState(null);

  if (loading) return <LoadingBlock label="Loading your tests" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const { tests } = data;

  const handleDelete = async () => {
    const test = pendingDelete;
    setPendingDelete(null);
    try {
      await testsApi.remove(test._id);
      toast.success('Test deleted.');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My tests</h1>
          <p className="mt-1 text-[15px] text-ink-soft">Every paper you have built, and where you left it.</p>
        </div>
        <Button as="link" to="/create">
          Create new test
        </Button>
      </div>

      {!tests.length ? (
        <EmptyState
          title="No tests yet"
          body="Build one from a PDF, page photos, or a topic you are revising."
          action={
            <Button as="link" to="/create">
              Create a test
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const [tone, label] = STATUS_TONE[test.status] || STATUS_TONE.not_started;
            return (
              <Card key={test._id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{test.title}</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      {test.questionCount} questions · {test.durationMinutes} min · {test.totalMarks} marks ·{' '}
                      {test.patternName}
                    </p>
                    <p className="mt-1 text-xs text-ink-faint">Created {formatDate(test.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Pill tone={tone}>{label}</Pill>
                    {test.lastAttempt?.status === 'submitted' && (
                      <p className="text-sm font-semibold">
                        {test.lastAttempt.score} / {test.lastAttempt.maxScore} ({test.lastAttempt.percentage}%)
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button as="link" to={`/tests/${test._id}/attempt`} size="sm">
                    {test.status === 'in_progress' ? 'Resume' : test.status === 'completed' ? 'Retake' : 'Start test'}
                  </Button>
                  {test.lastAttempt?.status === 'submitted' && (
                    <Button as="link" to={`/results/${test.lastAttempt._id}`} size="sm" variant="secondary">
                      View result
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(test)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this test?"
        body={`"${pendingDelete?.title}" and its results will be removed. This cannot be undone.`}
        confirmLabel="Delete test"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />

      <Link to="/results" className="inline-block text-sm font-semibold text-exam hover:underline">
        See all results
      </Link>
    </div>
  );
}
