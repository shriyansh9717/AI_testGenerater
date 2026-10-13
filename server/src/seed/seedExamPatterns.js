import ExamPattern from '../models/ExamPattern.js';

/**
 * Built-in patterns. The numbers below are the app's shipped defaults for
 * practice; an official exam's current rules should be confirmed from the
 * conducting body's notification before treating a mock as exam-accurate.
 */
export const PRESET_PATTERNS = [
  {
    name: 'SSC CGL practice set',
    slug: 'ssc-cgl-practice',
    description: 'Short SSC-style set: 25 questions in 20 minutes, 2 marks each, 0.5 negative.',
    totalQuestions: 25,
    durationMinutes: 20,
    marksPerQuestion: 2,
    negativeMarking: 0.5,
    optionsPerQuestion: 4,
  },
  {
    name: 'SSC CHSL practice set',
    slug: 'ssc-chsl-practice',
    description: '25 questions in 18 minutes, 2 marks each, 0.5 negative.',
    totalQuestions: 25,
    durationMinutes: 18,
    marksPerQuestion: 2,
    negativeMarking: 0.5,
    optionsPerQuestion: 4,
  },
  {
    name: 'Railway (RRB) practice set',
    slug: 'railway-practice',
    description: '30 questions in 25 minutes, 1 mark each, 1/3 negative.',
    totalQuestions: 30,
    durationMinutes: 25,
    marksPerQuestion: 1,
    negativeMarking: 0.33,
    optionsPerQuestion: 4,
  },
  {
    name: 'Banking prelims practice set',
    slug: 'banking-practice',
    description: '30 questions in 20 minutes, 1 mark each, 0.25 negative.',
    totalQuestions: 30,
    durationMinutes: 20,
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    optionsPerQuestion: 4,
  },
  {
    name: 'School exam',
    slug: 'school-exam',
    description: '20 questions in 30 minutes, 1 mark each, no negative marking.',
    totalQuestions: 20,
    durationMinutes: 30,
    marksPerQuestion: 1,
    negativeMarking: 0,
    optionsPerQuestion: 4,
  },
];

export async function seedExamPatterns() {
  const operations = PRESET_PATTERNS.map((pattern) => ({
    updateOne: {
      filter: { slug: pattern.slug, createdBy: null },
      update: { $set: { ...pattern, isPreset: true, createdBy: null } },
      upsert: true,
    },
  }));
  const result = await ExamPattern.bulkWrite(operations);
  return result.upsertedCount || 0;
}

// Allows `npm run seed` to run this file on its own.
if (process.argv[1] && process.argv[1].endsWith('seedExamPatterns.js')) {
  const { connectDatabase, disconnectDatabase } = await import('../config/db.js');
  const { assertCoreConfig } = await import('../config/env.js');
  assertCoreConfig();
  await connectDatabase();
  const created = await seedExamPatterns();
  console.log(`[seed] exam patterns ready (${created} newly created)`);
  await disconnectDatabase();
}
