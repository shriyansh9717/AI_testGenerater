import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resultsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { Button, Card, ErrorBlock, LoadingBlock, Pill } from '../components/ui.jsx';
import { formatDuration, titleCase } from '../utils/format.js';

function Metric({ label, value, tone = '' }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2.5">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export default function Result() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => resultsApi.get(id), [id]);
  const [filter, setFilter] = useState('all');

  if (loading) return <LoadingBlock label="Loading your result" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const { result } = data;
  const review = result.review.filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'wrong') return !item.isCorrect && item.selectedOption;
    if (filter === 'skipped') return !item.selectedOption;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{result.title}</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {result.patternName}
            {result.autoSubmitted ? ' · submitted automatically when time ran out' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button as="link" to={`/tests/${result.testId}/attempt`} variant="secondary">
            Retake
          </Button>
          <Button as="link" to="/analytics">
            Full analysis
          </Button>
        </div>
      </div>

      <Card className="bg-exam text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">Score</p>
            <p className="font-display text-4xl font-semibold">
              {result.score}
              <span className="text-2xl text-white/60"> / {result.maxScore}</span>
            </p>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-sm text-white/70">Percentage</p>
              <p className="font-display text-2xl">{result.percentage}%</p>
            </div>
            <div>
              <p className="text-sm text-white/70">Accuracy</p>
              <p className="font-display text-2xl">{result.accuracy}%</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Correct" value={result.correct} tone="text-verdict-right" />
        <Metric label="Wrong" value={result.wrong} tone="text-verdict-wrong" />
        <Metric label="Unattempted" value={result.unattempted} />
        <Metric label="Attempted" value={result.attemptedCount} />
        <Metric label="Time taken" value={formatDuration(result.timeTakenSeconds)} />
        <Metric label="Per question" value={`${result.averageSecondsPerQuestion}s`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">By topic</h2>
          <ul className="mt-3 space-y-3">
            {result.topicAnalysis.map((topic) => (
              <li key={topic.label}>
                <div className="flex justify-between text-sm">
                  <span>{topic.label}</span>
                  <span className="font-semibold">{topic.accuracy}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-sunken">
                  <div className="h-full rounded-full bg-exam" style={{ width: `${topic.accuracy}%` }} />
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {topic.correct} correct · {topic.wrong} wrong · {topic.unattempted} skipped
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">By difficulty</h2>
          <ul className="mt-3 space-y-3">
            {result.difficultyAnalysis.map((level) => (
              <li key={level.label}>
                <div className="flex justify-between text-sm">
                  <span>{titleCase(level.label)}</span>
                  <span className="font-semibold">{level.accuracy}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper-sunken">
                  <div className="h-full rounded-full bg-marigold" style={{ width: `${level.accuracy}%` }} />
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {level.correct} of {level.total} correct
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">Question review</h2>
          <div className="flex gap-1.5">
            {[
              ['all', 'All'],
              ['correct', 'Correct'],
              ['wrong', 'Wrong'],
              ['skipped', 'Skipped'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  filter === value ? 'bg-ink text-white' : 'bg-paper-sunken text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {review.map((item) => (
            <Card key={item.questionId}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  {item.number}. {item.question}
                </p>
                <Pill tone={item.isCorrect ? 'right' : item.selectedOption ? 'wrong' : 'neutral'}>
                  {item.isCorrect ? `+${item.marksAwarded}` : item.selectedOption ? item.marksAwarded : '0'}
                </Pill>
              </div>

              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {item.options.map((option) => {
                  const isCorrect = option === item.correctAnswer;
                  const isChosen = option === item.selectedOption;
                  return (
                    <li
                      key={option}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isCorrect
                          ? 'border-verdict-right/40 bg-verdict-rightLight text-verdict-right'
                          : isChosen
                            ? 'border-verdict-wrong/40 bg-verdict-wrongLight text-verdict-wrong'
                            : 'border-line'
                      }`}
                    >
                      {option}
                      {isChosen && <span className="ml-2 text-xs font-semibold">your answer</span>}
                      {isCorrect && !isChosen && <span className="ml-2 text-xs font-semibold">correct</span>}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.explanation}</p>
              {item.sourceReference && (
                <p className="mt-2 text-xs text-ink-faint">Based on your material: {item.sourceReference}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone="exam">{item.topic}</Pill>
                <Pill>{titleCase(item.difficulty)}</Pill>
                <Pill>{item.timeSpentSeconds}s spent</Pill>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Link to="/tests" className="inline-block text-sm font-semibold text-exam hover:underline">
        Back to my tests
      </Link>
    </div>
  );
}
