import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import WorkspaceLayout from './layouts/WorkspaceLayout.jsx';
import PagePlaceholder from './components/PagePlaceholder.jsx';
import HomePage from './pages/public/HomePage.jsx';
import { publicRoutes, workspaceRoutes } from './routes.js';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        {publicRoutes.map((page) => (
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
          element={<WorkspaceLayout workspace={workspace} />}
        >
          {workspace.pages.map((page) => (
            <Route
              key={page.path || 'index'}
              index={!page.path}
              path={page.path || undefined}
              element={
                <PagePlaceholder
                  {...page}
                  backTo={page.path ? workspace.basePath : '/'}
                  backLabel={
                    page.path
                      ? `Back to ${workspace.role} workspace`
                      : 'Back to Academy'
                  }
                />
              }
            />
          ))}
        </Route>
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
