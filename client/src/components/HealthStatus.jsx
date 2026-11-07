import { useEffect, useState } from 'react';
import { fetchHealth } from '../services/api.js';

export default function HealthStatus() {
  const [health, setHealth] = useState({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetchHealth({ signal: controller.signal })
      .then(setHealth)
      .catch((error) => {
        if (controller.signal.aborted) return;

        setHealth({
          status: 'error',
          message:
            error.response?.data?.message ||
            error.message ||
            'The API could not be reached.',
        });
      });

    return () => controller.abort();
  }, []);

  const isOnline = health.status === 'ok';
  const label =
    health.status === 'loading'
      ? 'Checking API…'
      : isOnline
        ? 'API connected'
        : 'API unavailable';

  return (
    <div
      className={`health-status ${isOnline ? 'is-online' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="health-indicator" />
      <span>
        <strong>{label}</strong>
        {health.message && <span className="health-message">{health.message}</span>}
        {health.database && (
          <span className="health-message">
            Database: {health.database.state.replaceAll('_', ' ')}
          </span>
        )}
      </span>
    </div>
  );
}
