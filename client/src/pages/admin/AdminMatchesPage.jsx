import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../../services/adminService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminFilter,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  adminErrorMessage,
} from '../../components/admin/AdminUI.jsx';

const menteeName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mentee';

export default function AdminMatchesPage() {
  const [mentees, setMentees] = useState([]);
  const [menteesState, setMenteesState] = useState({ loading: true, error: '' });
  const [menteeId, setMenteeId] = useState('');
  const [matchState, setMatchState] = useState({ loading: false, error: '', result: null });

  const loadMentees = useCallback(async () => {
    setMenteesState({ loading: true, error: '' });
    try {
      const result = await adminService.listAdminUsers({ role: 'MENTEE', status: 'active', page: 1, limit: 100 });
      setMentees(result.users || []);
      setMenteesState({ loading: false, error: '' });
    } catch (error) {
      setMenteesState({ loading: false, error: adminErrorMessage(error, 'Could not load mentees for matching review.') });
    }
  }, []);

  useEffect(() => { loadMentees(); }, [loadMentees]);

  const loadMatches = useCallback(async (id) => {
    if (!id) {
      setMatchState({ loading: false, error: '', result: null });
      return;
    }
    setMatchState({ loading: true, error: '', result: null });
    try {
      const result = await adminService.getAdminMenteeMatches(id);
      setMatchState({ loading: false, error: '', result });
    } catch (error) {
      setMatchState({ loading: false, error: adminErrorMessage(error, 'Could not load matching results for this mentee.'), result: null });
    }
  }, []);

  useEffect(() => { loadMatches(menteeId); }, [loadMatches, menteeId]);

  const matches = matchState.result?.matches || [];
  return (
    <section className="admin-workspace">
      <AdminPageHeader title="AI Match Review" description="Inspect the existing matching service results for an active mentee. No matches are created or changed here." actions={<button className="button button-secondary" type="button" onClick={loadMentees} disabled={menteesState.loading}>Refresh mentees</button>} />
      <AdminNotice onRetry={loadMentees}>{menteesState.error}</AdminNotice>
      <AdminNotice onRetry={() => loadMatches(menteeId)}>{matchState.error}</AdminNotice>
      <AdminCard>
        <div className="admin-toolbar">
          <AdminFilter label="Select an active mentee">
            <select disabled={menteesState.loading || !mentees.length} value={menteeId} onChange={(event) => setMenteeId(event.target.value)}>
              <option value="">{menteesState.loading ? 'Loading mentees…' : 'Choose a mentee'}</option>
              {mentees.map((mentee) => <option key={mentee.id} value={mentee.id}>{menteeName(mentee)} · {mentee.email}</option>)}
            </select>
          </AdminFilter>
        </div>
        {!menteesState.loading && !menteesState.error && !mentees.length && <AdminEmpty title="No active mentees">Matching results require an active mentee account.</AdminEmpty>}
        {menteeId && matchState.loading && <AdminLoading>Loading matching results…</AdminLoading>}
        {menteeId && !matchState.loading && !matchState.error && matchState.result && (
          <>
            <div className="admin-card-heading">
              <div><h2>Ranked mentor matches</h2><p>{matchState.result.totalCandidates ?? matches.length} candidates returned by the existing matching service.</p></div>
            </div>
            {matches.length ? (
              <div className="admin-match-list">
                {matches.map((match, index) => (
                  <article className="admin-match-card" key={match.mentorId}>
                    <div className="admin-match-heading">
                      <div className="admin-match-rank" aria-label={`Rank ${index + 1}`}>{index + 1}</div>
                      <div className="admin-match-person"><strong>{match.firstName} {match.lastName}</strong><small>{match.email}</small><small>{[match.jobTitle, match.company].filter(Boolean).join(' · ') || match.industry || 'Mentor'}</small></div>
                      <div className="admin-match-score">{match.compatibilityScore}%</div>
                    </div>
                    {match.scoreBreakdown && (
                      <div className="admin-score-breakdown">
                        {Object.entries(match.scoreBreakdown).map(([label, value]) => (
                          <span key={label}>{label}: <strong>{value}</strong></span>
                        ))}
                      </div>
                    )}
                    {Array.isArray(match.explanations) && match.explanations.length > 0 && (
                      <ul className="admin-match-explanations">{match.explanations.map((explanation, explanationIndex) => <li key={`${match.mentorId}-${explanationIndex}`}>{explanation}</li>)}</ul>
                    )}
                    {(match.hasExistingRelationship || match.hasPendingRequest) && (
                      <p className="admin-match-existing">{match.hasExistingRelationship ? 'An existing mentorship relationship is recorded.' : 'A mentorship request is pending.'}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : <AdminEmpty title="No matches returned">The matching service found no eligible mentors for this mentee.</AdminEmpty>}
          </>
        )}
      </AdminCard>
    </section>
  );
}
