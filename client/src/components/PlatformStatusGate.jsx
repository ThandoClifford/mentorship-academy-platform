import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import * as adminService from '../services/adminService.js';
import { AdminCard, AdminLoading, AdminNotice, AdminPageHeader } from './admin/AdminUI.jsx';

export default function PlatformStatusGate({ children }) {
  const { user, loading: authLoading, logout } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState({ loading: true, error: '', maintenanceMode: false, maintenanceMessage: '' });

  const refresh = useCallback(async () => {
    try {
      const result = await adminService.getPlatformStatus();
      setStatus({
        loading: false,
        error: '',
        maintenanceMode: Boolean(result.maintenanceMode),
        maintenanceMessage: result.maintenanceMessage || '',
      });
    } catch (error) {
      setStatus((current) => ({
        ...current,
        loading: false,
        error: error.response?.data?.message || 'Could not verify Academy availability.',
      }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('platform:settings-updated', refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('platform:settings-updated', refresh);
    };
  }, [refresh]);

  if (location.pathname === '/login') return children;
  if (user?.role === 'ADMIN' && !authLoading) return children;

  if (status.loading) {
    return <main className="admin-workspace"><AdminCard><AdminLoading>Checking Academy availability…</AdminLoading></AdminCard></main>;
  }

  if (status.maintenanceMode) {
    return (
      <main className="admin-workspace">
        <AdminPageHeader title="We'll be back soon" description={status.maintenanceMessage} />
        <AdminCard>
          {user ? (
            <button className="button button-secondary" type="button" onClick={() => { logout(); window.location.assign('/login'); }}>Sign out to continue</button>
          ) : (
            <Link className="button button-secondary" to="/login">Administrator sign in</Link>
          )}
        </AdminCard>
      </main>
    );
  }

  return (
    <div>
      {status.error && (
        <div className="admin-workspace" key="platform-error">
          <AdminNotice onRetry={refresh}>{status.error}</AdminNotice>
        </div>
      )}
      <Fragment key="platform-content">{children}</Fragment>
    </div>
  );
}
