import { getAcademySettings } from '../services/academySettingsService.js';

export async function getPlatformStatus(_request, response) {
  const settings = await getAcademySettings();
  response.status(200).json({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
  });
}
