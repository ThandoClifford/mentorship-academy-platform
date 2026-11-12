import * as adminService from '../services/adminService.js';

export async function getDashboard(_request, response) {
  const stats = await adminService.getAdminDashboard();
  response.status(200).json({ stats });
}

export async function listUsers(request, response) {
  const result = await adminService.listUsers(request.query);
  response.status(200).json(result);
}

export async function getUser(request, response) {
  const user = await adminService.getUserById(request.params.id);
  response.status(200).json({ user });
}

export async function updateUserStatus(request, response) {
  const { isActive } = request.body ?? {};
  const user = await adminService.updateUserStatus(request.user._id, request.params.id, isActive);
  response.status(200).json({ user });
}

export async function listMentorApplications(request, response) {
  const result = await adminService.listMentorApplications(request.query);
  response.status(200).json(result);
}

export async function getMentorApplication(request, response) {
  const application = await adminService.getMentorApplication(request.params.id);
  response.status(200).json({ application });
}

export async function approveMentorApplication(request, response) {
  const application = await adminService.approveMentorApplication(
    request.user._id,
    request.params.id,
    request.body?.adminNotes,
  );
  response.status(200).json({ application });
}

export async function rejectMentorApplication(request, response) {
  const application = await adminService.rejectMentorApplication(
    request.user._id,
    request.params.id,
    request.body?.adminNotes,
  );
  response.status(200).json({ application });
}

export async function suspendMentorApplication(request, response) {
  const application = await adminService.suspendMentorApplication(request.user._id, request.params.id);
  response.status(200).json({ application });
}

export async function listMentors(request, response) {
  const result = await adminService.listMentors(request.query);
  response.status(200).json(result);
}

export async function getMentor(request, response) {
  const mentor = await adminService.getMentorById(request.params.id);
  response.status(200).json({ mentor });
}

export async function listMentees(request, response) {
  const result = await adminService.listMentees(request.query);
  response.status(200).json(result);
}

export async function getMentee(request, response) {
  const mentee = await adminService.getMenteeById(request.params.id);
  response.status(200).json({ mentee });
}

export async function listRelationships(request, response) {
  const result = await adminService.listRelationships(request.query);
  response.status(200).json(result);
}

export async function getRelationship(request, response) {
  const relationship = await adminService.getRelationshipById(request.params.id);
  response.status(200).json({ relationship });
}

export async function getMatches(request, response) {
  const result = await adminService.getMatchesForMenteeAdmin(request.params.menteeId);
  response.status(200).json(result);
}

export async function listAudit(request, response) {
  const result = await adminService.listAuditLogs(request.query);
  response.status(200).json(result);
}
