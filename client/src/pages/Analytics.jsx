import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { analyticsApi } from '../services/api.js';
import { useAsync } from '../hooks/useAsync.js';
import { Button, Card, EmptyState, ErrorBlock, LoadingBlock, Pill } from '../components/ui.jsx';
import { formatDate, titleCase } from '../utils/format.js';

export default function Analytics() {
  const { data, loading, error, reload } = useAsync(() => analyticsApi.get(), []);

  if (loading) return <LoadingBlock label="Crunching your attempts" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const { summary, progress, topicAnalysis, difficultyAnalysis, weakTopics, strongTopics } = data;

  if (!summary.testsAttempted) {
    return (
      <EmptyState
        title="Nothing to analyse yet"
        body="Sit at least one paper and this page will show your topic strengths, difficulty curve and pacing."
        action={
          <Button as="link" to="/create">
            Create a test
          </Button>
        }
      />
    );
  }

  const difficultyData = ['easy', 'medium', 'hard']
    .map((level) => difficultyAnalysis.find((item) => item.label === level))
    .filter(Boolean)
    .map((item) => ({ ...item, label: titleCase(item.label) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Performance analysis</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Across {summary.testsAttempted} attempt{summary.testsAttempted === 1 ? '' : 's'} and{' '}
          {summary.totalQuestionsAnswered} answered questions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Average score', `${summary.averageScore}%`],
          ['Average accuracy', `${summary.averageAccuracy}%`],
          ['Time on papers', `${summary.totalTimeMinutes} min`],
          ['Average per question', `${summary.averageSecondsPerQuestion}s`],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-base font-semibold">Score and accuracy over time</h2>
        <div className="mt-4 h-64">
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
              <Tooltip labelFormatter={(value) => formatDate(value)} formatter={(value) => `${value}%`} />
              <Legend />
              <Line name="Score" type="monotone" dataKey="percentage" stroke="#2A4BA0" strokeWidth={2.5} />
              <Line name="Accuracy" type="monotone" dataKey="accuracy" stroke="#E8A33D" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">Topic map</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={topicAnalysis.slice(0, 8)}>
                <PolarGrid stroke="#DDE2EC" />
                <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: '#4A5769' }} />
                <Radar dataKey="accuracy" stroke="#2A4BA0" fill="#2A4BA0" fillOpacity={0.25} />
                <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold">Accuracy by difficulty</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={difficultyData} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="#DDE2EC" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8A94A6' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#8A94A6' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                <Bar dataKey="accuracy" fill="#E8A33D" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">Revise these first</h2>
          {weakTopics.length ? (
            <ul className="mt-3 space-y-2">
              {weakTopics.map((topic) => (
                <li key={topic.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{topic.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-ink-faint">
                      {topic.correct}/{topic.correct + topic.wrong}
                    </span>
                    <Pill tone="wrong">{topic.accuracy}%</Pill>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              No topic is under 60% with at least three attempted questions behind it.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold">Solid ground</h2>
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
            <p className="mt-3 text-sm text-ink-soft">Nothing is at 75% yet. Keep going.</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Every topic</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-ink-faint">
              <tr>
                <th className="py-2 font-medium">Topic</th>
                <th className="py-2 font-medium">Seen</th>
                <th className="py-2 font-medium">Correct</th>
                <th className="py-2 font-medium">Wrong</th>
                <th className="py-2 font-medium">Skipped</th>
                <th className="py-2 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {topicAnalysis.map((topic) => (
                <tr key={topic.label}>
                  <td className="py-2.5 pr-3">{topic.label}</td>
                  <td className="py-2.5">{topic.total}</td>
                  <td className="py-2.5 text-verdict-right">{topic.correct}</td>
                  <td className="py-2.5 text-verdict-wrong">{topic.wrong}</td>
                  <td className="py-2.5">{topic.unattempted}</td>
                  <td className="py-2.5 font-semibold">{topic.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
