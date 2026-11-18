import * as cohortService from '../services/cohortService.js';

export async function listCohorts(request, response) {
  response.status(200).json(await cohortService.listCohorts(request.query));
}

export async function createCohort(request, response) {
  const cohort = await cohortService.createCohort(request.user._id, request.body);
  response.status(201).json({ cohort });
}

export async function getCohort(request, response) {
  response.status(200).json(await cohortService.getCohort(request.params.cohortId));
}

export async function updateCohort(request, response) {
  const cohort = await cohortService.updateCohort(
    request.user._id,
    request.params.cohortId,
    request.body,
  );
  response.status(200).json({ cohort });
}

export async function updateCohortStatus(request, response) {
  const cohort = await cohortService.updateCohortStatus(
    request.user._id,
    request.params.cohortId,
    request.body,
  );
  response.status(200).json({ cohort });
}

export async function listCohortMembers(request, response) {
  response.status(200).json(
    await cohortService.listCohortMembers(request.params.cohortId, request.query),
  );
}

export async function assignCohortMember(request, response) {
  const membership = await cohortService.assignCohortMember(
    request.user._id,
    request.params.cohortId,
    request.body,
  );
  response.status(201).json({ membership });
}

export async function updateCohortMemberStatus(request, response) {
  const membership = await cohortService.updateCohortMemberStatus(
    request.user._id,
    request.params.cohortId,
    request.params.membershipId,
    request.body,
  );
  response.status(200).json({ membership });
}

export async function getCurrentCohort(request, response) {
  response.status(200).json(
    await cohortService.getCurrentCohort(request.user._id, request.user.role),
  );
}
