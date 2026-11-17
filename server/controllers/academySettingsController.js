import { getAcademySettings, updateAcademySettings } from '../services/academySettingsService.js';

export async function getSettings(_request, response) {
  const settings = await getAcademySettings();
  response.status(200).json({ settings });
}

export async function replaceSettings(request, response) {
  const settings = await updateAcademySettings(request.body, {
    replace: true,
    actor: request.user._id,
  });
  response.status(200).json({ settings });
}

export async function patchSettings(request, response) {
  const settings = await updateAcademySettings(request.body, { actor: request.user._id });
  response.status(200).json({ settings });
}
