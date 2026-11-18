import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as adminService from '../../services/adminService.js';
import * as cohortService from '../../services/cohortService.js';
import * as matchRecommendationService from '../../services/matchRecommendationService.js';
import {
  AdminCard,
  AdminEmpty,
  AdminFilter,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminPagination,
  AdminStatusBadge,
  adminErrorMessage,
  formatAdminDate,
} from '../../components/admin/AdminUI.jsx';
import RecommendationReviewModal from '../../components/matching/RecommendationReviewModal.jsx';
import RecommendationTable from '../../components/matching/RecommendationTable.jsx';
import './AdminCohortMatchingPage.css';

const PAGE_SIZE = 20;
const ACTIVE_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE'];
const REVIEW_FILTERS = [
  ['ALL', 'All'],
  ['PENDING', 'Pending'],
  ['APPROVED', 'Approved'],
  ['ADJUSTED', 'Adjusted'],
  ['REJECTED', 'Rejected'],
];

async function getCurrentMembers(cohortId, role) {
  const memberPages = await Promise.all(ACTIVE_MEMBERSHIP_STATUSES.map(async (status) => {
    const firstPage = await cohortService.listCohortMembers(cohortId, {
      page: 1,
      limit: 100,
      role,
      status,
    });
    const members = [...(firstPage.members || [])];
    for (let page = 2; page <= (firstPage.pagination?.totalPages || 1); page += 1) {
      const result = await cohortService.listCohortMembers(cohortId, {
        page,
        limit: 100,
        role,
        status,
      });
      members.push(...(result.members || []));
    }
    return members;
  }));
  const uniqueMembers = new Map();
  for (const member of memberPages.flat()) {
    if (member.user?.isActive && member.user.role === role) uniqueMembers.set(member.id, member);
  }
  return [...uniqueMembers.values()];
}

async function recommendationCount(cohortId, reviewStatus) {
  const result = await matchRecommendationService.listCohortRecommendations(cohortId, {
    reviewStatus,
    page: 1,
    limit: 1,
  });
  return result.pagination?.total || 0;
}

function personName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ').toLowerCase();
}

function recommendationMatches(recommendation, query) {
  if (!query) return true;
  const mentee = recommendation.menteeMembership?.user;
  const mentor = recommendation.mentorMembership?.user;
  return [
    personName(mentee),
    mentee?.email,
    personName(mentor),
    mentor?.email,
  ].some((value) => String(value || '').toLowerCase().includes(query));
}

function matchingStatus(total, pending, adjusted) {
  if (!total) return 'Not generated';
  if (pending || adjusted) return 'Review needed';
  return 'Review complete';
}

