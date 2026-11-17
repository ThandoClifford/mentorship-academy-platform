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
  AdminTable,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';

function actorName(actor) {
  return [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') || 'System';
}

function safeMetadataSummary(metadata) {
  const allowed = ['status', 'targetRole', 'isActive', 'recipientCount', 'target', 'newStatus', 'oldStatus'];
  return allowed
    .filter((key) => metadata && Object.prototype.hasOwnProperty.call(metadata, key))
    .map((key) => `${key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}: ${String(metadata[key])}`)
    .join(' · ');
}

export default function AdminAuditPage() {
  const [actionInput, setActionInput] = useState('');
  const [entityInput, setEntityInput] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', logs: [], pagination: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminAuditLogs({
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
        page,
        limit: 20,
      });
      setState({ loading: false, error: '', logs: result.logs || [], pagination: result.pagination || null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: adminErrorMessage(error, 'Could not load audit records.') }));
    }
  }, [action, entityType, page]);

  useEffect(() => { load(); }, [load]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setAction(actionInput.trim());
    setEntityType(entityInput.trim());
  }

  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Audit Log" description="Review administrative and platform actions recorded by the audit service." actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>} />
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      <AdminCard>
        <form className="admin-toolbar" onSubmit={applyFilters}>
          <div className="admin-toolbar-group">
            <AdminFilter label="Action">
              <input value={actionInput} onChange={(event) => setActionInput(event.target.value)} placeholder="e.g. MENTOR_APPLICATION_APPROVED" />
            </AdminFilter>
            <AdminFilter label="Entity type">
              <input value={entityInput} onChange={(event) => setEntityInput(event.target.value)} placeholder="e.g. USER" />
            </AdminFilter>
            <button className="button button-secondary" type="submit">Apply filters</button>
          </div>
        </form>
        {state.loading ? <AdminLoading>Loading audit log…</AdminLoading> : state.logs.length ? (
          <AdminTable headers={['Action', 'Actor', 'Entity', 'Relevant details', 'Timestamp']}>
            {state.logs.map((log) => (
              <tr key={log.id}>
                <td><strong>{String(log.action).replaceAll('_', ' ')}</strong></td>
                <td>{actorName(log.actor)}<small>{log.actor?.role || '—'}</small></td>
                <td><strong>{log.entityType}</strong><small title={log.entityId}>{String(log.entityId || '').slice(0, 12)}{String(log.entityId || '').length > 12 ? '…' : ''}</small></td>
                <td>{safeMetadataSummary(log.metadata) || '—'}</td>
                <td>{formatAdminDate(log.createdAt, true)}</td>
              </tr>
            ))}
          </AdminTable>
        ) : <AdminEmpty title="No audit entries found">Adjust the filters or check again after more activity is recorded.</AdminEmpty>}
        <AdminPagination pagination={state.pagination} onPageChange={setPage} />
      </AdminCard>
    </section>
  );
}
