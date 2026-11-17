import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  adminErrorMessage,
} from '../../components/admin/AdminUI.jsx';

const numericMetrics = [
  ['totalUsers', 'Total users'],
  ['totalMentees', 'Mentees'],
  ['totalMentors', 'Mentors'],
  ['pendingMentorApplications', 'Pending applications'],
  ['approvedMentors', 'Approved mentors'],
  ['rejectedMentors', 'Rejected mentor profiles'],
  ['suspendedMentors', 'Suspended mentor profiles'],
  ['acceptedMentorships', 'Accepted mentorships'],
  ['activeMentorships', 'Active mentorships'],
  ['completedMentorships', 'Completed mentorships'],
  ['archivedMentorships', 'Archived mentorships'],
  ['declinedMentorships', 'Declined mentorships'],
  ['totalGoals', 'Total goals'],
  ['activeGoals', 'Active goals'],
  ['completedGoals', 'Completed goals'],
  ['totalMessages', 'Messages'],
  ['feedbackCount', 'Feedback submissions'],
  ['resourceCount', 'Resources'],
  ['publishedContentCount', 'Published content'],
];

function countValue(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—';
}

export default function AdminAnalyticsPage() {
  const [state, setState] = useState({ loading: true, error: '', stats: null });
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.getAdminDashboard();
      setState({ loading: false, error: '', stats: result.stats });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load academy analytics.') }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = state.stats;
  const relationshipTotal = stats
    ? ['pendingMentorshipRequests', 'acceptedMentorships', 'activeMentorships', 'completedMentorships', 'archivedMentorships', 'declinedMentorships']
      .reduce((total, key) => total + (Number(stats[key]) || 0), 0)
    : 0;
  const relationshipMetrics = [
    ['Pending', stats?.pendingMentorshipRequests],
    ['Accepted', stats?.acceptedMentorships],
    ['Active', stats?.activeMentorships],
    ['Completed', stats?.completedMentorships],
    ['Archived', stats?.archivedMentorships],
    ['Declined', stats?.declinedMentorships],
  ];

  return (
    <section className="admin-workspace">
      <AdminPageHeader
        title="Academy Analytics"
        description="Operational metrics from the existing admin dashboard API. Figures are sourced from current MongoDB records."
        actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>}
      />
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      {state.loading && !stats ? <AdminLoading>Loading analytics from the academy dashboard…</AdminLoading> : null}
      {stats && (
        <>
          <AdminCard>
            <div className="admin-card-heading"><div><h2>Mentorship lifecycle</h2><p>Distribution of relationships returned by the dashboard API.</p></div></div>
            {relationshipTotal ? (
              <div className="admin-metric-bars">
                {relationshipMetrics.map(([label, value]) => {
                  const amount = Number(value) || 0;
                  return (
                    <div className="admin-metric-row" key={label}>
                      <span>{label}</span>
                      <div className="admin-metric-track" aria-label={`${label}: ${amount}`}>
                        <div className="admin-metric-fill" style={{ width: `${Math.min(100, amount / relationshipTotal * 100)}%` }} />
                      </div>
                      <span className="admin-metric-value">{countValue(value)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <p className="admin-detail-copy">No mentorship relationship records are currently counted.</p>}
          </AdminCard>
          <div className="admin-stats-grid admin-analytics-grid">
            {numericMetrics.map(([key, label]) => (
              <article className="admin-stat-card" key={key}><span>{label}</span><strong>{countValue(stats[key])}</strong></article>
            ))}
            <article className="admin-stat-card admin-stat-card--gold"><span>Average goal progress</span><strong>{countValue(stats.averageGoalProgress)}%</strong></article>
            <article className="admin-stat-card admin-stat-card--gold"><span>Average feedback rating</span><strong>{Number.isFinite(Number(stats.averageFeedbackRating)) ? Number(stats.averageFeedbackRating).toFixed(1) : '—'} / 5</strong></article>
            <article className="admin-stat-card admin-stat-card--gold"><span>Mentor acceptance rate</span><strong>{countValue(stats.mentorAcceptanceRate)}%</strong></article>
            <article className="admin-stat-card admin-stat-card--gold"><span>Application approval rate</span><strong>{countValue(stats.mentorApplicationApprovalRate)}%</strong></article>
          </div>
        </>
      )}
    </section>
  );
}
