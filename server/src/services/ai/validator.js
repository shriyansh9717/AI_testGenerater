import { fingerprint, normalizeForCompare } from '../../utils/text.js';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const TYPES = new Set(['mcq', 'true_false', 'multiple_choice']);

/**
 * Validates the model's output before anything is written to MongoDB. Invalid
 * items are dropped with a stated reason; nothing is silently repaired into
 * something the model did not produce.
 */
export function validateQuestions(rawQuestions, options = {}) {
  const {
    questionType = 'mcq',
    optionsPerQuestion = 4,
    difficulty = 'mixed',
    seenFingerprints = new Set(),
  } = options;

  const accepted = [];
  const rejected = [];
  const localSeen = new Set(seenFingerprints);

  if (!Array.isArray(rawQuestions)) {
    return { accepted, rejected: [{ reason: 'Model did not return a questions array.' }] };
  }

  const expectedOptionCount = questionType === 'true_false' ? 2 : Number(optionsPerQuestion) || 4;

  rawQuestions.forEach((item, index) => {
    const reject = (reason) => rejected.push({ index, reason, question: item?.question });

    if (!item || typeof item !== 'object') return reject('Item is not an object.');

    const question = typeof item.question === 'string' ? item.question.trim() : '';
    if (question.length < 10) return reject('Question text is missing or too short.');

    const options = Array.isArray(item.options)
      ? item.options.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean)
      : [];
    if (options.length !== expectedOptionCount) {
      return reject(`Expected ${expectedOptionCount} options, received ${options.length}.`);
    }

    const uniqueOptions = new Set(options.map(normalizeForCompare));
    if (uniqueOptions.size !== options.length) return reject('Options are not distinct.');

    const correctAnswer = typeof item.correctAnswer === 'string' ? item.correctAnswer.trim() : '';
    if (!correctAnswer) return reject('Correct answer is missing.');

    const matches = options.filter(
      (opt) => normalizeForCompare(opt) === normalizeForCompare(correctAnswer)
    );
    if (matches.length === 0) return reject('Correct answer is not one of the options.');
    if (matches.length > 1) return reject('Correct answer matches more than one option.');

    const resolvedType = TYPES.has(item.questionType) ? item.questionType : questionType;
    if (!TYPES.has(resolvedType)) return reject('Unsupported question type.');
    if (resolvedType === 'true_false') {
      const asSet = new Set(options.map((o) => o.toLowerCase()));
      if (!(asSet.has('true') && asSet.has('false'))) {
        return reject('True/False question must offer exactly True and False.');
      }
    }

    const rawDifficulty = String(item.difficulty || '').toLowerCase();
    let resolvedDifficulty = DIFFICULTIES.has(rawDifficulty) ? rawDifficulty : null;
    if (!resolvedDifficulty) {
      if (difficulty !== 'mixed' && DIFFICULTIES.has(difficulty)) resolvedDifficulty = difficulty;
      else return reject('Difficulty is missing or invalid.');
    }
    if (difficulty !== 'mixed' && resolvedDifficulty !== difficulty) {
      resolvedDifficulty = difficulty;
    }

    const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
    if (explanation.length < 10) return reject('Explanation is missing or too short.');

    const fp = fingerprint(question);
    if (localSeen.has(fp)) return reject('Duplicate of a question already generated.');
    localSeen.add(fp);

    accepted.push({
      question,
      options,
      correctAnswer: matches[0],
      explanation,
      difficulty: resolvedDifficulty,
      topic: (typeof item.topic === 'string' && item.topic.trim()) || 'General',
      questionType: resolvedType,
      sourceReference:
        typeof item.sourceReference === 'string' ? item.sourceReference.trim().slice(0, 300) : '',
      fingerprint: fp,
    });
  });

  return { accepted, rejected };
}
