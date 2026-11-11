import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function getMentorMatches() {
  const response = await api.get('/mentee/match');
  return getData(response);
}