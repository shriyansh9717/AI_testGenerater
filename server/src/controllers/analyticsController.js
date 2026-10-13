import TestAttempt from '../models/TestAttempt.js';
import Test from '../models/Test.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const round = (value, places = 2) => Number(Number(value || 0).toFixed(places));

function mergeBuckets(attempts, key) {
  const merged = {};
  attempts.forEach((attempt) => {
    (attempt[key] || []).forEach((bucket) => {
      const label = bucket.label || 'General';
      merged[label] = merged[label] || { label, total: 0, correct: 0, wrong: 0, unattempted: 0 };
      merged[label].total += bucket.total || 0;
      merged[label].correct += bucket.correct || 0;
      merged[label].wrong += bucket.wrong || 0;
      merged[label].unattempted += bucket.unattempted || 0;
    });
  });
  return Object.values(merged).map((bucket) => {
    const attempted = bucket.correct + bucket.wrong;
    return { ...bucket, accuracy: attempted ? round((bucket.correct / attempted) * 100) : 0 };
  });
}

/** GET /api/analytics — everything the dashboard and analytics page need. */
export const getAnalytics = asyncHandler(async (req, res) => {
  const [totalTests, attempts] = await Promise.all([
    Test.countDocuments({ userId: req.user._id }),
    TestAttempt.find({ userId: req.user._id, status: 'submitted' })
      .sort({ submittedAt: 1 })
      .populate('testId', 'title')
      .lean(),
  ]);

  const attemptCount = attempts.length;
  const averageScore = attemptCount
    ? round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attemptCount)
    : 0;
  const averageAccuracy = attemptCount
    ? round(attempts.reduce((sum, a) => sum + a.accuracy, 0) / attemptCount)
    : 0;
  const bestScore = attemptCount ? Math.max(...attempts.map((a) => a.percentage)) : 0;

  const totals = attempts.reduce(
    (acc, a) => ({
      correct: acc.correct + a.correct,
      wrong: acc.wrong + a.wrong,
      unattempted: acc.unattempted + a.unattempted,
      timeSeconds: acc.timeSeconds + a.timeTakenSeconds,
      questions: acc.questions + (a.answers?.length || 0),
    }),
    { correct: 0, wrong: 0, unattempted: 0, timeSeconds: 0, questions: 0 }
  );

  const topicAnalysis = mergeBuckets(attempts, 'topicAnalysis').sort((a, b) => b.total - a.total);
  const difficultyAnalysis = mergeBuckets(attempts, 'difficultyAnalysis');

  // A topic needs a few attempts behind it before it is called weak or strong.
  const ranked = topicAnalysis.filter((t) => t.correct + t.wrong >= 3);
  const weakTopics = [...ranked].sort((a, b) => a.accuracy - b.accuracy).filter((t) => t.accuracy < 60).slice(0, 5);
  const strongTopics = [...ranked].sort((a, b) => b.accuracy - a.accuracy).filter((t) => t.accuracy >= 75).slice(0, 5);

  const progress = attempts.slice(-12).map((attempt) => ({
    attemptId: attempt._id,
    title: attempt.testId?.title || 'Test',
    percentage: attempt.percentage,
    accuracy: attempt.accuracy,
    submittedAt: attempt.submittedAt,
  }));

  const perQuestionTimes = attempts.flatMap((attempt) =>
    (attempt.answers || []).map((a) => a.timeSpentSeconds || 0)
  );
  const averageSecondsPerQuestion = perQuestionTimes.length
    ? round(perQuestionTimes.reduce((a, b) => a + b, 0) / perQuestionTimes.length, 1)
    : 0;

  const recentResults = [...attempts]
    .reverse()
    .slice(0, 5)
    .map((attempt) => ({
      _id: attempt._id,
      title: attempt.testId?.title || 'Test',
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
      accuracy: attempt.accuracy,
      submittedAt: attempt.submittedAt,
    }));

  res.json({
    success: true,
    data: {
      summary: {
        totalTests,
        testsAttempted: attemptCount,
        averageScore,
        averageAccuracy,
        bestScore,
        totalQuestionsAnswered: totals.correct + totals.wrong,
        totalCorrect: totals.correct,
        totalWrong: totals.wrong,
        totalUnattempted: totals.unattempted,
        totalTimeMinutes: round(totals.timeSeconds / 60, 1),
        averageSecondsPerQuestion,
      },
      progress,
      topicAnalysis,
      difficultyAnalysis,
      weakTopics,
      strongTopics,
      recentResults,
    },
  });
});
