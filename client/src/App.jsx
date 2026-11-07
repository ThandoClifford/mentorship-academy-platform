import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx';
import HomePage from './pages/public/HomePage.jsx';
import MenteeHomePage from './pages/mentee/HomePage.jsx';
import MentorHomePage from './pages/mentor/HomePage.jsx';
import AdminHomePage from './pages/admin/HomePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route
        path="/mentee/*"
        element={
          <WorkspaceLayout role="Mentee">
            <MenteeHomePage />
          </WorkspaceLayout>
        }
      />
      <Route
        path="/mentor/*"
        element={
          <WorkspaceLayout role="Mentor">
            <MentorHomePage />
          </WorkspaceLayout>
        }
      />
      <Route
        path="/admin/*"
        element={
          <WorkspaceLayout role="Admin">
            <AdminHomePage />
          </WorkspaceLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
