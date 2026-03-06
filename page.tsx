import ReminderApp from '@/components/ReminderApp';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-surface text-on-surface">
        <ReminderApp />
      </main>
    </ErrorBoundary>
  );
}
