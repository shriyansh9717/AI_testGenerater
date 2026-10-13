import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { testsApi } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button, ConfirmDialog, ErrorBlock, LoadingBlock } from '../components/ui.jsx';
import { formatClock } from '../utils/format.js';

const PALETTE_STATES = {
  not_visited: { label: 'Not visited', box: 'bg-paper-raised border-line text-ink-soft' },
  visited: { label: 'Seen, not answered', box: 'bg-verdict-wrongLight border-verdict-wrong/40 text-verdict-wrong' },
  answered: { label: 'Answered', box: 'bg-verdict-right border-verdict-right text-white' },
  marked: { label: 'Marked for review', box: 'bg-marigold border-marigold text-ink' },
  answered_marked: { label: 'Answered and marked', box: 'bg-exam border-exam text-white' },
};

export default function TakeTest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [state, setState] = useState({ loading: true, error: null, test: null, attempt: null });
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const expiresAtRef = useRef(null);
  const questionEnteredAt = useRef(Date.now());
  const submittedRef = useRef(false);

  const questions = state.test?.questions || [];
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const answersPayload = useCallback(
    () =>
      questions.map((question) => {
        const entry = answersRef.current[question._id] || {};
        return {
          questionId: question._id,
          selectedOption: entry.selectedOption ?? null,
          status: entry.status || 'not_visited',
          timeSpentSeconds: entry.timeSpentSeconds || 0,
        };
      }),
    [questions]
  );

  // Load or resume the attempt. The server owns the clock.
  useEffect(() => {
    let active = true;
    testsApi
      .start(id)
      .then((data) => {
        if (!active) return;
        if (data.expired) {
          toast.info('That attempt had already run out of time, so it was submitted for you.');
          navigate(`/results/${data.attempt._id}`, { replace: true });
          return;
        }
        const restored = {};
        data.attempt.answers.forEach((answer) => {
          restored[answer.questionId] = {
            selectedOption: answer.selectedOption,
            status: answer.status,
            timeSpentSeconds: answer.timeSpentSeconds || 0,
          };
        });
        const first = data.test.questions[0];
        if (first && (!restored[first._id] || restored[first._id].status === 'not_visited')) {
          restored[first._id] = { ...(restored[first._id] || {}), status: 'visited', selectedOption: null };
        }
        expiresAtRef.current = new Date(data.attempt.expiresAt).getTime();
        setAnswers(restored);
        setRemaining(Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000)));
        setState({ loading: false, error: null, test: data.test, attempt: data.attempt });
      })
      .catch((error) => active && setState({ loading: false, error: error.message, test: null, attempt: null }));
    return () => {
      active = false;
    };
  }, [id, navigate, toast]);

  const submit = useCallback(
    async (autoSubmitted = false) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const data = await testsApi.submit(id, {
          attemptId: state.attempt._id,
          answers: answersPayload(),
          autoSubmitted,
        });
        navigate(`/results/${data.attemptId}`, { replace: true });
      } catch (error) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error(error.message);
      }
    },
    [answersPayload, id, navigate, state.attempt, toast]
  );

  // The clock is recomputed from the server's deadline on every tick, so a
  // refresh, a sleeping tab or a slow device cannot gain extra time.
  useEffect(() => {
    if (!expiresAtRef.current || state.loading) return undefined;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(tick);
        toast.info('Time is up. Submitting your paper.');
        submit(true);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [state.loading, submit, toast]);

  // Periodic autosave so an interrupted attempt resumes with answers intact.
  useEffect(() => {
    if (state.loading || !state.attempt) return undefined;
    const save = setInterval(() => {
      testsApi.saveProgress(id, state.attempt._id, { answers: answersPayload() }).catch(() => {});
    }, 15000);
    return () => clearInterval(save);
  }, [answersPayload, id, state.attempt, state.loading]);

  const commitTimeOnCurrent = useCallback(() => {
    const question = questions[current];
    if (!question) return;
    const spent = Math.round((Date.now() - questionEnteredAt.current) / 1000);
    questionEnteredAt.current = Date.now();
    setAnswers((existing) => {
      const entry = existing[question._id] || { selectedOption: null, status: 'visited', timeSpentSeconds: 0 };
      return { ...existing, [question._id]: { ...entry, timeSpentSeconds: (entry.timeSpentSeconds || 0) + spent } };
    });
  }, [current, questions]);

  const goTo = useCallback(
    (index) => {
      if (index < 0 || index >= questions.length) return;
      commitTimeOnCurrent();
      setCurrent(index);
      setPaletteOpen(false);
      const question = questions[index];
      setAnswers((existing) => {
        const entry = existing[question._id];
        if (entry && entry.status !== 'not_visited') return existing;
        return {
          ...existing,
          [question._id]: { selectedOption: entry?.selectedOption ?? null, status: 'visited', timeSpentSeconds: entry?.timeSpentSeconds || 0 },
        };
      });
    },
    [commitTimeOnCurrent, questions]
  );

  const setOption = (option) => {
    const question = questions[current];
    setAnswers((existing) => {
      const entry = existing[question._id] || { timeSpentSeconds: 0, status: 'visited' };
      const marked = entry.status === 'marked' || entry.status === 'answered_marked';
      return {
        ...existing,
        [question._id]: { ...entry, selectedOption: option, status: marked ? 'answered_marked' : 'answered' },
      };
    });
  };

  const clearResponse = () => {
    const question = questions[current];
    setAnswers((existing) => {
      const entry = existing[question._id] || { timeSpentSeconds: 0 };
      const marked = entry.status === 'marked' || entry.status === 'answered_marked';
      return { ...existing, [question._id]: { ...entry, selectedOption: null, status: marked ? 'marked' : 'visited' } };
    });
  };

  const toggleMark = () => {
    const question = questions[current];
    setAnswers((existing) => {
      const entry = existing[question._id] || { selectedOption: null, timeSpentSeconds: 0 };
      const isMarked = entry.status === 'marked' || entry.status === 'answered_marked';
      const answered = Boolean(entry.selectedOption);
      const status = isMarked ? (answered ? 'answered' : 'visited') : answered ? 'answered_marked' : 'marked';
      return { ...existing, [question._id]: { ...entry, status } };
    });
  };

  const counts = useMemo(() => {
    const summary = { answered: 0, marked: 0, notVisited: 0 };
    questions.forEach((question) => {
      const status = answers[question._id]?.status || 'not_visited';
      if (status === 'answered' || status === 'answered_marked') summary.answered += 1;
      if (status === 'marked' || status === 'answered_marked') summary.marked += 1;
      if (status === 'not_visited') summary.notVisited += 1;
    });
    return summary;
  }, [answers, questions]);

  if (state.loading) return <LoadingBlock label="Opening your paper" />;
  if (state.error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorBlock message={state.error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const question = questions[current];
  const entry = answers[question._id] || {};
  const lowTime = remaining <= 60;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper-raised">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-semibold sm:text-lg">{state.test.title}</h1>
            <p className="text-xs text-ink-faint">
              {counts.answered} of {questions.length} answered · {state.test.patternSnapshot.marksPerQuestion} mark
              {state.test.patternSnapshot.marksPerQuestion === 1 ? '' : 's'} each · −
              {state.test.patternSnapshot.negativeMarking} for a wrong answer
            </p>
          </div>

          <div
            className={`rounded-lg px-3 py-1.5 font-display text-lg tabular-nums ${
              lowTime ? 'bg-verdict-wrongLight text-verdict-wrong' : 'bg-exam-light text-exam-dark'
            }`}
            aria-live="off"
          >
            {formatClock(remaining)}
          </div>

          <Button size="sm" variant="warm" onClick={() => setConfirmOpen(true)}>
            Submit test
          </Button>
          <button
            type="button"
            onClick={() => setPaletteOpen((open) => !open)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold lg:hidden"
          >
            Questions
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 py-6 lg:grid-cols-[1fr_260px]">
        <main>
          <div className="card p-5 sm:p-7">
            <p className="text-sm font-semibold text-ink-faint">
              Question {current + 1} of {questions.length}
            </p>
            <h2 className="mt-2 text-lg leading-relaxed">{question.question}</h2>

            <div className="mt-6 space-y-2.5" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, index) => {
                const selected = entry.selectedOption === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setOption(option)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      selected ? 'border-exam bg-exam-light' : 'border-line bg-paper-raised hover:bg-paper-sunken'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        selected ? 'border-exam bg-exam text-white' : 'border-line text-ink-soft'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-[15px] leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => goTo(current - 1)} disabled={current === 0}>
                Previous
              </Button>
              <Button variant="secondary" onClick={clearResponse} disabled={!entry.selectedOption}>
                Clear response
              </Button>
              <Button variant={entry.status?.includes('marked') ? 'warm' : 'secondary'} onClick={toggleMark}>
                {entry.status?.includes('marked') ? 'Unmark' : 'Mark for review'}
              </Button>
              <Button
                className="ml-auto"
                onClick={() => (current === questions.length - 1 ? setConfirmOpen(true) : goTo(current + 1))}
              >
                {current === questions.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </main>

        <aside
          className={`${paletteOpen ? 'block' : 'hidden'} lg:block`}
          aria-label="Question palette"
        >
          <div className="card sticky top-24 p-4">
            <h2 className="text-sm font-semibold">Question palette</h2>
            <div className="mt-3 grid grid-cols-6 gap-1.5 lg:grid-cols-5">
              {questions.map((item, index) => {
                const status = answers[item._id]?.status || 'not_visited';
                const style = PALETTE_STATES[status] || PALETTE_STATES.not_visited;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Question ${index + 1}, ${style.label}`}
                    aria-current={index === current}
                    className={`aspect-square rounded-md border text-sm font-semibold ${style.box} ${
                      index === current ? 'ring-2 ring-ink ring-offset-1' : ''
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-ink-soft">
              {Object.entries(PALETTE_STATES).map(([key, value]) => (
                <li key={key} className="flex items-center gap-2">
                  <span className={`h-3.5 w-3.5 rounded border ${value.box}`} />
                  {value.label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit this paper?"
        body={`${counts.answered} answered, ${counts.marked} marked for review, ${counts.notVisited} not visited. Once submitted you cannot change your answers.`}
        confirmLabel={submitting ? 'Submitting' : 'Submit test'}
        tone="primary"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          commitTimeOnCurrent();
          submit(false);
        }}
      />
    </div>
  );
}
