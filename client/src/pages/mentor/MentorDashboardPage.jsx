import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import * as goalService from '../../services/goalService.js';
import * as messageService from '../../services/messageService.js';
import * as mentorshipService from '../../services/mentorshipService.js';
import './MentorDashboardPage.css';

const EMPTY_DASHBOARD = {
  loading: true,
  relationships: [],
  requests: [],
  goals: [],
  messages: [],
  relationshipError: '',
  requestError: '',
  goalsError: '',
  messagesError: '',
};

function getSafeError(error, fallback) {
  if (error.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (error.response?.status === 403) return 'You do not have permission to view this information.';
  return fallback;
}

function getRelationshipId(relationship) {
  return relationship?.id || relationship?._id;
}

function getPersonName(person, fallback) {
  return `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || fallback;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
}

function mergeRelationships(relationships, requests) {
  return [...new Map(
    [...relationships, ...requests]
      .filter((relationship) => getRelationshipId(relationship))
      .map((relationship) => [String(getRelationshipId(relationship)), relationship]),
  ).values()];
}

function DashboardSection({ eyebrow, title, action, children, className = '' }) {
  return (
    <section className={`mentor-dashboard-card ${className}`}>
      <header className="mentor-dashboard-section-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function SectionState({ loading, error, empty, isEmpty, children, onRetry }) {
  if (loading) return <p className="mentor-dashboard-state" role="status">Loading…</p>;
  if (error) {
    return (
      <div className="mentor-dashboard-error" role="alert">
        <span>{error}</span>
        {onRetry && <button className="mentor-dashboard-text-link" type="button" onClick={onRetry}>Try again</button>}
      </div>
    );
  }
  if (isEmpty) return <p className="mentor-dashboard-empty">{empty}</p>;
  return children;
}

function StatCard({ label, value, tone }) {
  return (
    <article className={`mentor-dashboard-stat mentor-dashboard-stat--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function MentorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [processingId, setProcessingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const loadDashboard = useCallback(async () => {
    setDashboard((current) => ({ ...current, loading: true }));
    const [relationshipResult, requestResult] = await Promise.allSettled([
      mentorshipService.getMentorMentorshipRelationships(),
      mentorshipService.getMentorMentorshipRequests(),
    ]);

    const relationships = relationshipResult.status === 'fulfilled'
      ? relationshipResult.value.relationships || []
      : [];
    const requests = requestResult.status === 'fulfilled'
      ? (requestResult.value.relationships || []).filter((relationship) => relationship.status === 'PENDING')
      : [];
    const activeRelationships = relationships.filter((relationship) => relationship.status === 'ACTIVE');
    const goalResults = await Promise.allSettled(
      activeRelationships.map(async (relationship) => {
        const relationshipId = getRelationshipId(relationship);
        const result = await goalService.getMentorGoals(relationshipId);
        return (result.goals || []).map((goal) => ({
          ...goal,
          relationshipId,
          mentee: relationship.mentee,
        }));
      }),
    );
    const messageResults = await Promise.allSettled(
      activeRelationships.map(async (relationship) => {
        const relationshipId = getRelationshipId(relationship);
        const result = await messageService.getMentorMessages(relationshipId);
        return (result.messages || []).map((message) => ({
          ...message,
          relationshipId,
          mentee: relationship.mentee,
        }));
      }),
    );

    setDashboard({
      loading: false,
      relationships,
      requests,
      goals: goalResults
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value)
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0)),
      messages: messageResults
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value)
        .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
        .slice(0, 3),
      relationshipError: relationshipResult.status === 'rejected'
        ? getSafeError(relationshipResult.reason, 'Could not load your mentorship relationships.')
        : '',
      requestError: requestResult.status === 'rejected'
        ? getSafeError(requestResult.reason, 'Could not load incoming mentorship requests.')
        : '',
      goalsError: goalResults.some((result) => result.status === 'rejected')
        ? 'Some mentee goals could not be loaded.'
        : '',
      messagesError: messageResults.some((result) => result.status === 'rejected')
        ? 'Some recent messages could not be loaded.'
        : '',
    });
  }, []);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    loadDashboard();
    return undefined;
  }, [authLoading, user, loadDashboard]);

  const allRelationships = useMemo(
    () => mergeRelationships(dashboard.relationships, dashboard.requests),
    [dashboard.relationships, dashboard.requests],
  );
  const activeRelationships = dashboard.relationships.filter((relationship) => relationship.status === 'ACTIVE');
  const completedCount = allRelationships.filter((relationship) => relationship.status === 'COMPLETED').length;
  const activeGoals = dashboard.goals.filter((goal) => goal.status === 'ACTIVE');
  const completedGoals = dashboard.goals.filter((goal) => goal.status === 'COMPLETED');
  const firstName = user?.firstName || 'there';

  async function handleRequestAction(request, action) {
    const id = getRelationshipId(request);
    if (!id || processingId) return;
    if (action === 'decline' && !window.confirm('Are you sure you want to decline this request?')) return;

    setProcessingId(String(id));
    setActionError('');
    setActionNotice('');
    try {
      if (action === 'accept') {
        await mentorshipService.acceptMentorshipRequest(id);
        setActionNotice('Mentorship request accepted.');
      } else {
        await mentorshipService.declineMentorshipRequest(id);
        setActionNotice('Mentorship request declined.');
      }
      await loadDashboard();
    } catch (error) {
      setActionError(getSafeError(
        error,
        action === 'accept' ? 'Could not accept this request.' : 'Could not decline this request.',
      ));
    } finally {
      setProcessingId('');
    }
  }

  if (authLoading || (dashboard.loading && !dashboard.relationships.length && !dashboard.requests.length)) {
    return (
      <section className="mentor-dashboard" role="status">
        <p className="mentor-dashboard-state">Loading your mentor dashboard…</p>
      </section>
    );
  }

  return (
    <section className="mentor-dashboard">
      <header className="mentor-dashboard-welcome">
        <div>
          <span className="eyebrow">YOUR MENTOR WORKSPACE</span>
          <h1>{getGreeting()}, {firstName}</h1>
          <p>Support your mentees, follow their progress, and keep your conversations moving forward.</p>
        </div>
        <Link className="button button-primary" to="/mentor/mentees">View Mentees</Link>
      </header>

      <div className="mentor-dashboard-stats" aria-label="Mentorship overview">
        <StatCard label="Active mentees" value={activeRelationships.length} tone="active" />
        <StatCard label="Pending requests" value={dashboard.requests.length} tone="pending" />
        <StatCard label="Completed mentorships" value={completedCount} tone="completed" />
      </div>

      {actionError && <p className="mentor-dashboard-error mentor-dashboard-action-message" role="alert">{actionError}</p>}
      {actionNotice && <p className="mentor-dashboard-notice" role="status">{actionNotice}</p>}

      <div className="mentor-dashboard-grid">
        <DashboardSection
          className="mentor-dashboard-relationships"
          eyebrow="Your connections"
          title="Active mentees"
          action={<Link className="mentor-dashboard-text-link" to="/mentor/mentees">View all <span aria-hidden="true">→</span></Link>}
        >
          <SectionState
            loading={dashboard.loading}
            error={dashboard.relationshipError}
            empty="Your active mentorship relationships will appear here."
            isEmpty={!activeRelationships.length}
            onRetry={loadDashboard}
          >
            {activeRelationships.length ? (
              <div className="mentor-dashboard-people-list">
                {activeRelationships.map((relationship) => {
                  const relationshipId = getRelationshipId(relationship);
                  const menteeName = getPersonName(relationship.mentee, 'Your mentee');
                  const goals = dashboard.goals.filter((goal) => String(goal.relationshipId) === String(relationshipId));
                  return (
                    <article className="mentor-dashboard-person" key={relationshipId}>
                      <div className="mentor-dashboard-person-header">
                        <span className="mentor-dashboard-avatar" aria-hidden="true">
                          {relationship.mentee?.profilePhoto
                            ? <img src={relationship.mentee.profilePhoto} alt="" />
                            : `${relationship.mentee?.firstName?.[0] || ''}${relationship.mentee?.lastName?.[0] || ''}`}
                        </span>
                        <div className="mentor-dashboard-person-copy">
                          <h3>{menteeName}</h3>
                          <span className="mentor-dashboard-status mentor-dashboard-status--active">ACTIVE</span>
                        </div>
                      </div>
                      <div className="mentor-dashboard-person-progress">
                        {dashboard.goalsError ? (
                          <span>Goal progress is temporarily unavailable.</span>
                        ) : goals.length ? (
                          <span>{goals.filter((goal) => goal.status === 'ACTIVE').length} active goals · {goals.length} total</span>
                        ) : (
                          <span>No goals recorded yet.</span>
                        )}
                      </div>
                      <Link className="mentor-dashboard-text-link" to={`/mentor/mentorship/relationships/${relationshipId}`}>
                        View Relationship <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </SectionState>
        </DashboardSection>

        <DashboardSection
          className="mentor-dashboard-requests"
          eyebrow="Needs your attention"
          title="Incoming requests"
          action={<Link className="mentor-dashboard-text-link" to="/mentor/mentorship/requests">Review requests <span aria-hidden="true">→</span></Link>}
        >
          <SectionState
            loading={dashboard.loading}
            error={dashboard.requestError}
            empty="You have no pending mentorship requests."
            isEmpty={!dashboard.requests.length}
            onRetry={loadDashboard}
          >
            {dashboard.requests.length ? (
              <div className="mentor-dashboard-request-list">
                {dashboard.requests.map((request) => {
                  const id = String(getRelationshipId(request));
                  const mentee = request.mentee;
                  const isProcessing = processingId === id;
                  return (
                    <article className="mentor-dashboard-request" key={id}>
                      <div className="mentor-dashboard-person-header">
                        <span className="mentor-dashboard-avatar" aria-hidden="true">
                          {mentee?.profilePhoto
                            ? <img src={mentee.profilePhoto} alt="" />
                            : `${mentee?.firstName?.[0] || ''}${mentee?.lastName?.[0] || ''}`}
                        </span>
                        <div className="mentor-dashboard-person-copy">
                          <h3>{getPersonName(mentee, 'Mentee')}</h3>
                          <span className="mentor-dashboard-status mentor-dashboard-status--pending">{request.status}</span>
                        </div>
                      </div>
                      {request.requestMessage && <p className="mentor-dashboard-request-message">{request.requestMessage}</p>}
                      <div className="mentor-dashboard-request-actions">
                        <button
                          className="button button-primary"
                          type="button"
                          onClick={() => handleRequestAction(request, 'accept')}
                          disabled={Boolean(processingId)}
                        >
                          {isProcessing ? 'Accepting…' : 'Accept'}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => handleRequestAction(request, 'decline')}
                          disabled={Boolean(processingId)}
                        >
                          {isProcessing ? 'Please wait…' : 'Decline'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </SectionState>
        </DashboardSection>

        <DashboardSection
          className="mentor-dashboard-goals"
          eyebrow="Progress together"
          title="Goals & progress"
          action={<Link className="mentor-dashboard-text-link" to="/mentor/goals">Review goals <span aria-hidden="true">→</span></Link>}
        >
          <SectionState
            loading={dashboard.loading}
            error={dashboard.goalsError}
            empty="Goals from active mentorships will appear here."
            isEmpty={!dashboard.goals.length}
            onRetry={loadDashboard}
          >
            {dashboard.goals.length ? (
              <>
                <div className="mentor-dashboard-goal-summary">
                  <span><strong>{activeGoals.length}</strong> active</span>
                  <span><strong>{completedGoals.length}</strong> completed</span>
                </div>
                <ul className="mentor-dashboard-goal-list">
                  {dashboard.goals.slice(0, 4).map((goal) => (
                    <li key={`${goal.relationshipId}-${goal.id || goal._id}`}>
                      <Link to={`/mentor/goals/${goal.relationshipId}/${goal.id || goal._id}`}>
                        <span className="mentor-dashboard-goal-copy">
                          <strong>{goal.title}</strong>
                          <small>{getPersonName(goal.mentee, 'Mentee')} · {goal.status}</small>
                        </span>
                        <span className="mentor-dashboard-goal-progress">
                          {goal.progress !== null && goal.progress !== undefined && Number.isFinite(Number(goal.progress))
                            ? `${goal.progress}%`
                            : 'Not recorded'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </SectionState>
        </DashboardSection>

        <DashboardSection
          className="mentor-dashboard-messages"
          eyebrow="Stay connected"
          title="Recent messages"
          action={<Link className="mentor-dashboard-text-link" to="/mentor/messages">View messages <span aria-hidden="true">→</span></Link>}
        >
          <SectionState
            loading={dashboard.loading}
            error={dashboard.messagesError}
            empty="Messages from your active mentorships will appear here."
            isEmpty={!dashboard.messages.length}
            onRetry={loadDashboard}
          >
            {dashboard.messages.length ? (
              <ul className="mentor-dashboard-message-list">
                {dashboard.messages.map((message) => {
                  const senderName = getPersonName(message.sender, 'Mentee');
                  const relationshipId = message.relationshipId;
                  return (
                    <li key={message.id || message._id}>
                      <Link to={`/mentor/mentorship/relationships/${relationshipId}/messages`}>
                        <span className="mentor-dashboard-message-copy">
                          <strong>{senderName}</strong>
                          <span>{message.content}</span>
                        </span>
                        <time>{formatTime(message.createdAt)}</time>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </SectionState>
        </DashboardSection>
      </div>
    </section>
  );
}
