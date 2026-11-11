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
import MentorProfilePage from './pages/mentor/ProfilePage.jsx';
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
import MentorGoalsPage from './pages/mentor/goals/MentorGoalsPage.jsx';
import MentorGoalDetailPage from './pages/mentor/goals/MentorGoalDetailPage.jsx';
import MenteeMessagesPage from './pages/mentee/messages/MessagesPage.jsx';
import MentorMessagesPage from './pages/mentor/messages/MessagesPage.jsx';
import { publicRoutes, workspaceRoutes } from './routes.js';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
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
          .filter((page) => !['login', 'register'].includes(page.path))
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
                ) : page.path === 'goals' && workspace.role === 'Mentee' ? (
                  <MenteeGoalsPage />
                ) : page.path === 'goals/:relationshipId/:goalId' && workspace.role === 'Mentee' ? (
                  <MenteeGoalDetailPage />
                ) : page.path === 'progress' && workspace.role === 'Mentee' ? (
                  <MenteeProgressPage />
                ) : page.path === 'match' && workspace.role === 'Mentee' ? (
                  <MenteeMatchPage />
                ) : page.path === 'mentorship/requests' && workspace.role === 'Mentor' ? (
                  <MentorIncomingRequestsPage />
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
  );
}
