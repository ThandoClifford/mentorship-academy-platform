import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import { AdminCard, AdminEmpty, AdminLoading, AdminNotice, AdminPageHeader, adminErrorMessage } from '../../components/admin/AdminUI.jsx';

const metrics = [
  ['Total users', 'totalUsers'],
  ['Mentees', 'totalMentees'],
  ['Mentors', 'totalMentors'],
  ['Pending mentor applications', 'pendingMentorApplications'],
  ['Approved mentors', 'approvedMentors'],
  ['Pending mentorship requests', 'pendingMentorshipRequests'],
  ['Accepted mentorships', 'acceptedMentorships'],
  ['Active mentorships', 'activeMentorships'],
  ['Completed mentorships', 'completedMentorships'],
  ['Total goals', 'totalGoals'],
  ['Completed goals', 'completedGoals'],
  ['Average goal progress', 'averageGoalProgress', '%'],
  ['Messages', 'totalMessages'],
  ['Feedback records', 'feedbackCount'],
  ['Average feedback rating', 'averageFeedbackRating', '/ 5'],
  ['Resources', 'resourceCount'],
  ['Published content', 'publishedContentCount'],
  ['Mentor application approval rate', 'mentorApplicationApprovalRate', '%'],
];

function csvEscape(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export default function AdminReportsPage() {
  const [state, setState] = useState({ loading: true, error: '', stats: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.getAdminDashboard();
      setState({ loading: false, error: '', stats: result.stats });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load report metrics.') }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function downloadCsv() {
    if (!state.stats) return;
    const rows = [['Metric', 'Value'], ...metrics.map(([label, key, suffix = '']) => [label, `${state.stats[key] ?? 0}${suffix}`])];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mentorship-academy-report.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Academy Reports" description="View and export current metrics from the authenticated administration dashboard API." actions={<><button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button><button className="button button-primary" type="button" onClick={downloadCsv} disabled={!state.stats || state.loading}>Export CSV</button></>} />
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        {state.loading ? <AdminLoading>Loading report metrics…</AdminLoading> : state.stats ? (
          <div className="admin-stats-grid">
            {metrics.map(([label, key, suffix = '']) => (
              <article className="admin-stat-card" key={key}><span>{label}</span><strong>{Number(state.stats[key] ?? 0).toLocaleString()}{suffix}</strong></article>
            ))}
          </div>
        ) : <AdminEmpty title="Report data unavailable">Refresh to try loading current dashboard metrics.</AdminEmpty>}
      </AdminCard>
    </section>
  );
}
