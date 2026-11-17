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

const nameOf = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown mentor';

export default function AdminMentorsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState({ loading: false, error: '', mentor: null });
  const [processingId, setProcessingId] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminMentors({
        status: 'APPROVED',
        ...(active ? { active } : {}),
        ...(search ? { search } : {}),
        page,
        limit: 15,
      });
      setState({ loading: false, error: '', items: result.items || [], pagination: result.pagination || null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load approved mentors.') }));
    }
  }, [active, page, search]);

  useEffect(() => { load(); }, [load]);

  async function openDetails(id) {
    setSelectedId(id);
    setDetail({ loading: true, error: '', mentor: null });
    try {
      const result = await adminService.getAdminMentor(id);
      setDetail({ loading: false, error: '', mentor: result.mentor });
    } catch (error) {
      setDetail({ loading: false, error: adminErrorMessage(error, 'Could not load mentor details.'), mentor: null });
    }
  }

  async function toggleAccount(mentor) {
    const user = mentor.user;
    if (!user || processingId) return;
    const nextActive = !user.isActive;
    if (!nextActive && !window.confirm(`Deactivate ${nameOf(user)}?`)) return;
    setProcessingId(user.id);
    setNotice('');
    setState((current) => ({ ...current, error: '' }));
    try {
      const result = await adminService.updateAdminUserStatus(user.id, nextActive);
      setNotice(`${nameOf(result.user)} is now ${nextActive ? 'active' : 'inactive'}.`);
      await load();
      if (selectedId === mentor.id) await openDetails(mentor.id);
    } catch (error) {
      setState((current) => ({ ...current, error: adminErrorMessage(error, 'Could not update this mentor account.') }));
    } finally {
      setProcessingId('');
    }
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const mentor = detail.mentor;
  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Mentor Administration" description="Review approved mentor profiles and manage account access without changing mentor roles." actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>} />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <AdminFilter label="Account status">
              <select value={active} onChange={(event) => { setPage(1); setActive(event.target.value); }}>
                <option value="">All approved mentors</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </AdminFilter>
            <form className="admin-toolbar-group" onSubmit={applySearch}>
              <AdminFilter label="Search mentors">
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" />
              </AdminFilter>
              <button className="button button-secondary" type="submit">Search</button>
            </form>
          </div>
        </div>
        {state.loading ? <AdminLoading>Loading approved mentors…</AdminLoading> : state.items.length ? (
          <AdminTable headers={['Mentor', 'Expertise', 'Application', 'Account', 'Joined', 'Actions']}>
            {state.items.map((item) => (
              <tr key={item.id}>
                <td><strong>{nameOf(item.user)}</strong><small>{item.user?.email || 'Email unavailable'}</small></td>
                <td>{(item.expertise?.length ? item.expertise : item.skills || []).slice(0, 3).join(', ') || '—'}</td>
                <td><AdminStatusBadge status={item.applicationStatus} /></td>
                <td><AdminStatusBadge status={item.user?.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td>{formatAdminDate(item.user?.createdAt || item.createdAt)}</td>
                <td>
                  <button className="admin-table-row-action" type="button" onClick={() => openDetails(item.id)}>Details</button>
                  <button className={`admin-table-row-action${item.user?.isActive ? ' admin-row-danger' : ''}`} type="button" disabled={processingId === item.user?.id} onClick={() => toggleAccount(item)}>
                    {item.user?.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : <AdminEmpty title="No approved mentors found">Approved mentor profiles matching these filters will appear here.</AdminEmpty>}
        <AdminPagination pagination={state.pagination} onPageChange={setPage} />
      </AdminCard>
      {selectedId && (
        <AdminCard className="admin-detail-card">
          <div className="admin-card-heading"><div><h2>Mentor details</h2><p>Profile and account information from the existing mentor records.</p></div><button className="admin-text-button" type="button" onClick={() => setSelectedId('')}>Close</button></div>
          <AdminNotice onRetry={() => openDetails(selectedId)}>{detail.error}</AdminNotice>
          {detail.loading ? <AdminLoading>Loading mentor details…</AdminLoading> : mentor && (
            <>
              <dl className="admin-detail-grid">
                <div><dt>Name</dt><dd>{nameOf(mentor.user)}</dd></div>
                <div><dt>Email</dt><dd>{mentor.user?.email || '—'}</dd></div>
                <div><dt>Application status</dt><dd><AdminStatusBadge status={mentor.applicationStatus} /></dd></div>
                <div><dt>Mentor profile</dt><dd><AdminStatusBadge status={mentor.status} /></dd></div>
                <div><dt>Account</dt><dd><AdminStatusBadge status={mentor.user?.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div>
                <div><dt>Joined</dt><dd>{formatAdminDate(mentor.user?.createdAt, true)}</dd></div>
                <div><dt>Job title</dt><dd>{mentor.jobTitle || '—'}</dd></div>
                <div><dt>Company</dt><dd>{mentor.company || '—'}</dd></div>
                <div><dt>Industry</dt><dd>{mentor.industry || '—'}</dd></div>
                <div><dt>Experience</dt><dd>{mentor.yearsOfExperience ?? '—'}</dd></div>
              </dl>
              <div className="admin-detail-section"><h3>Professional background</h3><p className="admin-detail-copy">{mentor.professionalBackground || mentor.bio || '—'}</p></div>
              {[
                ['Expertise', mentor.expertise],
                ['Skills', mentor.skills],
                ['Specialisations', mentor.specialisations],
                ['Mentorship areas', mentor.mentorshipAreas],
                ['Experience areas', mentor.experienceAreas],
              ].map(([label, values]) => <div className="admin-detail-section" key={label}><h3>{label}</h3><p className="admin-detail-copy">{values?.length ? values.join(', ') : '—'}</p></div>)}
            </>
          )}
        </AdminCard>
      )}
    </section>
  );
}
