import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Field } from '../components/ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (form.password.length < 8 || !/\d/.test(form.password)) {
      setErrors({ password: 'Use at least 8 characters including a number.' });
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      toast.success('Account created. Build your first test.');
      navigate('/create', { replace: true });
    } catch (err) {
      const fieldErrors = {};
      (err.details || []).forEach((detail) => {
        fieldErrors[detail.field] = detail.message;
      });
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { email: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Free, and your material stays in your account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Name" id="name" error={errors.name}>
          <input id="name" name="name" required className="field" value={form.name} onChange={handleChange} placeholder="Your name" />
        </Field>

        <Field label="Email" id="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Password"
          id="password"
          error={errors.password}
          hint="At least 8 characters, including a number."
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="field"
            value={form.password}
            onChange={handleChange}
            placeholder="Create a password"
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-exam hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
