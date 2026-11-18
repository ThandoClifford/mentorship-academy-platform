import { useCallback, useEffect, useState } from 'react';
import * as cohortService from '../../services/cohortService.js';
import './CohortSummary.css';

export default function CohortSummary() {
  const [state, setState] = useState({ loading: true, error: '', cohort: null, membership: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await cohortService.getCurrentCohort();
      setState({
        loading: false,
        error: '',
        cohort: result.cohort,
        membership: result.membership,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error.response?.data?.message || 'Could not load your cohort information.',
        cohort: null,
        membership: null,
      });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="cohort-summary" aria-labelledby="cohort-summary-title">
      <div>
        <span className="eyebrow">YOUR PROGRAMME</span>
        <h2 id="cohort-summary-title">Current cohort</h2>
      </div>
      {state.loading ? (
        <p role="status">Loading cohort information…</p>
      ) : state.error ? (
        <p className="cohort-summary-error" role="alert">
          {state.error}{' '}
          <button type="button" onClick={load}>Try again</button>
        </p>
      ) : state.cohort ? (
        <div className="cohort-summary-details">
          <strong>{state.cohort.name}</strong>
          <span>{state.cohort.startsAt ? new Date(state.cohort.startsAt).toLocaleDateString() : ''} – {state.cohort.endsAt ? new Date(state.cohort.endsAt).toLocaleDateString() : ''}</span>
          <span>{state.membership?.participantRole === 'MENTOR' ? 'Mentor' : 'Mentee'} · {state.membership?.status?.toLowerCase()}</span>
        </div>
      ) : (
        <p>No active cohort assignment.</p>
      )}
    </section>
  );
}
