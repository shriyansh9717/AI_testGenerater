import { useEffect, useState } from 'react';
import { patternsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Card, ConfirmDialog, Field, Pill, Spinner } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

const BLANK_PATTERN = {
  name: '',
  totalQuestions: 25,
  durationMinutes: 20,
  marksPerQuestion: 2,
  negativeMarking: 0.5,
  optionsPerQuestion: 4,
};

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ name: user?.name || '', currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [patterns, setPatterns] = useState([]);
  const [loadingPatterns, setLoadingPatterns] = useState(true);
  const [draft, setDraft] = useState(BLANK_PATTERN);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    patternsApi
      .list()
      .then((data) => setPatterns(data.patterns))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingPatterns(false));
  }, [toast]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profile.name,
        ...(profile.newPassword
          ? { currentPassword: profile.currentPassword, newPassword: profile.newPassword }
          : {}),
      });
      setProfile((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const createPattern = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const data = await patternsApi.create({
        ...draft,
        totalQuestions: Number(draft.totalQuestions),
        durationMinutes: Number(draft.durationMinutes),
        marksPerQuestion: Number(draft.marksPerQuestion),
        negativeMarking: Number(draft.negativeMarking),
        optionsPerQuestion: Number(draft.optionsPerQuestion),
      });
      setPatterns((current) => [...current, data.pattern]);
      setDraft(BLANK_PATTERN);
      toast.success('Pattern saved. It will appear when you create a test.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const deletePattern = async () => {
    const pattern = pendingDelete;
    setPendingDelete(null);
    try {
      await patternsApi.remove(pattern._id);
      setPatterns((current) => current.filter((item) => item._id !== pattern._id));
      toast.success('Pattern deleted.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const numberField = (key, label, step = '1') => (
    <Field label={label} id={key}>
      <input
        id={key}
        type="number"
        step={step}
        className="field"
        value={draft[key]}
        onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
        required
      />
    </Field>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Profile</h1>
        <p className="mt-1 text-[15px] text-ink-soft">
          Member since {formatDate(user?.createdAt)} · {user?.email}
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Your details</h2>
        <form onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" id="name">
            <input
              id="name"
              className="field"
              value={profile.name}
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>
          <Field label="Email" id="email" hint="Email cannot be changed yet.">
            <input id="email" className="field" value={user?.email || ''} disabled />
          </Field>
          <Field label="Current password" id="currentPassword">
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="field"
              value={profile.currentPassword}
              onChange={(event) => setProfile((current) => ({ ...current, currentPassword: event.target.value }))}
            />
          </Field>
          <Field label="New password" id="newPassword" hint="Leave both blank to keep your current password.">
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="field"
              value={profile.newPassword}
              onChange={(event) => setProfile((current) => ({ ...current, newPassword: event.target.value }))}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={savingProfile}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Exam patterns</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Presets are starting points for practice. Build your own if you need different timing or marking.
        </p>

        {loadingPatterns ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <Spinner size={16} /> Loading patterns
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {patterns.map((pattern) => (
              <li key={pattern._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">
                    {pattern.name} {pattern.isPreset && <Pill>Preset</Pill>}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {pattern.totalQuestions} questions · {pattern.durationMinutes} min · +{pattern.marksPerQuestion} /
                    −{pattern.negativeMarking} · {pattern.optionsPerQuestion} options
                  </p>
                </div>
                {!pattern.isPreset && (
                  <Button size="sm" variant="ghost" onClick={() => setPendingDelete(pattern)}>
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={createPattern} className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
          <div className="sm:col-span-3 ">
            <Field label="Custom exam model" id="patternName">
              <input
                id="patternName"
                className="field"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="My exam pattern name"
                required
              />
            </Field>
          </div>
          {numberField('totalQuestions', 'Questions')}
          {numberField('durationMinutes', 'Duration (min)')}
          {numberField('optionsPerQuestion', 'Options')}
          {numberField('marksPerQuestion', 'Marks per question', '0.25')}
          {numberField('negativeMarking', 'Negative marking', '0.25')}
          <div className="flex items-end">
            <Button type="submit" loading={creating} className="w-full">
              Add pattern
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this pattern?"
        body={`"${pendingDelete?.name}" will no longer be offered when you create a test. Tests already built with it keep their rules.`}
        confirmLabel="Delete pattern"
        onCancel={() => setPendingDelete(null)}
        onConfirm={deletePattern}
      />
    </div>
  );
}
