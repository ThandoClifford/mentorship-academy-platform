import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminFilter,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminStatusBadge,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';

const resourceTypes = ['ARTICLE', 'VIDEO', 'TOOL', 'GUIDE', 'CHECKLIST', 'WORKBOOK'];
const categories = ['CAREER', 'MENTORSHIP', 'SKILLS', 'WELLBEING', 'FINANCE', 'PROGRAMME', 'GENERAL'];
const audiences = ['ALL', 'MENTEE', 'MENTOR', 'ADMIN'];
const emptyResource = {
  title: '',
  description: '',
  type: 'ARTICLE',
  category: 'GENERAL',
  url: '',
  image: '',
  audience: ['ALL'],
};

function ResourceForm({ initial, onSave, onCancel, saving }) {
  const [values, setValues] = useState(initial || emptyResource);
  const [formError, setFormError] = useState('');

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleAudience(value) {
    const audience = values.audience.includes(value)
      ? values.audience.filter((entry) => entry !== value)
      : [...values.audience, value];
    update('audience', audience);
  }

  async function submit(event) {
    event.preventDefault();
    if (!values.audience.length) {
      setFormError('Choose at least one audience.');
      return;
    }
    setFormError('');
    await onSave(values);
  }

  return (
    <form className="admin-card resource-admin-form" onSubmit={submit}>
      <div className="admin-card-heading">
        <div>
          <h2>{initial ? 'Edit resource' : 'Create a resource'}</h2>
          <p>Published resources are shown to matching audiences in their workspaces.</p>
        </div>
      </div>
      {formError && <AdminNotice>{formError}</AdminNotice>}
      <div className="resource-admin-form-grid">
        <AdminFilter label="Title">
          <input required maxLength={200} value={values.title} onChange={(event) => update('title', event.target.value)} />
        </AdminFilter>
        <AdminFilter label="Resource type">
          <select value={values.type} onChange={(event) => update('type', event.target.value)}>
            {resourceTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </AdminFilter>
        <AdminFilter label="Category">
          <select value={values.category} onChange={(event) => update('category', event.target.value)}>
            {categories.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </AdminFilter>
        <AdminFilter label="Resource URL">
          <input type="url" maxLength={500} value={values.url} onChange={(event) => update('url', event.target.value)} placeholder="https://" />
        </AdminFilter>
        <AdminFilter label="Image URL">
          <input type="url" maxLength={500} value={values.image} onChange={(event) => update('image', event.target.value)} placeholder="Optional" />
        </AdminFilter>
        <fieldset className="resource-audience-field">
          <legend>Audience</legend>
          <div>
            {audiences.map((audience) => (
              <label key={audience}>
                <input
                  type="checkbox"
                  checked={values.audience.includes(audience)}
                  onChange={() => toggleAudience(audience)}
                />
                {audience}
              </label>
            ))}
          </div>
        </fieldset>
        <AdminFilter label="Description">
          <textarea maxLength={4000} rows={4} value={values.description} onChange={(event) => update('description', event.target.value)} />
        </AdminFilter>
      </div>
      <div className="admin-action-row">
        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create resource'}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

export default function AdminResourcesPage() {
  const [state, setState] = useState({ loading: true, error: '', resources: [] });
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [processingId, setProcessingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await adminService.listAdminResources();
      setState({ loading: false, error: '', resources: result.resources || [] });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: adminErrorMessage(error, 'Could not load resources.'),
      }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveResource(values) {
    setSaving(true);
    setState((current) => ({ ...current, error: '' }));
    setNotice('');
    try {
      if (editing) {
        await adminService.updateAdminResource(editing.id, values);
        setNotice('Resource changes saved.');
      } else {
        await adminService.createAdminResource(values);
        setNotice('Resource created as a draft.');
      }
      setEditing(null);
      setCreating(false);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: adminErrorMessage(error, 'Could not save this resource.') }));
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(resource) {
    setProcessingId(resource.id);
    setState((current) => ({ ...current, error: '' }));
    setNotice('');
    try {
      if (resource.published) {
        await adminService.unpublishAdminResource(resource.id);
        setNotice('Resource unpublished.');
      } else {
        await adminService.publishAdminResource(resource.id);
        setNotice('Resource published.');
      }
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: adminErrorMessage(error, 'Could not update publication status.') }));
    } finally {
      setProcessingId('');
    }
  }

  async function removeResource(resource) {
    if (!window.confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    setProcessingId(resource.id);
    setState((current) => ({ ...current, error: '' }));
    setNotice('');
    try {
      await adminService.deleteAdminResource(resource.id);
      setNotice('Resource deleted.');
      if (editing?.id === resource.id) setEditing(null);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: adminErrorMessage(error, 'Could not delete this resource.') }));
    } finally {
      setProcessingId('');
    }
  }

  const filtered = state.resources.filter((resource) =>
    `${resource.title} ${resource.description} ${resource.category} ${resource.type}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  return (
    <section className="admin-workspace resource-admin-page">
      <AdminPageHeader
        title="Resource Management"
        description="Create and maintain resources, choose who can see them, and control publication."
        actions={<button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>Refresh</button>}
      />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={load}>{state.error}</AdminNotice>
      {!creating && !editing && (
        <div className="resource-admin-toolbar">
          <AdminFilter label="Search resources">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, type, or category" />
          </AdminFilter>
          <button className="button button-primary" type="button" onClick={() => { setCreating(true); setNotice(''); }}>
            Create resource
          </button>
        </div>
      )}
      {(creating || editing) && (
        <ResourceForm
          key={editing?.id || 'new-resource'}
          initial={editing}
          onSave={saveResource}
          onCancel={() => { setCreating(false); setEditing(null); }}
          saving={saving}
        />
      )}
      <AdminCard className="resource-admin-list">
        <div className="admin-card-heading">
          <div><h2>Resources</h2><p>{state.resources.length} total</p></div>
        </div>
        {state.loading ? <AdminLoading>Loading resources…</AdminLoading> : !state.resources.length ? (
          <AdminEmpty title="No resources yet">Create a resource draft to start building the library.</AdminEmpty>
        ) : !filtered.length ? (
          <AdminEmpty title="No matching resources">Try a different search term.</AdminEmpty>
        ) : (
          <div className="resource-admin-grid">
            {filtered.map((resource) => (
              <article className="resource-admin-item" key={resource.id}>
                {resource.image && <img src={resource.image} alt="" loading="lazy" />}
                <div className="resource-admin-item-body">
                  <div className="resource-admin-item-status">
                    <AdminStatusBadge status={resource.published ? 'PUBLISHED' : 'DRAFT'} />
                    <span>{resource.type} · {resource.category}</span>
                  </div>
                  <h3>{resource.title}</h3>
                  <p>{resource.description || 'No description provided.'}</p>
                  <div className="resource-admin-meta">
                    <span>Audience: {resource.audience?.join(', ') || 'ALL'}</span>
                    <span>Updated {formatAdminDate(resource.updatedAt)}</span>
                  </div>
                  <div className="admin-action-row">
                    <button className="button button-secondary" type="button" disabled={processingId === resource.id} onClick={() => { setEditing(resource); setCreating(false); setNotice(''); }}>
                      Edit
                    </button>
                    <button className="button button-secondary" type="button" disabled={processingId === resource.id} onClick={() => togglePublished(resource)}>
                      {processingId === resource.id ? 'Saving…' : resource.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button className="button admin-button-danger" type="button" disabled={processingId === resource.id} onClick={() => removeResource(resource)}>
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminCard>
    </section>
  );
}
