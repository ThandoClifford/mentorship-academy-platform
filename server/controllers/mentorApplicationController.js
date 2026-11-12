import * as mentorApplicationService from '../services/mentorApplicationService.js';

export async function submitApplication(request, response) {
  const application = await mentorApplicationService.submitApplication(
    request.user._id,
    request.body ?? {},
  );
  response.status(201).json({ application });
}

export async function getOwnApplication(request, response) {
  const application = await mentorApplicationService.getOwnApplication(
    request.user._id,
  );
  response.status(200).json({ application });
}
