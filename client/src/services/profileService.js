import api from './api.js';

async function getProfile(path) {
  const response = await api.get(path);
  return response.data.profile;
}

async function updateProfile(path, profile) {
  const response = await api.put(path, profile);
  return response.data.profile;
}

async function getCompletion(path) {
  const response = await api.get(path);
  return response.data;
}

async function getData(path) {
  const response = await api.get(path);
  return response.data;
}

export function getMenteeProfile() {
  return getProfile('/mentee/profile');
}

export function updateMenteeProfile(profile) {
  return updateProfile('/mentee/profile', profile);
}

export function getMenteeProfileCompletion() {
  return getCompletion('/mentee/profile/completion');
}

export function getMentorProfile() {
  return getProfile('/mentor/profile');
}

export function updateMentorProfile(profile) {
  return updateProfile('/mentor/profile', profile);
}

export function getMentorProfileCompletion() {
  return getCompletion('/mentor/profile/completion');
}

export function getApprovedMentors() {
  return getData('/mentors/approved');
}
