import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, EmptyState, ErrorBlock, LoadingBlock, Pill } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

function Stat({ label, value, suffix = '' }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">
        {value}
        <span className="text-base font-medium text-ink-faint">{suffix}</span>
      </p>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => analyticsApi.get(), []);

  if (loading) return <LoadingBlock label="Loading your dashboard" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const { summary, progress, topicAnalysis, weakTopics, strongTopics, recentResults } = data;
  const hasAttempts = summary.testsAttempted > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Hello, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-1 text-[15px] text-ink-soft">
            {hasAttempts
              ? `You have sat ${summary.testsAttempted} paper${summary.testsAttempted === 1 ? '' : 's'} so far.`
              : 'Build a test from your notes and sit it under exam conditions.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button as="link" to="/create">
            Create new test
          </Button>
          <Button as="link" to="/tests" variant="secondary">
            My tests
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Tests built" value={summary.totalTests} />
        <Stat label="Attempted" value={summary.testsAttempted} />
        <Stat label="Average score" value={summary.averageScore} suffix="%" />
        <Stat label="Average accuracy" value={summary.averageAccuracy} suffix="%" />
        <Stat label="Best score" value={summary.bestScore} suffix="%" />
      </div>

      {!hasAttempts ? (
        <EmptyState
          title="No attempts yet"
          body="Upload a chapter, a set of page photos, or type a topic. The questions are built from what you supply, then you sit the paper on a timer."
          action={
            <Button as="link" to="/create">
              Create your first test
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-base font-semibold">Score across attempts</h2>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progress} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#DDE2EC" vertical={false} />
                    <XAxis
                      dataKey="submittedAt"
                      tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      tick={{ fontSize: 12, fill: '#8A94A6' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8A94A6' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value, key) => [`${value}%`, key === 'percentage' ? 'Score' : 'Accuracy']}
                      labelFormatter={(value) => formatDate(value)}
                    />
                    <Line type="monotone" dataKey="percentage" stroke="#2A4BA0" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#E8A33D" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-sm text-ink-faint">Blue is score, amber is accuracy on attempted questions.</p>
            </Card>

            <Card>
              <h2 className="text-base font-semibold">Accuracy by topic</h2>
              <div className="mt-4 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicAnalysis.slice(0, 6)} margin={{ left: -20, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#DDE2EC" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A94A6' }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8A94A6' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                    <Bar dataKey="accuracy" fill="#2A4BA0" radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-base font-semibold">Needs work</h2>
              {weakTopics.length ? (
                <ul className="mt-3 space-y-2">
                  {weakTopics.map((topic) => (
                    <li key={topic.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{topic.label}</span>
                      <Pill tone="wrong">{topic.accuracy}%</Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">
                  Nothing is below 60% yet. Topics appear here once you have answered at least three questions in them.
                </p>
              )}
            </Card>

            <Card>
              <h2 className="text-base font-semibold">Holding up well</h2>
              {strongTopics.length ? (
                <ul className="mt-3 space-y-2">
                  {strongTopics.map((topic) => (
                    <li key={topic.label} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{topic.label}</span>
                      <Pill tone="right">{topic.accuracy}%</Pill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">Sit a few more papers to see which topics are solid.</p>
              )}
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Recent results</h2>
              <Link to="/results" className="text-sm font-semibold text-exam hover:underline">
                All results
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {recentResults.map((result) => (
                <li key={result._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <Link to={`/results/${result._id}`} className="truncate font-medium hover:text-exam">
                      {result.title}
                    </Link>
                    <p className="text-xs text-ink-faint">{formatDate(result.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">
                      {result.score} / {result.maxScore}
                    </span>
                    <Pill tone={result.percentage >= 60 ? 'right' : 'wrong'}>{result.percentage}%</Pill>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
