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

const nameOf = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown mentee';

export default function AdminMenteesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState({ loading: false, error: '', mentee: null });
  const [processingId, setProcessingId] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminMentees({
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
        page,
        limit: 15,
      });
      setState({ loading: false, error: '', items: result.items || [], pagination: result.pagination || null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load mentees.') }));
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  async function openDetails(userId) {
    setSelectedId(userId);
    setDetail({ loading: true, error: '', mentee: null });
    try {
      const result = await adminService.getAdminMentee(userId);
      setDetail({ loading: false, error: '', mentee: result.mentee });
    } catch (error) {
      setDetail({ loading: false, error: adminErrorMessage(error, 'Could not load mentee details.'), mentee: null });
    }
  }

  async function toggleAccount(item) {
    const user = item.user;
    if (!user || processingId) return;
    const nextActive = !user.isActive;
    if (!nextActive && !window.confirm(`Deactivate ${nameOf(user)}?`)) return;
    setProcessingId(user.id);
    setNotice('');
    try {
      const result = await adminService.updateAdminUserStatus(user.id, nextActive);
      setNotice(`${nameOf(result.user)} is now ${nextActive ? 'active' : 'inactive'}.`);
      await load();
      if (selectedId === user.id) await openDetails(user.id);
    } catch (error) {
      setState((current) => ({ ...current, error: adminErrorMessage(error, 'Could not update this mentee account.') }));
    } finally {
      setProcessingId('');
    }
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const mentee = detail.mentee;
  const profile = mentee?.profile;
  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Mentee Administration" description="Review mentee accounts and profile information, and manage account access." actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>} />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <AdminFilter label="Account status">
              <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
                <option value="">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </AdminFilter>
            <form className="admin-toolbar-group" onSubmit={applySearch}>
              <AdminFilter label="Search mentees"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" /></AdminFilter>
              <button className="button button-secondary" type="submit">Search</button>
            </form>
          </div>
        </div>
        {state.loading ? <AdminLoading>Loading mentees…</AdminLoading> : state.items.length ? (
          <AdminTable headers={['Mentee', 'Career stage', 'Profile', 'Account', 'Joined', 'Actions']}>
            {state.items.map((item) => (
              <tr key={item.user.id}>
                <td><strong>{nameOf(item.user)}</strong><small>{item.user.email}</small></td>
                <td>{item.profile?.careerStage || '—'}</td>
                <td>{item.profile?.profileCompletion ?? 0}%</td>
                <td><AdminStatusBadge status={item.user.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                <td>{formatAdminDate(item.user.createdAt)}</td>
                <td>
                  <button className="admin-table-row-action" type="button" onClick={() => openDetails(item.user.id)}>Details</button>
                  <button className={`admin-table-row-action${item.user.isActive ? ' admin-row-danger' : ''}`} type="button" disabled={processingId === item.user.id} onClick={() => toggleAccount(item)}>
                    {item.user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : <AdminEmpty title="No mentees found">Try a different account status or search term.</AdminEmpty>}
        <AdminPagination pagination={state.pagination} onPageChange={setPage} />
      </AdminCard>
      {selectedId && (
        <AdminCard className="admin-detail-card">
          <div className="admin-card-heading"><div><h2>Mentee details</h2><p>Profile fields from the mentee account and profile services.</p></div><button className="admin-text-button" type="button" onClick={() => setSelectedId('')}>Close</button></div>
          <AdminNotice onRetry={() => openDetails(selectedId)}>{detail.error}</AdminNotice>
          {detail.loading ? <AdminLoading>Loading mentee details…</AdminLoading> : mentee && (
            <>
              <dl className="admin-detail-grid">
                <div><dt>Name</dt><dd>{nameOf(mentee.user)}</dd></div>
                <div><dt>Email</dt><dd>{mentee.user.email}</dd></div>
                <div><dt>Account</dt><dd><AdminStatusBadge status={mentee.user.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div>
                <div><dt>Joined</dt><dd>{formatAdminDate(mentee.user.createdAt, true)}</dd></div>
                <div><dt>Career stage</dt><dd>{profile?.careerStage || '—'}</dd></div>
                <div><dt>Field of study</dt><dd>{profile?.fieldOfStudy || '—'}</dd></div>
                <div><dt>Profile completion</dt><dd>{profile?.profileCompletion ?? 0}%</dd></div>
                <div><dt>Preferred industry</dt><dd>{profile?.preferredIndustry?.join(', ') || '—'}</dd></div>
              </dl>
              {[
                ['Skills', profile?.skills],
                ['Interests', profile?.interests],
                ['Career goals', profile?.careerGoals],
                ['Mentorship goals', profile?.mentorshipGoals],
                ['Preferred mentor expertise', profile?.preferredMentorExpertise],
                ['Preferred mentorship style', profile?.preferredMentorshipStyle],
              ].map(([label, values]) => <div className="admin-detail-section" key={label}><h3>{label}</h3><p className="admin-detail-copy">{values?.length ? values.join(', ') : '—'}</p></div>)}
              {!profile && <AdminNotice kind="success">This account has no mentee profile yet.</AdminNotice>}
            </>
          )}
        </AdminCard>
      )}
    </section>
  );
}
