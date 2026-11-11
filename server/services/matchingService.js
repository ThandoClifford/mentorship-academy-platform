import MenteeProfile from '../models/MenteeProfile.js';
import MentorProfile from '../models/MentorProfile.js';
import User from '../models/User.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import ApiError from '../utils/ApiError.js';

const CAREER_STAGE_VALUES = {
  STUDENT: 0,
  EARLY_CAREER: 25,
  MID_CAREER: 50,
  SENIOR: 75,
  CAREER_CHANGE: 40,
};

const WEIGHTS = {
  expertise: 0.30,
  goals: 0.25,
  industry: 0.15,
  experience: 0.15,
  interests: 0.10,
  availability: 0.05,
};

function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((v) => String(v).trim().toLowerCase()).filter((v) => v.length > 0))];
}

function jaccardSimilarity(arr1, arr2) {
  const set1 = new Set(normalizeArray(arr1));
  const set2 = new Set(normalizeArray(arr2));

  if (set1.size === 0 && set2.size === 0) return 50;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 50;

  return Math.round((intersection.size / union.size) * 100);
}

function hasUsableData(arr) {
  return Array.isArray(arr) && normalizeArray(arr).length > 0;
}

function calculateExpertiseScore(menteeProfile, mentorProfile) {
  const menteeTokens = normalizeArray([
    ...(menteeProfile.skills || []),
    ...(menteeProfile.preferredMentorExpertise || []),
    ...(menteeProfile.experienceAreas || []),
    menteeProfile.fieldOfStudy,
  ]);

  const mentorTokens = normalizeArray([
    ...(mentorProfile.expertise || []),
    ...(mentorProfile.skills || []),
    ...(mentorProfile.specialisations || []),
  ]);

  if (menteeTokens.length === 0 && mentorTokens.length === 0) return 50;
  if (menteeTokens.length === 0 || mentorTokens.length === 0) return 50;

  return jaccardSimilarity(menteeTokens, mentorTokens);
}

function calculateGoalsScore(menteeProfile, mentorProfile) {
  const menteeGoals = normalizeArray([
    ...(menteeProfile.careerGoals || []),
    ...(menteeProfile.mentorshipGoals || []),
  ]);

  const mentorAreas = normalizeArray([
    ...(mentorProfile.mentorshipAreas || []),
    ...(mentorProfile.experienceAreas || []),
  ]);

  if (menteeGoals.length === 0 && mentorAreas.length === 0) return 50;
  if (menteeGoals.length === 0 || mentorAreas.length === 0) return 50;

  return jaccardSimilarity(menteeGoals, mentorAreas);
}

function calculateIndustryScore(menteeProfile, mentorProfile) {
  const menteeIndustries = normalizeArray([
    ...(menteeProfile.preferredIndustry || []),
    ...(menteeProfile.industries || []),
    menteeProfile.fieldOfStudy,
  ]);

  const mentorIndustries = normalizeArray([
    mentorProfile.industry,
    mentorProfile.company,
    mentorProfile.jobTitle,
  ]);

  if (menteeIndustries.length === 0 && mentorIndustries.length === 0) return 50;
  if (menteeIndustries.length === 0 || mentorIndustries.length === 0) return 50;

  const intersection = new Set([...new Set(menteeIndustries)].filter((x) => new Set(mentorIndustries).has(x)));

  if (intersection.size > 0) return 100;

  const menteeText = menteeIndustries.join(' ');
  const mentorText = mentorIndustries.join(' ');

  const hasPartial = menteeIndustries.some((m) =>
    mentorIndustries.some((n) => m.includes(n) || n.includes(m))
  );

  return hasPartial ? 50 : 0;
}

function calculateExperienceScore(menteeProfile, mentorProfile) {
  const menteeStage = CAREER_STAGE_VALUES[menteeProfile.careerStage] ?? 0;
  const mentorYears = typeof mentorProfile.yearsOfExperience === 'number'
    ? Math.min(mentorProfile.yearsOfExperience, 80)
    : 0;
  const mentorScore = Math.round((mentorYears / 80) * 100);

  const diff = Math.abs(menteeStage - mentorScore);
  return Math.max(0, Math.min(100, 100 - diff));
}

function calculateInterestsScore(menteeProfile, mentorProfile) {
  const menteeInterests = normalizeArray(menteeProfile.interests || []);

  const mentorInterests = normalizeArray([
    ...(mentorProfile.skills || []),
    ...(mentorProfile.specialisations || []),
    ...(mentorProfile.mentorshipAreas || []),
  ]);

  if (menteeInterests.length === 0 && mentorInterests.length === 0) return 50;
  if (menteeInterests.length === 0 || mentorInterests.length === 0) return 50;

  return jaccardSimilarity(menteeInterests, mentorInterests);
}

