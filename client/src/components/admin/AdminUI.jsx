import './AdminWorkspace.css';

export function AdminPageHeader({ eyebrow = 'Administration', title, description, actions }) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function AdminCard({ children, className = '', ...props }) {
  return <section className={`admin-card${className ? ` ${className}` : ''}`} {...props}>{children}</section>;
}

export function AdminStatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  return <span className={`admin-status admin-status--${normalized.toLowerCase()}`}>{normalized.replaceAll('_', ' ')}</span>;
}

export function AdminNotice({ kind = 'error', children, onRetry }) {
  if (!children) return null;
  return (
    <div className={`admin-notice admin-notice--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onRetry && <button className="admin-text-button" type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function AdminLoading({ children = 'Loading administration data…' }) {
  return <div className="admin-state" role="status"><span className="admin-spinner" aria-hidden="true" />{children}</div>;
}

export function AdminEmpty({ title, children }) {
  return <div className="admin-empty"><span className="admin-empty-mark" aria-hidden="true">—</span><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}

export function AdminPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <nav className="admin-pagination" aria-label="Pagination">
      <span>{pagination.total} records · Page {pagination.page} of {pagination.totalPages}</span>
      <div>
        <button className="button button-secondary" type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Previous</button>
        <button className="button button-secondary" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next</button>
      </div>
    </nav>
  );
}

export function AdminTable({ children, headers, className = '' }) {
  return (
    <div className={`admin-table-wrap ${className}`}>
      <table className="admin-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function adminErrorMessage(error, fallback) {
  const status = error.response?.status;
  if (status === 401) return 'Your session has expired. Sign in again to continue.';
  if (status === 403) return 'Your administrator access is not available for this action.';
  if (status === 404) return error.response?.data?.message || 'The requested record could not be found. Refresh the list and try again.';
  return error.response?.data?.message || fallback;
}

export function formatAdminDate(value, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' });
}

export function AdminFilter({ label, children }) {
  return <label className="admin-filter"><span>{label}</span>{children}</label>;
}
