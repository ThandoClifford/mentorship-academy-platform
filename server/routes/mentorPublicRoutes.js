import { Router } from 'express';
import MentorProfile from '../models/MentorProfile.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { getAcademySettings } from '../services/academySettingsService.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/approved', asyncHandler(async (request, response) => {
  const settings = await getAcademySettings();
  if (!settings.publicMentorProfilesEnabled) {
    throw new ApiError(403, 'Public mentor profiles are currently disabled.');
  }

  const mentorProfiles = await MentorProfile.find({ status: 'APPROVED' })
    .select('-availability')
    .lean();

  const mentorIds = mentorProfiles.map((p) => p.user);
  const users = await User.find({ _id: { $in: mentorIds }, isActive: true })
    .select('firstName lastName email role')
    .lean();

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const mentors = mentorProfiles
    .map((profile) => {
      const user = userMap.get(String(profile.user));
      if (!user) return null;
      return {
        id: String(profile.user),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePhoto: profile.profilePhoto,
        bio: profile.bio,
        jobTitle: profile.jobTitle,
        company: profile.company,
        industry: profile.industry,
        yearsOfExperience: profile.yearsOfExperience,
        expertise: profile.expertise,
        skills: profile.skills,
        specialisations: profile.specialisations,
        experienceAreas: profile.experienceAreas,
        mentorshipAreas: profile.mentorshipAreas,
        mentorshipStyle: profile.mentorshipStyle,
        languages: profile.languages,
      };
    })
    .filter(Boolean);

  response.status(200).json({ mentors });
}));

export default router;