function calculateAvailabilityScore(menteeProfile, mentorProfile) {
  const menteeAvail = menteeProfile.availability || {};
  const mentorAvail = mentorProfile.availability || {};

  const menteeDays = new Set(normalizeArray(menteeAvail.days || []));
  const mentorDays = new Set(normalizeArray(mentorAvail.days || []));

  let dayScore = 50;
  if (menteeDays.size > 0 && mentorDays.size > 0) {
    const overlap = [...menteeDays].filter((d) => mentorDays.has(d)).length;
    dayScore = Math.round((overlap / Math.max(menteeDays.size, mentorDays.size)) * 100);
  } else if (menteeDays.size === 0 && mentorDays.size === 0) {
    dayScore = 50;
  } else {
    dayScore = 50;
  }

  let tzScore = 50;
  const menteeTz = menteeAvail.timeZone?.trim();
  const mentorTz = mentorAvail.timeZone?.trim();
  if (menteeTz && mentorTz) {
    tzScore = menteeTz === mentorTz ? 100 : 0;
  } else if (!menteeTz && !mentorTz) {
    tzScore = 50;
  } else {
    tzScore = 50;
  }

  return Math.round(dayScore * 0.7 + tzScore * 0.3);
}

function generateExplanations(menteeProfile, mentorProfile, scores) {
  const explanations = [];

  const menteeExpertise = normalizeArray([
    ...(menteeProfile.skills || []),
    ...(menteeProfile.preferredMentorExpertise || []),
    ...(menteeProfile.experienceAreas || []),
  ]);
  const mentorExpertise = new Set(normalizeArray([
    ...(mentorProfile.expertise || []),
    ...(mentorProfile.skills || []),
    ...(mentorProfile.specialisations || []),
  ]));
  const expertiseOverlap = new Set([...menteeExpertise].filter((x) => mentorExpertise.has(x)));
  if (expertiseOverlap.size > 0) {
    explanations.push(`Strong match on ${Array.from(expertiseOverlap).slice(0, 3).join(', ')} expertise.`);
  }

  const menteeIndustries = normalizeArray([
    ...(menteeProfile.preferredIndustry || []),
    ...(menteeProfile.industries || []),
    menteeProfile.fieldOfStudy,
  ]);
  const mentorIndustries = new Set(normalizeArray([
    mentorProfile.industry,
    mentorProfile.company,
    mentorProfile.jobTitle,
  ]));
  const industryOverlap = new Set([...menteeIndustries].filter((x) => mentorIndustries.has(x)));
  if (industryOverlap.size > 0) {
    explanations.push(`Shared industry: ${Array.from(industryOverlap).slice(0, 2).join(', ')}.`);
  } else {
    const partial = menteeIndustries.some((m) =>
      mentorIndustries.some((n) => m.includes(n) || n.includes(m))
    );
    if (partial) {
      explanations.push('Related industry background.');
    }
  }

  const menteeStage = CAREER_STAGE_VALUES[menteeProfile.careerStage] ?? 0;
  const mentorYears = typeof mentorProfile.yearsOfExperience === 'number'
    ? Math.min(mentorProfile.yearsOfExperience, 80)
    : 0;
  if (mentorYears > 0) {
    explanations.push(`Mentor has ${mentorYears} years of experience and may be suitable for a ${Object.keys(CAREER_STAGE_VALUES).find(k => CAREER_STAGE_VALUES[k] === menteeStage) || 'mentee'} mentee.`);
  }

  const menteeGoals = normalizeArray([
    ...(menteeProfile.careerGoals || []),
    ...(menteeProfile.mentorshipGoals || []),
  ]);
  const mentorAreas = new Set(normalizeArray([
    ...(mentorProfile.mentorshipAreas || []),
    ...(mentorProfile.experienceAreas || []),
  ]));
  const goalsOverlap = new Set([...menteeGoals].filter((x) => mentorAreas.has(x)));
  if (goalsOverlap.size > 0) {
    explanations.push(`Strong alignment between the mentee's goals and the mentor's mentorship areas.`);
  }

  const menteeAvail = menteeProfile.availability || {};
  const mentorAvail = mentorProfile.availability || {};
  const menteeDays = new Set(normalizeArray(menteeAvail?.days || []));
  const mentorDays = new Set(normalizeArray(mentorAvail?.days || []));
  if (menteeDays.size > 0 && mentorDays.size > 0) {
    const overlap = [...menteeDays].filter((d) => mentorDays.has(d)).length;
    if (overlap > 0) {
      explanations.push(`${overlap} preferred availability day${overlap > 1 ? 's' : ''} overlap.`);
    }
  }

  const menteeStyles = normalizeArray(menteeProfile.preferredMentorshipStyle || []);
  const mentorStyle = new Set(normalizeArray(mentorProfile.mentorshipStyle || []));
  const styleOverlap = new Set([...menteeStyles].filter((x) => mentorStyle.has(x)));
  if (styleOverlap.size > 0) {
    explanations.push(`Both profiles prefer ${Array.from(styleOverlap).join(', ')} mentorship.`);
  }

  if (explanations.length === 0) {
    explanations.push('General compatibility based on available profile information.');
  }

  return explanations;
}

