import { complete } from './index.js';
import { parseJsonLoose } from './jsonUtils.js';
import { buildQuestionPrompt, buildRepairPrompt, buildSystemPrompt } from './prompts.js';
import { validateQuestions } from './validator.js';
import { config } from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';
import { selectRelevantChunks } from '../../utils/text.js';

function extractQuestionArray(parsed) {
  if (!parsed) return null;
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.questions)) return parsed.questions;
  if (Array.isArray(parsed.data)) return parsed.data;
  return null;
}

/**
 * Generates validated questions. Strategy per attempt:
 *   1. Ask the provider.
 *   2. Parse loosely; if that fails, ask the provider once to repair its own output.
 *   3. Validate; keep what passes, ask again for whatever is still missing.
 * Nothing invalid is ever returned to the caller.
 */
export async function generateQuestions({
  sourceText = '',
  topic = '',
  subject = '',
  count = 10,
  difficulty = 'mixed',
  questionType = 'mcq',
  optionsPerQuestion = 4,
  existingQuestions = [],
}) {
  if (!sourceText.trim() && !topic.trim()) {
    throw ApiError.badRequest('Provide source material or a topic before generating questions.');
  }

  const focusedSource = sourceText ? selectRelevantChunks(sourceText, { topic }) : '';
  const system = buildSystemPrompt();
  const seenFingerprints = new Set();
  const accepted = [];
  const rejections = [];
  const avoid = [...existingQuestions];

  const maxAttempts = Math.max(1, config.ai.maxRetries + 1);

  for (let attempt = 0; attempt < maxAttempts && accepted.length < count; attempt += 1) {
    const remaining = count - accepted.length;
    const prompt = buildQuestionPrompt({
      sourceText: focusedSource,
      topic,
      subject,
      count: remaining,
      difficulty,
      questionType,
      optionsPerQuestion,
      avoidQuestions: avoid,
    });

    let raw = await complete({ system, prompt });
    let parsed = parseJsonLoose(raw);

    if (!extractQuestionArray(parsed)) {
      // One targeted repair pass before giving up on this attempt.
      raw = await complete({ system, prompt: buildRepairPrompt(raw) });
      parsed = parseJsonLoose(raw);
    }

    const array = extractQuestionArray(parsed);
    if (!array) {
      rejections.push({ reason: 'Model returned a response that could not be parsed as JSON.' });
      continue;
    }

    const { accepted: good, rejected } = validateQuestions(array, {
      questionType,
      optionsPerQuestion,
      difficulty,
      seenFingerprints,
    });

    good.forEach((question) => {
      if (accepted.length >= count) return;
      seenFingerprints.add(question.fingerprint);
      avoid.push(question.question);
      accepted.push({ ...question, subject });
    });
    rejections.push(...rejected);
  }

  if (accepted.length === 0) {
    throw ApiError.unprocessable(
      'The AI could not produce valid questions from this material. Try a longer or clearer source, or fewer questions.',
      rejections.slice(0, 5)
    );
  }

  return { questions: accepted, rejections, requested: count, produced: accepted.length };
}
