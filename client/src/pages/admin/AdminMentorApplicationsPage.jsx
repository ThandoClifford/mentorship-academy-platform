import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminFilter,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminPagination,
  AdminStatusBadge,
  AdminTable,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

function applicantName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown applicant';
}

export default function AdminMentorApplicationsPage() {
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState({ loading: false, error: '', application: null });
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listMentorApplications({
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
        page,
        limit: 10,
      });
      setState({ loading: false, error: '', items: result.items || [], pagination: result.pagination || null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load mentor applications.') }));
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  async function openDetails(id) {
    setSelectedId(id);
    setAdminNotes('');
    setDetails({ loading: true, error: '', application: null });
    try {
      const result = await adminService.getMentorApplication(id);
      setDetails({ loading: false, error: '', application: result.application });
      setAdminNotes(result.application?.adminNotes || '');
    } catch (error) {
      setDetails({ loading: false, error: adminErrorMessage(error, 'Could not load application details.'), application: null });
    }
  }

  async function performAction(action) {
    const application = details.application;
    if (!application || processing) return;
    if (action === 'reject' && !window.confirm(`Reject ${applicantName(application.user)}'s mentor application?`)) return;
    if (action === 'suspend' && !window.confirm(`Suspend ${applicantName(application.user)}? Their existing mentorship relationships will remain unchanged.`)) return;
    setProcessing(true);
    setNotice('');
    setState((current) => ({ ...current, error: '' }));
    try {
      const result = action === 'approve'
        ? await adminService.approveMentorApplication(application.id, adminNotes)
        : action === 'reject'
          ? await adminService.rejectMentorApplication(application.id, adminNotes)
          : await adminService.suspendMentorApplication(application.id);
      const updated = result.application;
      setDetails({ loading: false, error: '', application: updated });
      setAdminNotes(updated?.adminNotes || '');
      setNotice(action === 'approve' ? 'Application approved.' : action === 'reject' ? 'Application rejected.' : 'Mentor suspended. Existing mentorship relationships were not changed.');
      await load();
    } catch (error) {
      setDetails((current) => ({ ...current, error: adminErrorMessage(error, 'Could not update this mentor application.') }));
    } finally {
      setProcessing(false);
    }
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const selected = details.application;

  return (
    <section className="admin-workspace">
      <AdminPageHeader
        title="Mentor Applications"
        description="Review applications, approve new mentors, and manage approved mentor access."
        actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>}
      />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <AdminFilter label="Application status">
              <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
                <option value="">All statuses</option>
                {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </AdminFilter>
            <form className="admin-toolbar-group" onSubmit={applySearch}>
              <AdminFilter label="Search applicants">
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" />
              </AdminFilter>
              <button className="button button-secondary" type="submit">Search</button>
            </form>
          </div>
        </div>
        {state.loading ? <AdminLoading>Loading mentor applications…</AdminLoading> : state.items.length ? (
          <AdminTable headers={['Applicant', 'Role', 'Application', 'Submitted', 'Action']}>
            {state.items.map((application) => (
              <tr key={application.id}>
                <td><strong>{applicantName(application.user)}</strong><small>{application.user?.email || 'Email unavailable'}</small></td>
                <td>{application.user?.role || '—'}</td>
                <td><AdminStatusBadge status={application.status} /></td>
                <td>{formatAdminDate(application.createdAt)}</td>
                <td><button className="admin-table-row-action" type="button" onClick={() => openDetails(application.id)}>Review details</button></td>
              </tr>
            ))}
          </AdminTable>
        ) : <AdminEmpty title="No applications found">Try a different status or search term.</AdminEmpty>}
        <AdminPagination pagination={state.pagination} onPageChange={setPage} />
      </AdminCard>

      {selectedId && (
        <AdminCard className="admin-detail-card">
          <div className="admin-card-heading">
            <div><h2>Application details</h2><p>Review the submitted profile information and application status.</p></div>
            <button className="admin-text-button" type="button" onClick={() => { setSelectedId(''); setDetails({ loading: false, error: '', application: null }); }}>Close</button>
          </div>
          <AdminNotice onRetry={() => openDetails(selectedId)}>{details.error}</AdminNotice>
          {details.loading ? <AdminLoading>Loading application details…</AdminLoading> : selected && (
            <>
              <dl className="admin-detail-grid">
                <div><dt>Applicant</dt><dd>{applicantName(selected.user)}</dd></div>
                <div><dt>Email</dt><dd>{selected.user?.email || '—'}</dd></div>
                <div><dt>Status</dt><dd><AdminStatusBadge status={selected.status} /></dd></div>
                <div><dt>Account</dt><dd>{selected.user?.isActive ? 'Active' : 'Inactive'} · {selected.user?.role || '—'}</dd></div>
                <div><dt>Job title</dt><dd>{selected.jobTitle || '—'}</dd></div>
                <div><dt>Company</dt><dd>{selected.company || '—'}</dd></div>
                <div><dt>Industry</dt><dd>{selected.industry || '—'}</dd></div>
                <div><dt>Experience</dt><dd>{selected.yearsOfExperience ?? '—'}{selected.yearsOfExperience !== null && selected.yearsOfExperience !== undefined ? ' years' : ''}</dd></div>
                <div><dt>Mentorship style</dt><dd>{selected.mentorshipStyle || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{formatAdminDate(selected.createdAt, true)}</dd></div>
                <div><dt>Reviewed</dt><dd>{formatAdminDate(selected.reviewedAt, true)}</dd></div>
              </dl>
              <div className="admin-detail-section"><h3>Professional background</h3><p className="admin-detail-copy">{selected.professionalBackground || 'No background provided.'}</p></div>
              <div className="admin-detail-section"><h3>Motivation</h3><p className="admin-detail-copy">{selected.motivation || 'No motivation provided.'}</p></div>
              {[
                ['Expertise', selected.expertise],
                ['Skills', selected.skills],
                ['Mentorship areas', selected.mentorshipAreas],
                ['Experience areas', selected.experienceAreas],
                ['Languages', selected.languages],
              ].map(([label, values]) => (
                <div className="admin-detail-section" key={label}><h3>{label}</h3><p className="admin-detail-copy">{Array.isArray(values) && values.length ? values.join(', ') : '—'}</p></div>
              ))}
              <div className="admin-detail-section">
                <label className="admin-filter" htmlFor="admin-notes"><span>Administrator notes</span><textarea id="admin-notes" rows="3" maxLength="2000" value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} /></label>
              </div>
              <div className="admin-action-row">
                {selected.status === 'PENDING' && <>
                  <button className="button button-primary" type="button" disabled={processing} onClick={() => performAction('approve')}>{processing ? 'Saving…' : 'Approve application'}</button>
                  <button className="button button-secondary admin-button-danger" type="button" disabled={processing} onClick={() => performAction('reject')}>Reject application</button>
                  <button className="button button-secondary admin-button-danger" type="button" disabled={processing} onClick={() => performAction('suspend')}>Suspend applicant</button>
                </>}
                {selected.status === 'APPROVED' && <button className="button button-secondary admin-button-danger" type="button" disabled={processing} onClick={() => performAction('suspend')}>{processing ? 'Suspending…' : 'Suspend mentor'}</button>}
              </div>
              {selected.status === 'SUSPENDED' && <AdminNotice kind="success">This mentor is suspended. Their mentorship relationship records remain unchanged.</AdminNotice>}
            </>
          )}
        </AdminCard>
      )}
    </section>
  );
}
