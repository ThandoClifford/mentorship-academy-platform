import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
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

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', users: [], pagination: null });
  const [processingId, setProcessingId] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState({ loading: false, error: '', user: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminUsers({
        ...(role ? { role } : {}),
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
        page,
        limit: 15,
      });
      setState({ loading: false, error: '', users: result.users || [], pagination: result.pagination || null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load academy users.') }));
    }
  }, [page, role, search, status]);

  useEffect(() => { load(); }, [load]);

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function toggleUser(user) {
    const nextActive = !user.isActive;
    if (!nextActive && !window.confirm(`Deactivate ${user.firstName} ${user.lastName}? They will no longer be able to access the platform.`)) return;
    setProcessingId(user.id);
    setNotice('');
    setState((current) => ({ ...current, error: '' }));
    try {
      const result = await adminService.updateAdminUserStatus(user.id, nextActive);
      setState((current) => ({
        ...current,
        users: current.users.map((item) => item.id === user.id ? result.user : item),
      }));
      setNotice(`${user.firstName} ${user.lastName} is now ${nextActive ? 'active' : 'inactive'}.`);
    } catch (error) {
      setState((current) => ({ ...current, error: adminErrorMessage(error, 'Could not update this account.') }));
    } finally {
      setProcessingId('');
    }
  }

  async function openDetails(id) {
    setSelectedId(id);
    setDetail({ loading: true, error: '', user: null });
    try {
      const result = await adminService.getAdminUser(id);
      setDetail({ loading: false, error: '', user: result.user });
    } catch (error) {
      setDetail({ loading: false, error: adminErrorMessage(error, 'Could not load user details.'), user: null });
    }
  }

  return (
    <section className="admin-workspace">
      <AdminPageHeader title="User Management" description="Search academy accounts, review roles and status, and manage account access." actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>} />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <AdminFilter label="Role">
              <select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}>
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="MENTOR">Mentor</option>
                <option value="MENTEE">Mentee</option>
              </select>
            </AdminFilter>
            <AdminFilter label="Account status">
              <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
                <option value="">All accounts</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </AdminFilter>
            <form className="admin-toolbar-group" onSubmit={applySearch}>
              <AdminFilter label="Search users">
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" />
              </AdminFilter>
              <button className="button button-secondary" type="submit">Search</button>
            </form>
          </div>
        </div>
        {state.loading ? <AdminLoading>Loading users…</AdminLoading> : state.users.length ? (
          <AdminTable headers={['User', 'Role', 'Account', 'Joined', 'Control']}>
            {state.users.map((item) => {
              const isCurrentUser = String(item.id) === String(currentUser?.id);
              return (
                <tr key={item.id}>
                  <td><strong>{item.firstName} {item.lastName}</strong><small>{item.email}</small></td>
                  <td>{item.role}</td>
                  <td><AdminStatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td>{formatAdminDate(item.createdAt)}</td>
                  <td>
                    <button className="admin-table-row-action" type="button" onClick={() => openDetails(item.id)}>Details</button>
                    <button
                      className={`admin-table-row-action${item.isActive ? ' admin-row-danger' : ''}`}
                      type="button"
                      disabled={isCurrentUser || processingId === item.id}
                      title={isCurrentUser ? 'You cannot change your own account status.' : undefined}
                      onClick={() => toggleUser(item)}
                    >
                      {processingId === item.id ? 'Saving…' : item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        ) : <AdminEmpty title="No users found">Try a different role, account status, or search term.</AdminEmpty>}
        <AdminPagination pagination={state.pagination} onPageChange={setPage} />
      </AdminCard>
      {selectedId && (
        <AdminCard className="admin-detail-card">
          <div className="admin-card-heading"><div><h2>User details</h2><p>Account information from the administrator user endpoint.</p></div><button className="admin-text-button" type="button" onClick={() => setSelectedId('')}>Close</button></div>
          {detail.loading ? <AdminLoading>Loading user details…</AdminLoading> : detail.error ? (
            <AdminNotice onRetry={() => openDetails(selectedId)}>{detail.error}</AdminNotice>
          ) : detail.user && (
            <dl className="admin-detail-grid">
              <div><dt>Name</dt><dd>{detail.user.firstName} {detail.user.lastName}</dd></div>
              <div><dt>Email</dt><dd>{detail.user.email}</dd></div>
              <div><dt>Role</dt><dd>{detail.user.role}</dd></div>
              <div><dt>Account</dt><dd><AdminStatusBadge status={detail.user.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div>
              <div><dt>Joined</dt><dd>{formatAdminDate(detail.user.createdAt, true)}</dd></div>
              <div><dt>Last updated</dt><dd>{formatAdminDate(detail.user.updatedAt, true)}</dd></div>
            </dl>
          )}
        </AdminCard>
      )}
    </section>
  );
}
