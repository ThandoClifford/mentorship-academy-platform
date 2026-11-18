import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx';
import PagePlaceholder from './components/PagePlaceholder.jsx';
import GuestOnlyRoute from './components/GuestOnlyRoute.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/public/HomePage.jsx';
import LoginPage from './pages/public/LoginPage.jsx';
import RegisterPage from './pages/public/RegisterPage.jsx';
import MenteeProfilePage from './pages/mentee/ProfilePage.jsx';
import MenteeDashboardPage from './pages/mentee/MenteeDashboardPage.jsx';
import MentorProfilePage from './pages/mentor/ProfilePage.jsx';
import MentorDashboardPage from './pages/mentor/MentorDashboardPage.jsx';
import MenteeRequestMentorPage from './pages/mentee/mentorship/RequestMentorPage.jsx';
import MenteeRequestMentorDetailPage from './pages/mentee/mentorship/RequestMentorDetailPage.jsx';
import MenteeMyRequestsPage from './pages/mentee/mentorship/MyRequestsPage.jsx';
import MenteeMyRelationshipsPage from './pages/mentee/mentorship/MyRelationshipsPage.jsx';
import MenteeRelationshipDetailPage from './pages/mentee/mentorship/RelationshipDetailPage.jsx';
import MenteeMatchPage from './pages/mentee/match/MenteeMatchPage.jsx';
import MentorIncomingRequestsPage from './pages/mentor/mentorship/IncomingRequestsPage.jsx';
import MentorMyRelationshipsPage from './pages/mentor/mentorship/MyRelationshipsPage.jsx';
import MentorRelationshipDetailPage from './pages/mentor/mentorship/RelationshipDetailPage.jsx';
import MenteeGoalsPage from './pages/mentee/goals/MenteeGoalsPage.jsx';
import MenteeGoalDetailPage from './pages/mentee/goals/MenteeGoalDetailPage.jsx';
import MenteeProgressPage from './pages/mentee/goals/MenteeProgressPage.jsx';
import MenteeFeedbackPage from './pages/mentee/FeedbackPage.jsx';
import MentorGoalsPage from './pages/mentor/goals/MentorGoalsPage.jsx';
import MentorGoalDetailPage from './pages/mentor/goals/MentorGoalDetailPage.jsx';
import MenteeMessagesPage from './pages/mentee/messages/MessagesPage.jsx';
import MessagesInboxPage from './pages/shared/MessagesInboxPage.jsx';
import MentorMessagesPage from './pages/mentor/messages/MessagesPage.jsx';
import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminMentorApplicationsPage from './pages/admin/AdminMentorApplicationsPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminRelationshipsPage from './pages/admin/AdminRelationshipsPage.jsx';
import AdminAuditPage from './pages/admin/AdminAuditPage.jsx';
import AdminMatchesPage from './pages/admin/AdminMatchesPage.jsx';
import AdminCohortsPage from './pages/admin/AdminCohortsPage.jsx';
import AdminCohortMatchingPage from './pages/admin/AdminCohortMatchingPage.jsx';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage.jsx';
import AdminResourcesPage from './pages/admin/AdminResourcesPage.jsx';
import AdminContentPage from './pages/admin/AdminContentPage.jsx';
import ResourceLibraryPage from './pages/shared/ResourceLibraryPage.jsx';
import AdminMentorsPage from './pages/admin/AdminMentorsPage.jsx';
import AdminMenteesPage from './pages/admin/AdminMenteesPage.jsx';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage.jsx';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage.jsx';
import AdminReportsPage from './pages/admin/AdminReportsPage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';
import PlatformStatusGate from './components/PlatformStatusGate.jsx';
import MentorRegistrationPage from './pages/mentor/MentorRegistrationPage.jsx';
import { publicRoutes, workspaceRoutes } from './routes.js';

