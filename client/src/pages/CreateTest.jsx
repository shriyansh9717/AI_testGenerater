import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi, patternsApi, questionsApi, testsApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Card, Field, LoadingBlock, Pill, Spinner } from '../components/ui.jsx';
import { titleCase } from '../utils/format.js';

const SOURCES = [
  { id: 'pdf', label: 'PDF', hint: 'One chapter or note file' },
  { id: 'images', label: 'Page photos', hint: 'Read with OCR' },
  { id: 'topic', label: 'Topic or text', hint: 'Type or paste material' },
];

const STEPS = ['Source', 'Questions', 'Pattern'];

export default function CreateTest() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef(null);

  const [step, setStep] = useState(0);
  const [source, setSource] = useState('pdf');
  const [files, setFiles] = useState([]);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [material, setMaterial] = useState('');
  const [document, setDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  const [settings, setSettings] = useState({
    count: 10,
    difficulty: 'mixed',
    questionType: 'mcq',
    optionsPerQuestion: 4,
  });
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  const [patterns, setPatterns] = useState([]);
  const [patternId, setPatternId] = useState('');
  const [title, setTitle] = useState('');
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(true);

  useEffect(() => {
    patternsApi
      .list()
      .then((data) => {
        setPatterns(data.patterns);
        if (data.patterns.length) setPatternId(data.patterns[0]._id);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingPatterns(false));
  }, [toast]);

  const selectedPattern = useMemo(
    () => patterns.find((pattern) => pattern._id === patternId) || null,
    [patterns, patternId]
  );

  const handleSourceSubmit = async (event) => {
    event.preventDefault();
    setUploading(true);
    setUploadPercent(0);

    try {
      let data;
      if (source === 'topic') {
        data = await documentsApi.process({ text: material, topic, subject });
      } else {
        if (!files.length) throw new Error('Choose a file first.');
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        formData.append('subject', subject);
        formData.append('topic', topic);
        data = await documentsApi.upload(formData, (event) => {
          if (event.total) setUploadPercent(Math.round((event.loaded / event.total) * 100));
        });
      }
      setDocument(data.document);
      setStep(1);
      toast.success(
        data.document.charCount
          ? `Read ${data.document.charCount.toLocaleString()} characters of material.`
          : 'Topic saved.'
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await questionsApi.generate({
        documentId: document?._id || null,
        topic: topic || document?.topic || '',
        subject,
        count: Number(settings.count),
        difficulty: settings.difficulty,
        questionType: settings.questionType,
        optionsPerQuestion: Number(settings.optionsPerQuestion),
      });

      setQuestions((current) => [...current, ...data.questions]);
      setSelectedIds((current) => [...current, ...data.questions.map((q) => q._id)]);

      if (data.produced < data.requested) {
        toast.info(
          `${data.produced} of ${data.requested} questions passed validation. The rest were dropped as duplicates or unsupported by your material.`
        );
      } else {
        toast.success(`${data.produced} questions ready to review.`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleQuestion = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const handleCreateTest = async () => {
    setCreating(true);
    try {
      const data = await testsApi.create({
        title: title.trim() || `${selectedPattern?.name || 'Custom'} — ${topic || document?.topic || 'mock test'}`,
        questionIds: selectedIds,
        examPatternId: patternId || null,
        documentId: document?._id || null,
        shuffleQuestions: true,
        shuffleOptions,
      });
      toast.success('Test created. Good luck.');
      navigate(`/tests/${data.test._id}/attempt`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const questionShortfall = selectedPattern && selectedIds.length < selectedPattern.totalQuestions;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Create a test</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Questions are written from the material you supply, then checked before they reach your paper.
        </p>
      </div>

      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              disabled={index > step}
              className={`rounded-full px-3 py-1 font-semibold ${index === step
                  ? 'bg-exam text-white'
                  : index < step
                    ? 'bg-exam-light text-exam-dark'
                    : 'bg-paper-sunken text-ink-faint'
                }`}
            >
              {label}
            </button>
            {index < STEPS.length - 1 && <span className="h-px w-6 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <div className="grid gap-2 sm:grid-cols-3">
            {SOURCES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSource(option.id);
                  setFiles([]);
                }}
                className={`rounded-xl2 border p-4 text-left transition-colors ${source === option.id ? 'border-exam bg-exam-light' : 'border-line hover:bg-paper-sunken'
                  }`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{option.hint}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSourceSubmit} className="mt-6 space-y-4">
            {source !== 'topic' && (
              <Field
                label={source === 'pdf' ? 'Choose a PDF' : 'Choose page photos'}
                id="files"
                hint={
                  source === 'pdf'
                    ? 'Text-based PDFs only. Scanned pages should be uploaded as photos instead.'
                    : 'Shoot straight on, in good light, with the text filling the frame. Up to 10 images.'
                }
              >
                <input
                  id="files"
                  ref={fileInput}
                  type="file"
                  accept={source === 'pdf' ? 'application/pdf' : 'image/png,image/jpeg,image/webp'}
                  multiple={source === 'images'}
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                  className="field file:mr-3 file:rounded-md file:border-0 file:bg-exam file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                />
              </Field>
            )}

            {source === 'topic' && (
              <Field
                label="Paste your study material (optional)"
                id="material"
                hint="Leave this empty to generate from the topic name alone."
              >
                <textarea
                  id="material"
                  rows={8}
                  className="field"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Paste a chapter, your notes, or a set of facts…"
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Topic" id="topic" hint="Example: Fundamental Rights">
                <input id="topic" className="field" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </Field>
              <Field label="Subject" id="subject" hint="Example: Polity">
                <input id="subject" className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </Field>
            </div>

            {uploading && uploadPercent > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-sunken">
                <div className="h-full bg-exam transition-all" style={{ width: `${uploadPercent}%` }} />
              </div>
            )}

            <Button type="submit" loading={uploading}>
              {uploading ? (source === 'images' ? 'Reading your pages' : 'Reading your file') : 'Read this material'}
            </Button>
            <p className="mt-2 text-sm text-gray-400 font-normal">
              check again if it show that "Server is not reach "
            </p>
          </form>
        </Card>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{document?.fileName}</p>
                <p className="text-sm text-ink-soft">
                  {document?.charCount
                    ? `${document.charCount.toLocaleString()} characters of source material`
                    : 'Topic-based generation, no source file'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(0)}>
                Change source
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <Field label="Questions" id="count">
                <input
                  id="count"
                  type="number"
                  min={1}
                  max={50}
                  className="field"
                  value={settings.count}
                  onChange={(e) => setSettings((s) => ({ ...s, count: e.target.value }))}
                />
              </Field>
              <Field label="Difficulty" id="difficulty">
                <select
                  id="difficulty"
                  className="field"
                  value={settings.difficulty}
                  onChange={(e) => setSettings((s) => ({ ...s, difficulty: e.target.value }))}
                >
                  {['easy', 'medium', 'hard', 'mixed'].map((value) => (
                    <option key={value} value={value}>
                      {titleCase(value)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type" id="questionType">
                <select
                  id="questionType"
                  className="field"
                  value={settings.questionType}
                  onChange={(e) => setSettings((s) => ({ ...s, questionType: e.target.value }))}
                >
                  <option value="mcq">Multiple choice</option>
                  <option value="true_false">True / False</option>
                </select>
              </Field>
              <Field label="Options" id="optionsPerQuestion">
                <select
                  id="optionsPerQuestion"
                  className="field"
                  disabled={settings.questionType === 'true_false'}
                  value={settings.optionsPerQuestion}
                  onChange={(e) => setSettings((s) => ({ ...s, optionsPerQuestion: e.target.value }))}
                >
                  {[2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={handleGenerate} loading={generating}>
                {generating ? 'Writing questions' : questions.length ? 'Generate more' : 'Generate questions'}
              </Button>
              {questions.length > 0 && (
                <Button variant="secondary" onClick={() => setStep(2)} disabled={!selectedIds.length}>
                  Continue with {selectedIds.length} selected
                </Button>
              )}
            </div>
            {generating && (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <Spinner size={16} /> This can take up to a minute for longer sets.
              </p>
            )}
          </Card>

          {questions.map((question, index) => {
            const selected = selectedIds.includes(question._id);
            return (
              <Card key={question._id} className={selected ? '' : 'opacity-60'}>
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">
                    {index + 1}. {question.question}
                  </p>
                  <label className="flex shrink-0 items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={selected} onChange={() => toggleQuestion(question._id)} />
                    Include
                  </label>
                </div>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {question.options.map((option) => (
                    <li
                      key={option}
                      className={`rounded-lg border px-3 py-2 text-sm ${option === question.correctAnswer
                          ? 'border-verdict-right/40 bg-verdict-rightLight font-medium text-verdict-right'
                          : 'border-line'
                        }`}
                    >
                      {option}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{question.explanation}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill tone="exam">{question.topic}</Pill>
                  <Pill>{titleCase(question.difficulty)}</Pill>
                  {question.sourceReference && <Pill tone="warm">From your material</Pill>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <Card>
          {loadingPatterns ? (
            <LoadingBlock label="Loading exam patterns" />
          ) : (
            <>
              <Field label="Test name" id="title">
                <input
                  id="title"
                  className="field"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`${selectedPattern?.name || 'Custom'} — ${topic || 'mock test'}`}
                />
              </Field>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {patterns.map((pattern) => (
                  <button
                    key={pattern._id}
                    type="button"
                    onClick={() => setPatternId(pattern._id)}
                    className={`rounded-xl2 border p-4 text-left transition-colors ${patternId === pattern._id ? 'border-exam bg-exam-light' : 'border-line hover:bg-paper-sunken'
                      }`}
                  >
                    <p className="font-semibold">{pattern.name}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {pattern.totalQuestions} questions · {pattern.durationMinutes} min · +{pattern.marksPerQuestion} /
                      −{pattern.negativeMarking}
                    </p>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm text-ink-faint">
                These are practice presets, not official papers. Check the conducting body's notification for the
                current rules of a real exam, and set up a custom pattern in Profile if you need different numbers.
              </p>

              <label className="mt-5 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} />
                Shuffle the options too
              </label>

              {questionShortfall && (
                <p className="mt-4 rounded-lg bg-marigold-light px-3 py-2 text-sm text-ink-soft">
                  This pattern asks for {selectedPattern.totalQuestions} questions and you have {selectedIds.length}.
                  The test will use what you have. Go back and generate more for a full-length paper.
                </p>
              )}

              <div className="mt-6 flex gap-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back to questions
                </Button>
                <Button onClick={handleCreateTest} loading={creating} disabled={!selectedIds.length}>
                  {creating ? 'Creating test' : 'Create and start'}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
