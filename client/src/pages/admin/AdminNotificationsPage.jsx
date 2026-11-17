import { useState } from 'react';
import * as adminService from '../../services/adminService.js';
import { AdminCard, AdminFilter, AdminNotice, AdminPageHeader, adminErrorMessage } from '../../components/admin/AdminUI.jsx';

const initialForm = { target: 'ALL_MENTEES', title: '', message: '' };

export default function AdminNotificationsPage() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await adminService.broadcastAdminNotification(form);
      setNotice(`Notification sent to ${result.sentCount} ${result.sentCount === 1 ? 'recipient' : 'recipients'}. Broadcast history is not available in the current API.`);
      setForm(initialForm);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Could not send this notification.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Notifications" description="Send a real announcement to a supported audience. The current backend does not expose broadcast history." />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice>{error}</AdminNotice>
      <AdminCard>
        <form className="resource-admin-form" onSubmit={submit}>
          <div className="resource-admin-form-grid">
            <AdminFilter label="Audience">
              <select value={form.target} onChange={(event) => update('target', event.target.value)}>
                <option value="ALL_MENTEES">All mentees</option>
                <option value="ALL_MENTORS">All mentors</option>
                <option value="ALL_USERS">All users</option>
              </select>
            </AdminFilter>
            <AdminFilter label="Title"><input required maxLength={160} value={form.title} onChange={(event) => update('title', event.target.value)} /></AdminFilter>
            <AdminFilter label="Message"><textarea required maxLength={4000} rows={6} value={form.message} onChange={(event) => update('message', event.target.value)} /></AdminFilter>
          </div>
          <div className="admin-action-row">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send announcement'}</button>
          </div>
        </form>
      </AdminCard>
    </section>
  );
}
