import { normalizeForCompare } from './text.js';

const round = (value, places = 2) => Number(Number(value).toFixed(places));

function emptyBucket(label) {
  return { label, total: 0, correct: 0, wrong: 0, unattempted: 0, accuracy: 0 };
}

function finalizeBuckets(map) {
  return Object.values(map).map((bucket) => {
    const attempted = bucket.correct + bucket.wrong;
    return { ...bucket, accuracy: attempted ? round((bucket.correct / attempted) * 100) : 0 };
  });
}

/**
 * Authoritative scoring. Runs on the server only — a score sent by a client is
 * never read. `answers` is a list of { questionId, selectedOption, status, timeSpentSeconds }.
 */
export function scoreAttempt({ questions, answers, pattern, timeTakenSeconds }) {
  const answerByQuestion = new Map(
    (answers || []).map((a) => [String(a.questionId), a])
  );

  const marksPerQuestion = Number(pattern.marksPerQuestion) || 1;
  const negativeMarking = Number(pattern.negativeMarking) || 0;

  const topics = {};
  const difficulties = {};

  let score = 0;
  let correct = 0;
  let wrong = 0;
  let unattempted = 0;

  const gradedAnswers = questions.map((question) => {
    const id = String(question._id);
    const submitted = answerByQuestion.get(id);
    const selectedOption = submitted?.selectedOption ?? null;
    const topicKey = question.topic || 'General';
    const difficultyKey = question.difficulty || 'medium';

    topics[topicKey] = topics[topicKey] || emptyBucket(topicKey);
    difficulties[difficultyKey] = difficulties[difficultyKey] || emptyBucket(difficultyKey);
    topics[topicKey].total += 1;
    difficulties[difficultyKey].total += 1;

    let isCorrect = false;
    let marksAwarded = 0;

    if (selectedOption === null || selectedOption === undefined || selectedOption === '') {
      unattempted += 1;
      topics[topicKey].unattempted += 1;
      difficulties[difficultyKey].unattempted += 1;
    } else if (normalizeForCompare(selectedOption) === normalizeForCompare(question.correctAnswer)) {
      isCorrect = true;
      marksAwarded = marksPerQuestion;
      score += marksPerQuestion;
      correct += 1;
      topics[topicKey].correct += 1;
      difficulties[difficultyKey].correct += 1;
    } else {
      marksAwarded = -negativeMarking;
      score -= negativeMarking;
      wrong += 1;
      topics[topicKey].wrong += 1;
      difficulties[difficultyKey].wrong += 1;
    }

    return {
      questionId: question._id,
      selectedOption: selectedOption || null,
      status: submitted?.status || (selectedOption ? 'answered' : 'not_visited'),
      timeSpentSeconds: Math.max(0, Math.round(Number(submitted?.timeSpentSeconds) || 0)),
      isCorrect,
      marksAwarded: round(marksAwarded),
    };
  });

  const attempted = correct + wrong;
  const maxScore = round(questions.length * marksPerQuestion);
  const finalScore = round(score);

  return {
    answers: gradedAnswers,
    score: finalScore,
    maxScore,
    percentage: maxScore > 0 ? round((finalScore / maxScore) * 100) : 0,
    correct,
    wrong,
    unattempted,
    accuracy: attempted ? round((correct / attempted) * 100) : 0,
    timeTakenSeconds: Math.max(0, Math.round(timeTakenSeconds || 0)),
    topicAnalysis: finalizeBuckets(topics),
    difficultyAnalysis: finalizeBuckets(difficulties),
  };
}