export default function App() {
  return (
    <PlatformStatusGate>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="mentor/register" element={<MentorRegistrationPage />} />
        <Route
          path="login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="register"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />
        {publicRoutes
          .filter((page) => !['login', 'register', 'mentor/register'].includes(page.path))
          .map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={
                <PagePlaceholder
                  {...page}
                  backTo="/"
                  backLabel="Back to Academy"
                />
              }
            />
          ))}
      </Route>
      {workspaceRoutes.map((workspace) => (
        <Route
          key={workspace.basePath}
          path={workspace.basePath}
          element={
            <ProtectedRoute allowedRole={workspace.role.toUpperCase()}>
              <WorkspaceLayout workspace={workspace} />
            </ProtectedRoute>
          }
        >
          {workspace.pages.map((page) => (
            <Route
              key={page.path || 'index'}
              index={!page.path}
              path={page.path || undefined}
              element={
                page.path === 'profile' && workspace.role === 'Mentee' ? (
                  <MenteeProfilePage />
                ) : !page.path && workspace.role === 'Mentee' ? (
                  <MenteeDashboardPage />
                ) : !page.path && workspace.role === 'Mentor' ? (
                  <MentorDashboardPage />
                ) : page.path === 'profile' && workspace.role === 'Mentor' ? (
                  <MentorProfilePage />
                ) : page.path === 'mentorship/request' && workspace.role === 'Mentee' ? (
                  <MenteeRequestMentorPage />
                ) : page.path === 'mentorship/request/:id' && workspace.role === 'Mentee' ? (
                  <MenteeRequestMentorDetailPage />
                ) : page.path === 'mentorship/requests' && workspace.role === 'Mentee' ? (
                  <MenteeMyRequestsPage />
                ) : page.path === 'mentorship/relationships' && workspace.role === 'Mentee' ? (
                  <MenteeMyRelationshipsPage />
                ) : page.path === 'mentorship/relationships/:id' && workspace.role === 'Mentee' ? (
                  <MenteeRelationshipDetailPage />
                ) : page.path === 'mentorship/relationships/:id/messages' && workspace.role === 'Mentee' ? (
                  <MenteeMessagesPage />
                ) : page.path === 'messages' && workspace.role === 'Mentee' ? (
                  <MessagesInboxPage role="MENTEE" />
                ) : page.path === 'messages' && workspace.role === 'Mentor' ? (
                  <MessagesInboxPage role="MENTOR" />
                ) : page.path === 'mentor' && workspace.role === 'Mentee' ? (
                  <MenteeMyRelationshipsPage />
                ) : page.path === 'goals' && workspace.role === 'Mentee' ? (
                  <MenteeGoalsPage />
                ) : page.path === 'goals/:relationshipId/:goalId' && workspace.role === 'Mentee' ? (
                  <MenteeGoalDetailPage />
                ) : page.path === 'progress' && workspace.role === 'Mentee' ? (
                  <MenteeProgressPage />
                ) : page.path === 'feedback' && workspace.role === 'Mentee' ? (
                  <MenteeFeedbackPage />
                ) : page.path === 'match' && workspace.role === 'Mentee' ? (
                  <MenteeMatchPage />
                ) : page.path === 'mentorship/requests' && workspace.role === 'Mentor' ? (
                  <MentorIncomingRequestsPage />
                ) : page.path === 'mentees' && workspace.role === 'Mentor' ? (
                  <MentorMyRelationshipsPage pageTitle="My Mentees" />
                ) : page.path === 'mentorship/relationships' && workspace.role === 'Mentor' ? (
                  <MentorMyRelationshipsPage />
                ) : page.path === 'mentorship/relationships/:id' && workspace.role === 'Mentor' ? (
                  <MentorRelationshipDetailPage />
                ) : page.path === 'mentorship/relationships/:id/messages' && workspace.role === 'Mentor' ? (
                  <MentorMessagesPage />
                ) : page.path === 'goals' && workspace.role === 'Mentor' ? (
                  <MentorGoalsPage />
                ) : page.path === 'goals/:relationshipId/:goalId' && workspace.role === 'Mentor' ? (
                  <MentorGoalDetailPage />
                ) : page.path === 'resources' && workspace.role === 'Mentee' ? (
                  <ResourceLibraryPage role="MENTEE" />
                ) : page.path === 'resources' && workspace.role === 'Mentor' ? (
                  <ResourceLibraryPage role="MENTOR" />
                ) : !page.path && workspace.role === 'Admin' ? (
                  <AdminDashboardPage />
                ) : page.path === 'users' && workspace.role === 'Admin' ? (
                  <AdminUsersPage />
                ) : page.path === 'mentor-applications' && workspace.role === 'Admin' ? (
                  <AdminMentorApplicationsPage />
                ) : page.path === 'relationships' && workspace.role === 'Admin' ? (
                  <AdminRelationshipsPage />
                ) : page.path === 'audit' && workspace.role === 'Admin' ? (
                  <AdminAuditPage />
                ) : page.path === 'matches' && workspace.role === 'Admin' ? (
                  <AdminMatchesPage />
                ) : page.path === 'analytics' && workspace.role === 'Admin' ? (
                  <AdminAnalyticsPage />
                ) : page.path === 'resources' && workspace.role === 'Admin' ? (
                  <AdminResourcesPage />
                ) : page.path === 'content' && workspace.role === 'Admin' ? (
                  <AdminContentPage />
                ) : page.path === 'mentors' && workspace.role === 'Admin' ? (
                  <AdminMentorsPage />
                ) : page.path === 'mentees' && workspace.role === 'Admin' ? (
                  <AdminMenteesPage />
                ) : page.path === 'cohorts' && workspace.role === 'Admin' ? (
                  <AdminCohortsPage />
                ) : page.path === 'cohorts/:cohortId/matching' && workspace.role === 'Admin' ? (
                  <AdminCohortMatchingPage />
                ) : page.path === 'feedback' && workspace.role === 'Admin' ? (
                  <AdminFeedbackPage />
                ) : page.path === 'notifications' && workspace.role === 'Admin' ? (
                  <AdminNotificationsPage />
                ) : page.path === 'reports' && workspace.role === 'Admin' ? (
                  <AdminReportsPage />
                ) : page.path === 'settings' && workspace.role === 'Admin' ? (
                  <AdminSettingsPage />
                ) : (
                  <PagePlaceholder
                    {...page}
                    backTo={page.path ? workspace.basePath : '/'}
                    backLabel={
                      page.path
                        ? `Back to ${workspace.role} workspace`
                        : 'Back to Academy'
                    }
                  />
                )
              }
            />
          ))}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </PlatformStatusGate>
  );
}
