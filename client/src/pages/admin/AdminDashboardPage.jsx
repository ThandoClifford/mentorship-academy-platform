import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminStatusBadge,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';

const statCards = [
  ['totalUsers', 'Total users'],
  ['totalMentees', 'Mentees'],
  ['totalMentors', 'Mentors'],
  ['pendingMentorApplications', 'Applications to review', 'gold'],
  ['approvedMentors', 'Approved mentor profiles'],
  ['rejectedMentors', 'Rejected mentor profiles'],
  ['suspendedMentors', 'Suspended mentor profiles', 'gold'],
  ['activeMentorships', 'Active mentorships'],
  ['pendingMentorshipRequests', 'Pending relationships', 'gold'],
  ['acceptedMentorships', 'Accepted mentorships'],
  ['completedMentorships', 'Completed mentorships'],
  ['archivedMentorships', 'Archived mentorships'],
  ['declinedMentorships', 'Declined mentorships'],
  ['totalGoals', 'Total goals'],
  ['activeGoals', 'Active goals'],
  ['completedGoals', 'Completed goals'],
  ['totalMessages', 'Messages sent'],
  ['averageGoalProgress', 'Average goal progress', 'gold', '%'],
  ['averageFeedbackRating', 'Average feedback rating', 'gold', '/ 5'],
  ['feedbackCount', 'Feedback submissions'],
  ['resourceCount', 'Resources'],
  ['publishedContentCount', 'Published content'],
  ['mentorAcceptanceRate', 'Mentor acceptance rate', 'gold', '%'],
  ['mentorApplicationApprovalRate', 'Application approval rate', 'gold', '%'],
];

const quickActions = [
  ['Review mentor applications', '/admin/mentor-applications'],
  ['Manage users', '/admin/users'],
  ['View relationships', '/admin/relationships'],
  ['Open analytics', '/admin/analytics'],
  ['Review matching results', '/admin/matches'],
  ['Read audit log', '/admin/audit'],
];

function displayMetric(value, suffix = '') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const formatted = Number.isInteger(value) ? value : value.toFixed(1);
  return `${formatted}${suffix}`;
}

function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown user';
}

export default function AdminDashboardPage() {
  const [data, setData] = useState({ loading: true, error: '', stats: null, applications: [], activity: [] });

  const load = useCallback(async () => {
    setData((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [dashboard, applications, activity] = await Promise.all([
        adminService.getAdminDashboard(),
        adminService.listMentorApplications({ status: 'PENDING', page: 1, limit: 5 }),
        adminService.listAdminAuditLogs({ page: 1, limit: 5 }),
      ]);
      setData({
        loading: false,
        error: '',
        stats: dashboard.stats,
        applications: applications.items || [],
        activity: activity.logs || [],
      });
    } catch (error) {
      setData((current) => ({
        ...current,
        loading: false,
        error: adminErrorMessage(error, 'Could not load the administration dashboard.'),
      }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="admin-workspace">
      <AdminPageHeader
        title="Admin Dashboard"
        description="A live overview of academy members, mentorship activity, and items needing attention."
        actions={<button className="button button-secondary" type="button" onClick={load} disabled={data.loading}>Refresh</button>}
      />
      <AdminNotice onRetry={load}>{data.error}</AdminNotice>
      {data.loading && !data.stats ? <AdminLoading>Loading live academy statistics…</AdminLoading> : null}
      {data.stats && (
        <>
          <div className="admin-stats-grid" aria-label="Academy statistics">
            {statCards.map(([key, label, tone, suffix]) => (
              <article className={`admin-stat-card${tone ? ` admin-stat-card--${tone}` : ''}`} key={key}>
                <span>{label}</span>
                <strong>{displayMetric(data.stats[key], suffix)}</strong>
              </article>
            ))}
          </div>
          <div className="admin-dashboard-grid">
            <AdminCard>
              <div className="admin-card-heading">
                <div>
                  <h2>Applications requiring attention</h2>
                  <p>Pending mentor applications from the live review queue.</p>
                </div>
                <Link className="text-link" to="/admin/mentor-applications">View all <span aria-hidden="true">→</span></Link>
              </div>
              {data.applications.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Applicant</th><th>Submitted</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {data.applications.map((application) => (
                        <tr key={application.id}>
                          <td><strong>{fullName(application.user)}</strong><small>{application.user?.email || 'Email unavailable'}</small></td>
                          <td>{formatAdminDate(application.createdAt)}</td>
                          <td><AdminStatusBadge status={application.status} /></td>
                          <td><Link className="admin-table-row-action" to="/admin/mentor-applications">Review</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <AdminEmpty title="No pending applications">The review queue is clear.</AdminEmpty>
              )}
            </AdminCard>
            <div>
              <AdminCard>
                <div className="admin-card-heading"><div><h2>Quick actions</h2><p>Go directly to common administration tasks.</p></div></div>
                <div className="admin-quick-actions">
                  {quickActions.map(([label, to]) => (
                    <Link className="admin-quick-link" key={to} to={to}><span>{label}</span><span aria-hidden="true">→</span></Link>
                  ))}
                </div>
              </AdminCard>
              <AdminCard>
                <div className="admin-card-heading"><div><h2>Recent activity</h2><p>Latest actions recorded by the audit service.</p></div><Link className="text-link" to="/admin/audit">Full log <span aria-hidden="true">→</span></Link></div>
                {data.activity.length ? (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Action</th><th>Actor</th><th>When</th></tr></thead>
                      <tbody>
                        {data.activity.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{String(item.action).replaceAll('_', ' ')}</strong><small>{item.entityType}</small></td>
                            <td>{fullName(item.actor)}</td>
                            <td>{formatAdminDate(item.createdAt, true)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <AdminEmpty title="No activity recorded">New administrator actions will appear here.</AdminEmpty>}
              </AdminCard>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
