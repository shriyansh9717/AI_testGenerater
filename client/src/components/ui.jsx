import { Link } from 'react-router-dom';

const BUTTON_VARIANTS = {
  primary: 'bg-exam text-white hover:bg-exam-dark disabled:bg-exam/50',
  secondary: 'border border-line bg-paper-raised text-ink hover:bg-paper-sunken disabled:opacity-50',
  ghost: 'text-ink-soft hover:bg-paper-sunken hover:text-ink disabled:opacity-50',
  danger: 'bg-verdict-wrong text-white hover:bg-verdict-wrong/90 disabled:opacity-50',
  warm: 'bg-marigold text-ink hover:bg-marigold/90 disabled:opacity-50',
};

const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-[15px]',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  as = 'button',
  to,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...props
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed ${
    BUTTON_VARIANTS[variant]
  } ${BUTTON_SIZES[size]} ${className}`;

  if (as === 'link') {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner size={16} className="text-current" />}
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`card p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Field({ label, hint, error, id, children }) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-ink-faint">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-sm font-medium text-verdict-wrong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Spinner({ size = 20, className = 'text-exam' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-soft">
      <Spinner />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }) {
  return (
    <Card className="border-verdict-wrong/30 bg-verdict-wrongLight">
      <h3 className="text-base font-semibold text-verdict-wrong">That didn't work</h3>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-xl2 border border-dashed border-line bg-paper-raised px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl2 bg-paper-raised p-6 shadow-lift">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-paper-sunken text-ink-soft',
    exam: 'bg-exam-light text-exam-dark',
    right: 'bg-verdict-rightLight text-verdict-right',
    wrong: 'bg-verdict-wrongLight text-verdict-wrong',
    warm: 'bg-marigold-light text-marigold',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
