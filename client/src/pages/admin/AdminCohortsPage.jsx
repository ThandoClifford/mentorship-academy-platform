import { useCallback, useEffect, useMemo, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import * as cohortService from '../../services/cohortService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminFilter,
  AdminLoading,
  AdminNotice,
  AdminPagination,
  AdminPageHeader,
  AdminStatusBadge,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  startsAt: '',
  endsAt: '',
};

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getPersonName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Unknown user';
}

function statusOptions(status) {
  if (status === 'ENROLLED') return ['ACTIVE', 'REMOVED'];
  if (status === 'ACTIVE') return ['PAUSED', 'COMPLETED', 'REMOVED'];
  if (status === 'PAUSED') return ['ACTIVE', 'REMOVED'];
  return [];
}

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState([]);
  const [cohortPagination, setCohortPagination] = useState(null);
  const [cohortPage, setCohortPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [members, setMembers] = useState([]);
  const [memberPagination, setMemberPagination] = useState(null);
  const [memberPage, setMemberPage] = useState(1);
  const [memberCounts, setMemberCounts] = useState({ total: 0, mentees: 0, mentors: 0 });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [formState, setFormState] = useState({ loading: false, error: '' });
  const [pageState, setPageState] = useState({ loading: true, error: '' });
  const [notice, setNotice] = useState('');
  const [settingsEnabled, setSettingsEnabled] = useState(false);
  const [role, setRole] = useState('MENTEE');
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState('');
  const [candidateState, setCandidateState] = useState({ loading: false, error: '' });
  const [memberProcessing, setMemberProcessing] = useState('');

  const selectedCohort = cohorts.find((cohort) => cohort.id === selectedId) || null;
  const editable = selectedCohort && ['DRAFT', 'ENROLLING'].includes(selectedCohort.status);

  const loadCohorts = useCallback(async (page = cohortPage) => {
    setPageState({ loading: true, error: '' });
    try {
      const [result, settingResult] = await Promise.all([
        cohortService.listCohorts({ page, limit: 20 }),
        adminService.getAdminSettings(),
      ]);
      const nextCohorts = result.cohorts || [];
      setCohorts(nextCohorts);
      setCohortPagination(result.pagination || null);
      setSettingsEnabled(Boolean(settingResult.settings?.cohortManagementEnabled));
      setSelectedId((current) => nextCohorts.some((cohort) => cohort.id === current)
        ? current
        : nextCohorts[0]?.id || '');
      setPageState({ loading: false, error: '' });
    } catch (error) {
      setPageState({ loading: false, error: adminErrorMessage(error, 'Could not load cohorts.') });
    }
  }, [cohortPage]);

  const loadSelected = useCallback(async (id) => {
    if (!id) {
      setMembers([]);
      setMemberPagination(null);
      setMemberCounts({ total: 0, mentees: 0, mentors: 0 });
      setForm(EMPTY_FORM);
      setEditing(false);
      return;
    }
    try {
      const [detail, roster] = await Promise.all([
        cohortService.getCohort(id),
        cohortService.listCohortMembers(id, { page: memberPage, limit: 20 }),
      ]);
      setMembers(roster.members || []);
      setMemberPagination(roster.pagination || null);
      setMemberCounts(detail.memberCounts || { total: 0, mentees: 0, mentors: 0 });
      setForm({
        name: detail.cohort.name || '',
        code: detail.cohort.code || '',
        description: detail.cohort.description || '',
        startsAt: toLocalDateTime(detail.cohort.startsAt),
        endsAt: toLocalDateTime(detail.cohort.endsAt),
      });
      setEditing(false);
    } catch (error) {
      setPageState({ loading: false, error: adminErrorMessage(error, 'Could not load cohort details.') });
    }
  }, [memberPage]);

  useEffect(() => { loadCohorts(); }, [loadCohorts]);
  useEffect(() => { loadSelected(selectedId); }, [loadSelected, selectedId]);

  const loadCandidates = useCallback(async (nextRole) => {
    setCandidateState({ loading: true, error: '' });
    setCandidateId('');
    try {
      if (nextRole === 'MENTEE') {
        const result = await adminService.listAdminMentees({ active: 'true', page: 1, limit: 100 });
        setCandidates((result.items || []).map((item) => item.user).filter(Boolean));
      } else {
        const result = await adminService.listAdminMentors({ active: 'true', page: 1, limit: 100 });
        setCandidates((result.items || []).map((item) => item.user).filter(Boolean));
      }
      setCandidateState({ loading: false, error: '' });
    } catch (error) {
      setCandidateState({ loading: false, error: adminErrorMessage(error, 'Could not load eligible users.') });
    }
  }, []);

  useEffect(() => { loadCandidates(role); }, [loadCandidates, role]);

  const candidateOptions = useMemo(
    () => candidates.filter((candidate) =>
      !members.some((member) => member.user?.id === candidate.id && ['ENROLLED', 'ACTIVE', 'PAUSED'].includes(member.status))),
    [candidates, members],
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitCohort(event) {
    event.preventDefault();
    if (formState.loading) return;
    setFormState({ loading: true, error: '' });
    setNotice('');
    const payload = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };
    try {
      if (selectedCohort && editing) {
        await cohortService.updateCohort(selectedCohort.id, payload);
        setNotice('Cohort details updated.');
      } else {
        const result = await cohortService.createCohort(payload);
        setSelectedId(result.cohort.id);
        setNotice('Cohort created.');
      }
      if (!selectedCohort) {
        setCohortPage(1);
        await loadCohorts(1);
      } else {
        await loadCohorts();
      }
      setFormState({ loading: false, error: '' });
    } catch (error) {
      setFormState({ loading: false, error: adminErrorMessage(error, 'Could not save this cohort.') });
    }
  }

  async function transitionCohort(status) {
    if (!selectedCohort) return;
    let reason = '';
    if (status === 'CANCELLED') {
      reason = window.prompt('Reason for cancelling this cohort:') || '';
      if (!reason.trim()) return;
    }
    setPageState({ loading: true, error: '' });
    setNotice('');
    try {
      await cohortService.updateCohortStatus(selectedCohort.id, { status, reason });
      setNotice(`Cohort ${status.toLowerCase()}.`);
      await loadCohorts();
    } catch (error) {
      setPageState({ loading: false, error: adminErrorMessage(error, 'Could not change cohort status.') });
    }
  }

  async function assignMember(event) {
    event.preventDefault();
    if (!selectedCohort || !candidateId) return;
    setMemberProcessing('assign');
    setPageState({ loading: false, error: '' });
    setNotice('');
    try {
      await cohortService.assignCohortMember(selectedCohort.id, {
        userId: candidateId,
        participantRole: role,
      });
      setNotice(`${role === 'MENTEE' ? 'Mentee' : 'Mentor'} assigned to the cohort.`);
      await loadSelected(selectedCohort.id);
    } catch (error) {
      setPageState({ loading: false, error: adminErrorMessage(error, 'Could not assign this user.') });
    } finally {
      setMemberProcessing('');
    }
  }

  async function changeMemberStatus(member, status) {
    if (!selectedCohort) return;
    let reason = '';
    if (status === 'REMOVED' || status === 'PAUSED') {
      reason = window.prompt(`Reason for ${status.toLowerCase()} this member:`) || '';
      if (!reason.trim()) return;
    }
    setMemberProcessing(member.id);
    setPageState({ loading: false, error: '' });
    try {
      await cohortService.updateCohortMemberStatus(selectedCohort.id, member.id, { status, reason });
      setNotice(`Membership updated to ${status.toLowerCase()}.`);
      await loadSelected(selectedCohort.id);
    } catch (error) {
      setPageState({ loading: false, error: adminErrorMessage(error, 'Could not update this membership.') });
    } finally {
      setMemberProcessing('');
    }
  }

  return (
    <section className="admin-workspace">
      <AdminPageHeader
        title="Cohorts"
        description="Create programme cohorts, manage their dates and roster, and control cohort lifecycle."
        actions={<button className="button button-secondary" type="button" onClick={() => loadCohorts()} disabled={pageState.loading}>Refresh</button>}
      />
      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice
        onRetry={pageState.error ? () => loadCohorts() : candidateState.error ? () => loadCandidates(role) : undefined}
      >
        {pageState.error || formState.error || candidateState.error}
      </AdminNotice>
      {!settingsEnabled && (
        <AdminNotice kind="success">
          Cohort management is disabled. Cohorts and rosters can be prepared, but activation requires enabling it in Academy Settings.
        </AdminNotice>
      )}
      {pageState.loading ? <AdminCard><AdminLoading>Loading cohorts…</AdminLoading></AdminCard> : (
        <>
          <AdminCard>
            <div className="admin-card-heading">
              <div><h2>Programme cohorts</h2><p>Select a cohort to manage its details and roster.</p></div>
              <button
                className="button button-primary"
                type="button"
                onClick={() => {
                  setSelectedId('');
                  setCohortPage(1);
                  setForm(EMPTY_FORM);
                  setEditing(false);
                }}
              >
                Create cohort
              </button>
            </div>
            {cohorts.length ? (
              <div className="admin-toolbar">
                <AdminFilter label="Cohort">
                  <select value={selectedId} onChange={(event) => { setMemberPage(1); setSelectedId(event.target.value); }}>
                    {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.status}</option>)}
                  </select>
                </AdminFilter>
                {selectedCohort && <AdminStatusBadge status={selectedCohort.status} />}
              </div>
            ) : <AdminEmpty title="No cohorts yet">Create a cohort to begin preparing a roster.</AdminEmpty>}
            <AdminPagination
              pagination={cohortPagination}
              onPageChange={setCohortPage}
            />
          </AdminCard>

          <AdminCard>
            <div className="admin-card-heading">
              <div><h2>{selectedCohort ? (editing ? 'Edit cohort' : 'Cohort details') : 'Create cohort'}</h2>
                {selectedCohort && <p>{memberCounts.mentees} mentees · {memberCounts.mentors} mentors</p>}
              </div>
              {selectedCohort && editable && !editing && (
                <button className="button button-secondary" type="button" onClick={() => setEditing(true)}>Edit details</button>
              )}
              {selectedCohort && editing && (
                <button className="admin-text-button" type="button" onClick={() => { setEditing(false); loadSelected(selectedId); }}>Cancel edit</button>
              )}
            </div>
            {(!selectedCohort || editing) ? (
              <form className="resource-admin-form" onSubmit={submitCohort}>
                <div className="resource-admin-form-grid">
                  <AdminFilter label="Cohort name">
                    <input required maxLength={160} value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
                  </AdminFilter>
                  <AdminFilter label="Cohort code">
                    <input required maxLength={80} pattern="[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*" value={form.code} onChange={(event) => updateForm('code', event.target.value)} />
                  </AdminFilter>
                  <AdminFilter label="Start date">
                    <input type="datetime-local" required value={form.startsAt} onChange={(event) => updateForm('startsAt', event.target.value)} />
                  </AdminFilter>
                  <AdminFilter label="End date">
                    <input type="datetime-local" required value={form.endsAt} onChange={(event) => updateForm('endsAt', event.target.value)} />
                  </AdminFilter>
                  <AdminFilter label="Description">
                    <textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => updateForm('description', event.target.value)} />
                  </AdminFilter>
                </div>
                <div className="admin-action-row">
                  <button className="button button-primary" type="submit" disabled={formState.loading}>
                    {formState.loading ? 'Saving…' : selectedCohort ? 'Save changes' : 'Create cohort'}
                  </button>
                </div>
              </form>
            ) : selectedCohort && (
              <>
                <dl className="admin-detail-grid">
                  <div><dt>Code</dt><dd>{selectedCohort.code}</dd></div>
                  <div><dt>Start</dt><dd>{formatAdminDate(selectedCohort.startsAt, true)}</dd></div>
                  <div><dt>End</dt><dd>{formatAdminDate(selectedCohort.endsAt, true)}</dd></div>
                  <div><dt>Description</dt><dd>{selectedCohort.description || '—'}</dd></div>
                </dl>
                <div className="admin-action-row">
                  {selectedCohort.status === 'DRAFT' && (
                    <button className="button button-secondary" type="button" onClick={() => transitionCohort('ENROLLING')}>Open enrollment</button>
                  )}
                  {selectedCohort.status === 'ENROLLING' && (
                    <button className="button button-primary" type="button" onClick={() => transitionCohort('ACTIVE')}>Activate cohort</button>
                  )}
                  {selectedCohort.status === 'ACTIVE' && (
                    <button className="button button-primary" type="button" onClick={() => transitionCohort('COMPLETED')}>Complete cohort</button>
                  )}
                  {['DRAFT', 'ENROLLING', 'ACTIVE'].includes(selectedCohort.status) && (
                    <button className="button button-secondary admin-button-danger" type="button" onClick={() => transitionCohort('CANCELLED')}>Cancel cohort</button>
                  )}
                </div>
              </>
            )}
          </AdminCard>

          {selectedCohort && (
            <AdminCard>
              <div className="admin-card-heading">
                <div><h2>Roster</h2><p>Mentors can be assigned to multiple cohorts. Each mentee can have only one active cohort membership.</p></div>
              </div>
              {!['COMPLETED', 'CANCELLED'].includes(selectedCohort.status) && (
                <form className="admin-toolbar" onSubmit={assignMember}>
                  <AdminFilter label="Participant role">
                    <select value={role} onChange={(event) => setRole(event.target.value)}>
                      <option value="MENTEE">Mentee</option>
                      <option value="MENTOR">Mentor</option>
                    </select>
                  </AdminFilter>
                  <AdminFilter label={role === 'MENTEE' ? 'Active mentee' : 'Approved mentor'}>
                    <select required value={candidateId} disabled={candidateState.loading || !candidateOptions.length} onChange={(event) => setCandidateId(event.target.value)}>
                      <option value="">{candidateState.loading ? 'Loading participants…' : 'Select a participant'}</option>
                      {candidateOptions.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>{getPersonName(candidate)} · {candidate.email}</option>
                      ))}
                    </select>
                  </AdminFilter>
                  <button className="button button-primary" type="submit" disabled={!candidateId || Boolean(memberProcessing)}>
                    {memberProcessing === 'assign' ? 'Assigning…' : 'Assign'}
                  </button>
                </form>
              )}
              {members.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Participant</th><th>Role</th><th>Status</th><th>Assigned</th><th>Membership action</th></tr></thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td><strong>{getPersonName(member.user)}</strong><small>{member.user?.email}</small></td>
                          <td>{member.participantRole}</td>
                          <td><AdminStatusBadge status={member.status} /></td>
                          <td>{formatAdminDate(member.createdAt)}</td>
                          <td>
                            {statusOptions(member.status).length ? (
                              <select
                                aria-label={`Change ${getPersonName(member.user)} membership status`}
                                disabled={memberProcessing === member.id}
                                value=""
                                onChange={(event) => {
                                  const nextStatus = event.target.value;
                                  if (nextStatus) changeMemberStatus(member, nextStatus);
                                }}
                              >
                                <option value="">Change status</option>
                                {statusOptions(member.status).map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <AdminEmpty title="No cohort members">Assign mentees and approved mentors to this cohort.</AdminEmpty>}
              <AdminPagination pagination={memberPagination} onPageChange={setMemberPage} />
            </AdminCard>
          )}
        </>
      )}
    </section>
  );
}
