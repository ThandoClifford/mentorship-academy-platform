import {
  AdminEmpty,
  AdminStatusBadge,
  AdminTable,
} from '../admin/AdminUI.jsx';

function personName(user, fallback) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || fallback;
}

function keyFactors(recommendation) {
  const breakdown = Object.entries(recommendation.scoreBreakdown || {});
  const factors = breakdown.slice(0, 3).map(([name]) => name.replaceAll('_', ' '));
  if (!factors.length && recommendation.sharedInterests?.length) {
    return recommendation.sharedInterests.slice(0, 2);
  }
  return factors;
}

export default function RecommendationTable({ recommendations, onReview }) {
  if (!recommendations.length) {
    return <AdminEmpty title="No recommendations found">Try another status filter or search term.</AdminEmpty>;
  }

  return (
    <AdminTable headers={['Mentee', 'Recommended mentor', 'Compatibility', 'Key match factors', 'Status', 'Actions']}>
      {recommendations.map((recommendation) => {
        const mentee = recommendation.menteeMembership?.user;
        const mentor = recommendation.mentorMembership?.user;
        const factors = keyFactors(recommendation);

        return (
          <tr key={recommendation.id}>
            <td>
              <strong>{personName(mentee, 'Mentee')}</strong>
              <small>{mentee?.email || 'Email unavailable'}</small>
            </td>
            <td>
              <strong>{personName(mentor, 'Mentor')}</strong>
              <small>{mentor?.email || 'Email unavailable'}</small>
            </td>
            <td><span className="matching-score">{recommendation.compatibilityScore}%</span></td>
            <td>
              {factors.length
                ? factors.map((factor) => <span className="matching-factor" key={factor}>{factor}</span>)
                : '—'}
            </td>
            <td>
              <AdminStatusBadge status={recommendation.reviewStatus} />
              {recommendation.reviewStatus === 'APPROVED' && (
                <small className="matching-row-fixed-label">Fixed cohort pairing</small>
              )}
            </td>
            <td>
              <button
                className="admin-table-row-action"
                onClick={() => onReview(recommendation)}
                type="button"
              >
                Review
              </button>
            </td>
          </tr>
        );
      })}
    </AdminTable>
  );
}