export default function AdminCohortMatchingPage() {
  const { cohortId } = useParams();
  const detailRequestId = useRef(0);
  const [cohort, setCohort] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [mentees, setMentees] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    adjusted: 0,
    total: 0,
    latestRun: '',
  });
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pageState, setPageState] = useState({ loading: true, error: '' });
  const [generationState, setGenerationState] = useState({ loading: false, error: '' });
  const [generationSummary, setGenerationSummary] = useState(null);
  const [notice, setNotice] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [detailsState, setDetailsState] = useState({ loading: false, error: '' });
  const [profiles, setProfiles] = useState(null);
  const [profilesState, setProfilesState] = useState({ loading: false, error: '' });
  const [reviewState, setReviewState] = useState({ saving: false, error: '' });

  useEffect(() => {
    detailRequestId.current += 1;
    setFilter('ALL');
    setPage(1);
    setSearch('');
    setGenerationSummary(null);
    setNotice('');
    setSelectedRecommendation(null);
    setProfiles(null);
  }, [cohortId]);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setPageState({ loading: true, error: '' });
      try {
        const recommendationParams = { page, limit: PAGE_SIZE };
        if (filter !== 'ALL') recommendationParams.reviewStatus = filter;
        const [
          cohortResult,
          recommendationResult,
          totalResult,
          pendingCount,
          approvedCount,
          adjustedCount,
          activeMentees,
          activeMentors,
        ] = await Promise.all([
          cohortService.getCohort(cohortId),
          matchRecommendationService.listCohortRecommendations(cohortId, recommendationParams),
          matchRecommendationService.listCohortRecommendations(cohortId, { page: 1, limit: 1 }),
          recommendationCount(cohortId, 'PENDING'),
          recommendationCount(cohortId, 'APPROVED'),
          recommendationCount(cohortId, 'ADJUSTED'),
          getCurrentMembers(cohortId, 'MENTEE'),
          getCurrentMembers(cohortId, 'MENTOR'),
        ]);
        if (!active) return;
        setCohort(cohortResult.cohort);
        setRecommendations(recommendationResult.recommendations || []);
        setPagination(recommendationResult.pagination || null);
        setMentees(activeMentees);
        setMentors(activeMentors);
        setSummary({
          pending: pendingCount,
          approved: approvedCount,
          adjusted: adjustedCount,
          total: totalResult.pagination?.total || 0,
          latestRun: totalResult.recommendations?.[0]?.matchingRun || '',
        });
        setPageState({ loading: false, error: '' });
      } catch (error) {
        if (active) {
          setPageState({
            loading: false,
            error: adminErrorMessage(error, 'Could not load cohort matching data.'),
          });
        }
      }
    }

    loadPage();
    return () => { active = false; };
  }, [cohortId, filter, page, reloadKey]);

  const filteredRecommendations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recommendations.filter((recommendation) => recommendationMatches(recommendation, query));
  }, [recommendations, search]);

  function refreshPage() {
    setReloadKey((current) => current + 1);
  }

  async function generateMatchingRun() {
    if (generationState.loading) return;
    setGenerationState({ loading: true, error: '' });
    setNotice('');
    setGenerationSummary(null);
    try {
      const result = await matchRecommendationService.generateCohortRecommendations(cohortId);
      setGenerationSummary(result.generation);
      setNotice('Matching run completed. Recommendations have been refreshed.');
      setGenerationState({ loading: false, error: '' });
      setFilter('PENDING');
      setPage(1);
      setSearch('');
      refreshPage();
    } catch (error) {
      setGenerationState({
        loading: false,
        error: adminErrorMessage(error, 'Could not generate cohort recommendations.'),
      });
    }
  }

  async function loadProfiles(recommendation, requestId) {
    const mentee = recommendation.menteeMembership?.user;
    const mentor = recommendation.mentorMembership?.user;
    const menteeRequest = mentee?.id
      ? adminService.getAdminMentee(mentee.id).then((result) => result.mentee)
      : Promise.resolve(null);
    const mentorRequest = mentor?.id && mentor?.email
      ? adminService.listAdminMentors({
        search: mentor.email,
        active: 'true',
        page: 1,
        limit: 100,
      }).then(async (result) => {
        const mentorProfile = (result.items || []).find(
          (item) => String(item.user?.id) === String(mentor.id),
        );
        if (!mentorProfile) return null;
        const detail = await adminService.getAdminMentor(mentorProfile.id);
        return detail.mentor;
      })
      : Promise.resolve(null);

    const [menteeResult, mentorResult] = await Promise.allSettled([menteeRequest, mentorRequest]);
    if (detailRequestId.current !== requestId) return;
    const profileErrors = [menteeResult, mentorResult]
      .filter((result) => result.status === 'rejected')
      .map((result) => adminErrorMessage(result.reason, 'Some participant profile details are unavailable.'));
    setProfiles({
      mentee: menteeResult.status === 'fulfilled' ? menteeResult.value : null,
      mentor: mentorResult.status === 'fulfilled' ? mentorResult.value : null,
    });
    setProfilesState({
      loading: false,
      error: profileErrors[0] || '',
    });
  }

  async function openReview(recommendation) {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;
    setSelectedRecommendation(recommendation);
    setProfiles(null);
    setDetailsState({ loading: true, error: '' });
    setProfilesState({ loading: true, error: '' });
    setReviewState({ saving: false, error: '' });
    try {
      const result = await matchRecommendationService.getCohortRecommendation(
        cohortId,
        recommendation.id,
      );
      if (detailRequestId.current !== requestId) return;
      setSelectedRecommendation(result.recommendation);
      setDetailsState({ loading: false, error: '' });
      loadProfiles(result.recommendation, requestId);
    } catch (error) {
      if (detailRequestId.current !== requestId) return;
      setDetailsState({
        loading: false,
        error: adminErrorMessage(error, 'Could not load recommendation details. Refresh and try again.'),
      });
      setProfilesState({ loading: false, error: '' });
    }
  }

  function closeReview() {
    detailRequestId.current += 1;
    setSelectedRecommendation(null);
    setProfiles(null);
    setDetailsState({ loading: false, error: '' });
    setProfilesState({ loading: false, error: '' });
    setReviewState({ saving: false, error: '' });
  }

  async function performReview(action, payload) {
    if (!selectedRecommendation || reviewState.saving) return;
    const recommendationId = selectedRecommendation.id;
    setReviewState({ saving: true, error: '' });
    try {
      let result;
      if (action === 'approve') {
        result = await matchRecommendationService.approveCohortRecommendation(
          cohortId,
          recommendationId,
        );
      } else if (action === 'reject') {
        result = await matchRecommendationService.rejectCohortRecommendation(
          cohortId,
          recommendationId,
          payload,
        );
      } else {
        result = await matchRecommendationService.adjustCohortRecommendation(
          cohortId,
          recommendationId,
          payload,
        );
      }

      const reviewed = result.recommendation;
      if (action === 'approve') {
        setNotice(reviewed?.relationship?.status === 'ACTIVE'
          ? 'Recommendation approved. Fixed cohort pairing established.'
          : 'Recommendation approved by the backend.');
      } else if (action === 'reject') {
        setNotice('Recommendation rejected.');
      } else {
        setNotice('Adjustment saved. Re-approval is required to establish or change the cohort pairing.');
      }
      if (action === 'approve' && reviewed?.relationship?.status === 'ACTIVE') {
        const menteeName = [
          selectedRecommendation.menteeMembership?.user?.firstName,
          selectedRecommendation.menteeMembership?.user?.lastName,
        ].filter(Boolean).join(' ') || 'Mentee';
        const mentorName = [
          selectedRecommendation.mentorMembership?.user?.firstName,
          selectedRecommendation.mentorMembership?.user?.lastName,
        ].filter(Boolean).join(' ') || 'Mentor';
        setNotice(`Recommendation approved. Fixed pairing established: ${menteeName} → ${mentorName}.`);
      }
      closeReview();
      setFilter(action === 'approve' ? 'APPROVED' : action === 'adjust' ? 'ADJUSTED' : 'REJECTED');
      setPage(1);
      setSearch('');
      refreshPage();
    } catch (error) {
      const requestId = detailRequestId.current;
      try {
        const latest = await matchRecommendationService.getCohortRecommendation(
          cohortId,
          recommendationId,
        );
        if (
          detailRequestId.current === requestId &&
          selectedRecommendation?.id === recommendationId
        ) {
          setSelectedRecommendation(latest.recommendation);
          setDetailsState({ loading: false, error: '' });
        }
      } catch {
        // Keep the original action error visible if the recommendation can no longer be loaded.
      }
      setReviewState({
        saving: false,
        error: adminErrorMessage(error, `Could not ${action} this recommendation. Refresh and try again.`),
      });
      refreshPage();
    }
  }

  const canGenerate = cohort && ['ENROLLING', 'ACTIVE'].includes(cohort.status);
  const currentMatchingStatus = matchingStatus(summary.total, summary.pending, summary.adjusted);

  return (
    <section className="admin-workspace admin-cohort-matching">
      <AdminPageHeader
        title={cohort?.name || 'Cohort Matching Review'}
        description={cohort?.description || 'Generate and review cohort-wide mentor recommendations.'}
        actions={(
          <>
            <Link className="button button-secondary" to="/admin/cohorts">Back to cohorts</Link>
            <button className="button button-secondary" disabled={pageState.loading} onClick={refreshPage} type="button">Refresh</button>
          </>
        )}
      />

      <AdminNotice kind="success">{notice}</AdminNotice>
      <AdminNotice onRetry={refreshPage}>{pageState.error}</AdminNotice>
      <AdminNotice>{generationState.error}</AdminNotice>
      <AdminNotice kind="success">
        {generationSummary && (
          <div className="matching-generation-summary">
            <strong>Matching run completed</strong>
            <span>Run: {generationSummary.matchingRun}</span>
            <span>{generationSummary.eligibleMentees} eligible mentees · {generationSummary.eligibleMentors} eligible mentors</span>
            <span>{generationSummary.recommendationsCreated} recommendations created · {generationSummary.skippedMentees} mentees skipped</span>
            <span>Generated {formatAdminDate(generationSummary.generationTimestamp, true)}</span>
          </div>
        )}
      </AdminNotice>

      {pageState.loading ? (
        <AdminCard><AdminLoading>Loading cohort matching data…</AdminLoading></AdminCard>
      ) : !pageState.error && cohort && (
        <>
          <AdminCard className="matching-cohort-banner">
            <div>
              <span className="admin-eyebrow">Cohort matching status</span>
              <div className="matching-status-line">
                <AdminStatusBadge status={cohort.status} />
                <span>{currentMatchingStatus}</span>
              </div>
              {summary.latestRun && <small>Latest run: {summary.latestRun}</small>}
            </div>
            <button
              className="button button-primary matching-generate-button"
              disabled={!canGenerate || generationState.loading}
              onClick={generateMatchingRun}
              type="button"
            >
              {generationState.loading ? 'Generating…' : 'Generate Matching Run'}
            </button>
            {!canGenerate && (
              <p className="matching-generation-hint">
                Matching can be generated only while the cohort is enrolling or active.
              </p>
            )}
          </AdminCard>

          <div className="matching-summary-grid">
            <article className="admin-stat-card"><span>Enrolled/active mentees</span><strong>{mentees.length}</strong></article>
            <article className="admin-stat-card admin-stat-card--gold"><span>Enrolled/active mentors</span><strong>{mentors.length}</strong></article>
            <article className="admin-stat-card"><span>Pending recommendations</span><strong>{summary.pending}</strong></article>
            <article className="admin-stat-card admin-stat-card--gold"><span>Approved pairings</span><strong>{summary.approved}</strong></article>
          </div>

          <AdminCard>
            <div className="admin-card-heading">
              <div>
                <h2>Cohort recommendations</h2>
                <p>{pagination?.total || 0} result{pagination?.total === 1 ? '' : 's'} for this filter.</p>
              </div>
            </div>
            <div className="admin-toolbar matching-toolbar">
              <div className="matching-filter-group" role="group" aria-label="Filter recommendation status">
                {REVIEW_FILTERS.map(([value, label]) => (
                  <button
                    aria-pressed={filter === value}
                    className={`matching-filter-button${filter === value ? ' is-active' : ''}`}
                    key={value}
                    onClick={() => { setPage(1); setFilter(value); }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <AdminFilter label="Search visible results">
                <input
                  aria-label="Search mentee or mentor"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mentee or mentor name/email"
                  type="search"
                  value={search}
                />
              </AdminFilter>
            </div>

            {recommendations.length ? (
              <>
                <RecommendationTable recommendations={filteredRecommendations} onReview={openReview} />
                <AdminPagination pagination={pagination} onPageChange={setPage} />
              </>
            ) : (
              <AdminEmpty title={filter === 'ALL' ? 'No recommendations yet' : `No ${filter.toLowerCase()} recommendations`}>
                {filter === 'ALL'
                  ? 'Generate a matching run to create recommendations for this cohort.'
                  : 'There are no recommendations with this review status.'}
              </AdminEmpty>
            )}
          </AdminCard>
        </>
      )}

      <RecommendationReviewModal
        actionError={reviewState.error}
        detailsError={detailsState.error}
        detailsLoading={detailsState.loading}
        mentees={mentees}
        mentors={mentors}
        onAdjust={(payload) => performReview('adjust', payload)}
        onApprove={() => performReview('approve')}
        onClose={closeReview}
        onReject={(reason) => performReview('reject', reason)}
        open={Boolean(selectedRecommendation)}
        profiles={profiles}
        profilesError={profilesState.error}
        profilesLoading={profilesState.loading}
        recommendation={selectedRecommendation}
        saving={reviewState.saving}
      />
    </section>
  );
}
