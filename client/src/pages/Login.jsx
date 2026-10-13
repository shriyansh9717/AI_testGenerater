import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Field } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Pick up where you left off.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Email" id="email">
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

        <Field label="Password" id="password" error={error}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="field"
            value={form.password}
            onChange={handleChange}
            placeholder="Your password"
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        New here?{' '}
        <Link to="/register" className="font-semibold text-exam hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
