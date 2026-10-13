import { Button } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-5xl font-semibold text-exam">404</p>
      <h1 className="mt-3 font-display text-xl font-semibold">This page does not exist</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Check the link, or head back to your dashboard.</p>
      <Button as="link" to="/dashboard" className="mt-6">
        Go to dashboard
      </Button>
    </div>
  );
}
