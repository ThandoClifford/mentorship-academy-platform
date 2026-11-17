import { useCallback, useEffect, useMemo, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminFilter,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';

const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unknown user';

export default function AdminFeedbackPage() {
  const [state, setState] = useState({ loading: true, error: '', feedback: [] });
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminFeedback();
      setState({ loading: false, error: '', feedback: result.feedback || [] });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load feedback.') }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const feedback = useMemo(() => state.feedback.filter((item) => {
    const matchesType = !type || item.feedbackType === type;
    const haystack = [
      item.comments,
      item.feedbackType,
      personName(item.submittedBy),
      item.submittedBy?.email,
      personName(item.submittedFor),
      item.submittedFor?.email,
    ].join(' ').toLowerCase();
    return matchesType && haystack.includes(search.trim().toLowerCase());
  }), [search, state.feedback, type]);

  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Mentorship Feedback" description="Read feedback submitted by mentorship participants. Feedback records are read-only." actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>} />
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <AdminFilter label="Feedback type"><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All types</option>{['OVERALL', 'MENTORSHIP', 'PROGRESS', 'COMMUNICATION'].map((value) => <option key={value} value={value}>{value}</option>)}</select></AdminFilter>
            <AdminFilter label="Search feedback"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Participant or comment" /></AdminFilter>
          </div>
          {!state.loading && <span>{feedback.length} of {state.feedback.length} records</span>}
        </div>
        {state.loading ? <AdminLoading>Loading feedback…</AdminLoading> : !state.feedback.length ? (
          <AdminEmpty title="No feedback submitted">Feedback submitted through mentorship relationships will appear here.</AdminEmpty>
        ) : !feedback.length ? (
          <AdminEmpty title="No matching feedback">Try another type or search term.</AdminEmpty>
        ) : (
          <AdminTable headers={['Submitted by', 'For', 'Type', 'Rating', 'Feedback', 'Submitted']}>
            {feedback.map((item) => (
              <tr key={item.id}>
                <td><strong>{personName(item.submittedBy)}</strong><small>{item.submittedBy?.email || 'Email unavailable'}</small></td>
                <td><strong>{personName(item.submittedFor)}</strong><small>{item.submittedFor?.email || 'Email unavailable'}</small></td>
                <td><AdminStatusBadge status={item.feedbackType} /></td>
                <td>{item.rating}/5</td>
                <td>{item.comments || '—'}</td>
                <td>{formatAdminDate(item.createdAt, true)}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCard>
    </section>
  );
}
