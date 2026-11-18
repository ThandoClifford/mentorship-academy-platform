import {
  AdminStatusBadge,
  formatAdminDate,
} from '../admin/AdminUI.jsx';

function displayName(user, fallback) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fallback;
}

function ListSection({ title, items, emptyText = 'No information provided.' }) {
  return (
    <section className="admin-detail-section">
      <h3>{title}</h3>
      {items?.length ? (
        <ul className="matching-detail-list">
          {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
        </ul>
      ) : <p className="admin-detail-copy">{emptyText}</p>}
    </section>
  );
}

function ProfileSummary({ title, user, profile, role }) {
  const profileFields = role === 'MENTEE'
    ? [
      ['Career stage', profile?.careerStage],
      ['Field of study', profile?.fieldOfStudy],
      ['Skills', profile?.skills],
      ['Industries', profile?.industries],
      ['Interests', profile?.interests],
      ['Career goals', profile?.careerGoals],
      ['Mentorship goals', profile?.mentorshipGoals],
    ]
    : [
      ['Role', [profile?.jobTitle, profile?.company].filter(Boolean).join(' · ')],
      ['Industry', profile?.industry],
      ['Experience', profile?.yearsOfExperience ? `${profile.yearsOfExperience} years` : ''],
      ['Expertise', profile?.expertise],
      ['Skills', profile?.skills],
      ['Specialisations', profile?.specialisations],
      ['Experience areas', profile?.experienceAreas],
      ['Mentorship areas', profile?.mentorshipAreas],
    ];

  return (
    <section className="matching-person-panel">
      <h3>{title}</h3>
      <strong>{displayName(user, role === 'MENTEE' ? 'Mentee' : 'Mentor')}</strong>
      <small>{user?.email || 'Email unavailable'}</small>
      {profile && (
        <dl className="matching-profile-fields">
          {profileFields.filter(([, value]) => (
            Array.isArray(value) ? value.length : Boolean(value)
          )).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{Array.isArray(value) ? value.join(', ') : value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function reviewerId(value) {
  return value?._id ? String(value._id) : value ? String(value) : '—';
}

export default function RecommendationDetails({
  recommendation,
  profiles,
  profilesLoading,
  profilesError,
}) {
  const mentee = recommendation.menteeMembership?.user;
  const mentor = recommendation.mentorMembership?.user;
  const approved = recommendation.reviewStatus === 'APPROVED';

  return (
    <div className="matching-details">
      <div className="matching-review-state">
        <AdminStatusBadge status={recommendation.reviewStatus} />
        {approved && (
          <span className="matching-approved-label">Recommendation approved</span>
        )}
      </div>

      {approved && (
        <section className="matching-fixed-pairing" aria-label="Fixed cohort pairing">
          <strong>Fixed pairing</strong>
          <span>{displayName(mentee, 'Mentee')} → {displayName(mentor, 'Mentor')}</span>
          <small>
            {recommendation.relationship?.status === 'ACTIVE'
              ? 'Cohort assignment active'
              : 'Approved and fixed for this cohort'}
          </small>
        </section>
      )}

      <div className="matching-people-grid">
        <ProfileSummary
          title="Mentee"
          user={mentee}
          profile={profiles?.mentee?.profile}
          role="MENTEE"
        />
        <ProfileSummary
          title="Recommended mentor"
          user={mentor}
          profile={profiles?.mentor}
          role="MENTOR"
        />
      </div>
      {profilesLoading && <p className="matching-profile-note">Loading profile details…</p>}
      {profilesError && <p className="matching-profile-note" role="status">{profilesError}</p>}

      <section className="admin-detail-section">
        <h3>Compatibility</h3>
        <p className="matching-detail-score">{recommendation.compatibilityScore}%</p>
        {Object.keys(recommendation.scoreBreakdown || {}).length ? (
          <dl className="matching-score-breakdown">
            {Object.entries(recommendation.scoreBreakdown).map(([label, score]) => (
              <div key={label}>
                <dt>{label.replaceAll('_', ' ')}</dt>
                <dd>{score}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="admin-detail-copy">No score breakdown provided.</p>}
      </section>

      <ListSection title="Shared interests" items={recommendation.sharedInterests} />
      <ListSection title="Development opportunities" items={recommendation.developmentOpportunities} />
      <ListSection title="Matching reasons" items={recommendation.reasons} />

      <section className="admin-detail-section">
        <h3>Review history</h3>
        <dl className="admin-detail-grid">
          <div><dt>Status</dt><dd><AdminStatusBadge status={recommendation.reviewStatus} /></dd></div>
          <div><dt>Reviewer ID</dt><dd>{reviewerId(recommendation.reviewedBy)}</dd></div>
          <div><dt>Reviewed</dt><dd>{formatAdminDate(recommendation.reviewedAt, true)}</dd></div>
          <div><dt>Matching run</dt><dd>{recommendation.matchingRun || '—'}</dd></div>
        </dl>
        {recommendation.rejectionReason && (
          <p className="matching-rejection-reason">
            <strong>Rejection reason:</strong> {recommendation.rejectionReason}
          </p>
        )}
        {recommendation.adjustmentHistory?.length > 0 && (
          <ol className="matching-adjustment-history">
            {recommendation.adjustmentHistory.map((entry, index) => (
              <li key={`${entry.reviewedAt || 'adjustment'}-${index}`}>
                <strong>{formatAdminDate(entry.reviewedAt, true)}</strong>
                <p>{entry.reason}</p>
                <small>Reviewer ID: {reviewerId(entry.reviewedBy)}</small>
                {entry.changes && (
                  <pre>{JSON.stringify(entry.changes, null, 2)}</pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
