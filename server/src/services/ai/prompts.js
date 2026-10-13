const TYPE_RULES = {
  mcq: 'Every question must be a single-correct-answer multiple choice question.',
  multiple_choice: 'Every question must be a single-correct-answer multiple choice question.',
  true_false: 'Every question must be a statement judged as exactly True or False, with options ["True", "False"].',
};

export function buildSystemPrompt() {
  return [
    'You are an exam-setter for Indian competitive examinations (SSC, Railway, Banking and school boards).',
    'You write factually precise, unambiguous objective questions.',
    'You reply with JSON only. No prose, no markdown, no code fences.',
  ].join(' ');
}

export function buildQuestionPrompt({
  sourceText,
  topic,
  subject,
  count,
  difficulty,
  questionType,
  optionsPerQuestion,
  avoidQuestions = [],
}) {
  const hasSource = Boolean(sourceText && sourceText.trim().length > 0);
  const optionCount = questionType === 'true_false' ? 2 : optionsPerQuestion;

  const difficultyRule =
    difficulty === 'mixed'
      ? 'Spread the questions across easy, medium and hard, roughly evenly, and label each one honestly.'
      : `Every question must be ${difficulty} difficulty and labelled "${difficulty}".`;

  const groundingRules = hasSource
    ? [
        'Use ONLY the facts contained in SOURCE MATERIAL below.',
        'Do not use outside knowledge, and do not invent names, numbers, dates or definitions that are absent from the source.',
        'For each question, set "sourceReference" to a short quoted phrase (under 15 words) from the source that the answer rests on.',
        'If the source cannot support the requested number of questions, return fewer questions rather than inventing any.',
      ]
    : [
        `Write questions on the topic "${topic}" using well-established, widely agreed facts.`,
        'Avoid disputed, speculative or very recent facts that may have changed.',
        'Set "sourceReference" to an empty string.',
      ];

  const avoidBlock = avoidQuestions.length
    ? `\nAlready-used questions — do not repeat these or paraphrase them:\n${avoidQuestions
        .slice(0, 40)
        .map((q, i) => `${i + 1}. ${q}`)
        .join('\n')}\n`
    : '';

  return `Generate exactly ${count} examination questions.

RULES
- ${groundingRules.join('\n- ')}
- ${TYPE_RULES[questionType] || TYPE_RULES.mcq}
- Each question must have exactly ${optionCount} options, all plausible, all distinct.
- Exactly one option is correct. "correctAnswer" must be character-for-character identical to one of the options.
- No two questions may test the same fact.
- ${difficultyRule}
- "explanation" must justify the correct answer in 1-3 sentences and say why it is right.
- "topic" is a specific chapter-level topic (for example "Fundamental Rights", not "General Knowledge").
${avoidBlock}
OUTPUT FORMAT
Return a JSON object with this exact shape and nothing else:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string",
      "difficulty": "easy" | "medium" | "hard",
      "topic": "string",
      "questionType": "${questionType}",
      "sourceReference": "string"
    }
  ]
}

SUBJECT: ${subject || 'General'}
TOPIC: ${topic || 'From the source material'}
${hasSource ? `\nSOURCE MATERIAL\n"""\n${sourceText}\n"""` : ''}`;
}

export function buildRepairPrompt(previousOutput) {
  return `Your previous reply was not valid JSON in the required shape. Return the same content corrected, as a single JSON object matching {"questions": [...]}. Output JSON only.

PREVIOUS REPLY
"""
${String(previousOutput).slice(0, 6000)}
"""`;
}
