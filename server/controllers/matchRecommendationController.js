import * as matchRecommendationService from '../services/matchRecommendationService.js';

export async function listRecommendationsForCohort(request, response) {
  response.status(200).json(
    await matchRecommendationService.listRecommendationsForCohort(
      request.params.cohortId,
      request.query,
    ),
  );
}

export async function getRecommendation(request, response) {
  response.status(200).json({
    recommendation: await matchRecommendationService.getRecommendation(
      request.params.cohortId,
      request.params.recommendationId,
    ),
  });
}

export async function approveRecommendation(request, response) {
  response.status(200).json({
    recommendation: await matchRecommendationService.approveRecommendation(
      request.user._id,
      request.params.cohortId,
      request.params.recommendationId,
    ),
  });
}

export async function rejectRecommendation(request, response) {
  response.status(200).json({
    recommendation: await matchRecommendationService.rejectRecommendation(
      request.user._id,
      request.params.cohortId,
      request.params.recommendationId,
      request.body,
    ),
  });
}

export async function adjustRecommendation(request, response) {
  response.status(200).json({
    recommendation: await matchRecommendationService.adjustRecommendation(
      request.user._id,
      request.params.cohortId,
      request.params.recommendationId,
      request.body,
    ),
  });
}