export async function getMatchesForMentee(menteeId) {
  if (!menteeId) {
    throw new ApiError(400, 'Mentee ID is required.');
  }

  const menteeProfile = await MenteeProfile.findOne({ user: menteeId }).lean();
  if (!menteeProfile) {
    throw new ApiError(404, 'Mentee profile not found. Please complete your profile before matching.');
  }

  const mentorProfiles = await MentorProfile.find({ status: 'APPROVED' }).lean();
  if (!mentorProfiles.length) {
    return { matches: [], totalCandidates: 0 };
  }

  const mentorUserIds = mentorProfiles.map((p) => p.user);
  const users = await User.find({ _id: { $in: mentorUserIds }, isActive: true })
    .select('firstName lastName email role')
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const existingRelationships = await MentorshipRelationship.find({
    mentee: menteeId,
    status: { $in: ['PENDING', 'ACCEPTED', 'ACTIVE'] },
  }).select('mentor status').lean();

  const existingMentorIds = new Set(existingRelationships.map((r) => String(r.mentor)));
  const pendingMentorIds = new Set(
    existingRelationships.filter((r) => r.status === 'PENDING').map((r) => String(r.mentor))
  );

  const matches = mentorProfiles
    .map((mentorProfile) => {
      const user = userMap.get(String(mentorProfile.user));
      if (!user) return null;

      const expertiseScore = calculateExpertiseScore(menteeProfile, mentorProfile);
      const goalsScore = calculateGoalsScore(menteeProfile, mentorProfile);
      const industryScore = calculateIndustryScore(menteeProfile, mentorProfile);
      const experienceScore = calculateExperienceScore(menteeProfile, mentorProfile);
      const interestsScore = calculateInterestsScore(menteeProfile, mentorProfile);
      const availabilityScore = calculateAvailabilityScore(menteeProfile, mentorProfile);

      const scoreBreakdown = {
        expertise: expertiseScore,
        goals: goalsScore,
        industry: industryScore,
        experience: experienceScore,
        interests: interestsScore,
        availability: availabilityScore,
      };

      const compatibilityScore = Math.round(
        expertiseScore * WEIGHTS.expertise +
        goalsScore * WEIGHTS.goals +
        industryScore * WEIGHTS.industry +
        experienceScore * WEIGHTS.experience +
        interestsScore * WEIGHTS.interests +
        availabilityScore * WEIGHTS.availability
      );

      const explanations = generateExplanations(menteeProfile, mentorProfile, scoreBreakdown);

      const mentorId = String(mentorProfile.user);

      return {
        mentorId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePhoto: mentorProfile.profilePhoto,
        bio: mentorProfile.bio,
        jobTitle: mentorProfile.jobTitle,
        company: mentorProfile.company,
        industry: mentorProfile.industry,
        yearsOfExperience: mentorProfile.yearsOfExperience,
        expertise: mentorProfile.expertise,
        skills: mentorProfile.skills,
        specialisations: mentorProfile.specialisations,
        experienceAreas: mentorProfile.experienceAreas,
        mentorshipAreas: mentorProfile.mentorshipAreas,
        mentorshipStyle: mentorProfile.mentorshipStyle,
        languages: mentorProfile.languages,
        compatibilityScore,
        scoreBreakdown,
        explanations,
        hasExistingRelationship: existingMentorIds.has(mentorId),
        hasPendingRequest: pendingMentorIds.has(mentorId),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return {
    matches,
    totalCandidates: matches.length,
    filtersApplied: {
      status: 'APPROVED',
      isActive: true,
    },
  };
}