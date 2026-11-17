import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminFilter,
  adminErrorMessage,
} from '../../components/admin/AdminUI.jsx';

const toggles = [
  ['allowMentorApplications', 'Accept mentor applications'],
  ['requireAdminApprovalForMentors', 'Require administrator approval for mentor applications'],
  ['allowMenteeMentorRequests', 'Allow mentees to request mentors'],
  ['requireAdminApprovalForRelationships', 'Require administrator approval for mentorship requests'],
  ['aiMatchmakingEnabled', 'Enable AI matchmaking'],
  ['publicMentorProfilesEnabled', 'Show approved mentors on the public mentor directory'],
  ['publicEventsEnabled', 'Enable public events'],
  ['maintenanceMode', 'Enable maintenance mode'],
];

const textFields = [
  ['academyName', 'Academy name', 160, 'text'],
  ['academyDescription', 'Academy description', 2000, 'textarea'],
  ['contactEmail', 'Contact email', 254, 'email'],
  ['contactPhone', 'Contact phone', 50, 'tel'],
  ['websiteUrl', 'Website URL', 500, 'url'],
  ['address', 'Address', 1000, 'textarea'],
  ['mentorshipProgramName', 'Mentorship programme name', 160, 'text'],
  ['mentorshipProgramDescription', 'Mentorship programme description', 2000, 'textarea'],
  ['maintenanceMessage', 'Maintenance message', 1000, 'textarea'],
];

const numberFields = [
  ['maxMenteesPerMentor', 'Maximum mentees per mentor', 1, 100],
  ['minimumMatchScore', 'Minimum match score', 0, 100],
  ['maximumSuggestedMentors', 'Maximum suggested mentors', 1, 100],
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminService.getAdminSettings();
      setSettings(result.settings);
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Could not load Academy settings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!settings || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await adminService.updateAdminSettings(settings);
      setSettings(result.settings);
      setNotice('Academy settings saved.');
      window.dispatchEvent(new Event('platform:settings-updated'));
    } catch (requestError) {
      setError(adminErrorMessage(requestError, 'Could not save Academy settings.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-workspace">
      <AdminPageHeader title="Academy Settings" description="Manage Academy information, programme policies, matching limits, public visibility, and maintenance mode." actions={<button className="button button-secondary" type="button" onClick={load} disabled={loading}>Refresh</button>} />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{error}</AdminNotice>
      {loading ? <AdminCard><AdminLoading>Loading Academy settings…</AdminLoading></AdminCard> : settings && (
        <form onSubmit={submit}>
          <AdminCard className="resource-admin-form">
            <div className="admin-card-heading"><div><h2>Academy information</h2><p>These details are saved persistently. Public informational pages do not currently consume all of these fields.</p></div></div>
            <div className="resource-admin-form-grid">
              {textFields.map(([field, label, maxLength, type]) => (
                <AdminFilter label={label} key={field}>
                  {type === 'textarea'
                    ? <textarea maxLength={maxLength} rows={field.includes('Description') ? 4 : 3} value={settings[field] ?? ''} onChange={(event) => update(field, event.target.value)} />
                    : <input type={type} maxLength={maxLength} value={settings[field] ?? ''} onChange={(event) => update(field, event.target.value)} required={['academyName', 'mentorshipProgramName'].includes(field)} />}
                </AdminFilter>
              ))}
            </div>
          </AdminCard>
          <AdminCard className="resource-admin-form">
            <div className="admin-card-heading"><div><h2>Programme policies</h2><p>These options control current application, mentorship, matchmaking, and visibility workflows where supported.</p></div></div>
            <div className="resource-admin-form-grid">
              {numberFields.map(([field, label, min, max]) => (
                <AdminFilter label={label} key={field}>
                  <input type="number" min={min} max={max} step="1" required value={settings[field] ?? ''} onChange={(event) => update(field, event.target.value === '' ? '' : Number(event.target.value))} />
                </AdminFilter>
              ))}
            </div>
            <div className="admin-settings-toggles">
              {toggles.map(([field, label]) => (
                <label className="resource-publish-toggle" key={field}>
                  <input type="checkbox" checked={Boolean(settings[field])} onChange={(event) => update(field, event.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <p className="admin-detail-copy">Public events are not currently implemented; the events setting is stored but has no effect yet. Maintenance mode keeps administrator and sign-in APIs available and displays the configured message to other visitors.</p>
            <div className="admin-action-row"><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>
          </AdminCard>
        </form>
      )}
    </section>
  );
}
