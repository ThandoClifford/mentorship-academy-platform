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

const STATUSES = ['PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'DECLINED'];
const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unknown user';

export default function AdminRelationshipsPage() {
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: null });
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState({ loading: false, error: '', relationship: null });
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminRelationships({
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
        page,
        limit: 15,
      });
      setState({ loading: false, error: '', items: result.relationships || [], pagination: result.pagination || null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load mentorship relationships.') }));
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id) {
    setSelectedId(id);
    setDetail({ loading: true, error: '', relationship: null });
    try {
      const result = await adminService.getAdminRelationship(id);
      setDetail({ loading: false, error: '', relationship: result.relationship });
    } catch (error) {
      setDetail({ loading: false, error: adminErrorMessage(error, 'Could not load relationship details.'), relationship: null });
    }
  }

  async function reviewRelationship(approved) {
    if (!relationship || processing) return;
    const action = approved ? 'approve' : 'reject';
    if (!approved && !window.confirm('Reject this mentorship request? This cannot be undone.')) return;
    setProcessing(true);
    setNotice('');
    setDetail((current) => ({ ...current, error: '' }));
    try {
      const result = approved
        ? await adminService.approveAdminRelationship(relationship.id)
        : await adminService.rejectAdminRelationship(relationship.id);
      setDetail({ loading: false, error: '', relationship: result.relationship });
      setNotice(approved ? 'Mentorship request approved.' : 'Mentorship request rejected.');
      await load();
    } catch (error) {
      setDetail((current) => ({
        ...current,
        error: adminErrorMessage(error, `Could not ${action} this mentorship request.`),
      }));
    } finally {
      setProcessing(false);
    }
  }

  function applySearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const relationship = detail.relationship;
  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Mentorship Relationships" description="Review real relationship records and their lifecycle dates." actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>} />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <div className="admin-toolbar-group">
            <AdminFilter label="Relationship status">
              <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
                <option value="">All statuses</option>
                {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </AdminFilter>
            <form className="admin-toolbar-group" onSubmit={applySearch}>
              <AdminFilter label="Search participants">
                <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name or email" />
              </AdminFilter>
              <button className="button button-secondary" type="submit">Search</button>
            </form>
          </div>
        </div>
        {state.loading ? <AdminLoading>Loading relationships…</AdminLoading> : state.items.length ? (
          <AdminTable headers={['Mentee', 'Mentor', 'Status', 'Admin review', 'Requested', 'Started', 'Details']}>
            {state.items.map((item) => (
              <tr key={item.id}>
                <td><strong>{personName(item.mentee)}</strong><small>{item.mentee?.email || 'Email unavailable'}</small></td>
                <td><strong>{personName(item.mentor)}</strong><small>{item.mentor?.email || 'Email unavailable'}</small></td>
                <td><AdminStatusBadge status={item.status} /></td>
                <td><AdminStatusBadge status={item.adminApprovalStatus} /></td>
                <td>{formatAdminDate(item.createdAt)}</td>
                <td>{formatAdminDate(item.activatedAt)}</td>
                <td><button className="admin-table-row-action" type="button" onClick={() => openDetail(item.id)}>View details</button></td>
              </tr>
            ))}
          </AdminTable>
        ) : <AdminEmpty title="No relationships found">There are no relationship records matching these filters.</AdminEmpty>}
        <AdminPagination pagination={state.pagination} onPageChange={setPage} />
      </AdminCard>

      {selectedId && (
        <AdminCard className="admin-detail-card">
          <div className="admin-card-heading"><div><h2>Relationship details</h2><p>Review and approve requests when administrator review is enabled.</p></div><button className="admin-text-button" type="button" onClick={() => setSelectedId('')}>Close</button></div>
          <AdminNotice onRetry={() => openDetail(selectedId)}>{detail.error}</AdminNotice>
          {detail.loading ? <AdminLoading>Loading relationship details…</AdminLoading> : relationship && (
            <>
              <dl className="admin-detail-grid">
                <div><dt>Relationship ID</dt><dd>{relationship.id}</dd></div>
                <div><dt>Status</dt><dd><AdminStatusBadge status={relationship.status} /></dd></div>
                <div><dt>Administrator review</dt><dd><AdminStatusBadge status={relationship.adminApprovalStatus} /></dd></div>
                <div><dt>Mentee</dt><dd>{personName(relationship.mentee)} · {relationship.mentee?.email || '—'}</dd></div>
                <div><dt>Mentor</dt><dd>{personName(relationship.mentor)} · {relationship.mentor?.email || '—'}</dd></div>
                <div><dt>Requested</dt><dd>{formatAdminDate(relationship.createdAt, true)}</dd></div>
                <div><dt>Accepted</dt><dd>{formatAdminDate(relationship.acceptedAt, true)}</dd></div>
                <div><dt>Activated</dt><dd>{formatAdminDate(relationship.activatedAt, true)}</dd></div>
                <div><dt>Completed</dt><dd>{formatAdminDate(relationship.completedAt, true)}</dd></div>
                <div><dt>Archived</dt><dd>{formatAdminDate(relationship.archivedAt, true)}</dd></div>
              </dl>
              {relationship.requestMessage && <div className="admin-detail-section"><h3>Request message</h3><p className="admin-detail-copy">{relationship.requestMessage}</p></div>}
              {relationship.status === 'PENDING' && relationship.adminApprovalStatus === 'PENDING' && (
                <div className="admin-action-row">
                  <button className="button button-primary" type="button" disabled={processing} onClick={() => reviewRelationship(true)}>
                    {processing ? 'Saving…' : 'Approve request'}
                  </button>
                  <button className="button button-secondary admin-button-danger" type="button" disabled={processing} onClick={() => reviewRelationship(false)}>
                    Reject request
                  </button>
                </div>
              )}
            </>
          )}
        </AdminCard>
      )}
    </section>
  );
}
