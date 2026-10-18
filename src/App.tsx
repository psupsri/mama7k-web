import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { CreateLineupPage } from './pages/CreateLineupPage'
import { LineupPage } from './pages/LineupPage'
import { BuildEditorPage } from './pages/BuildEditorPage'
import { MyBuildsPage } from './pages/MyBuildsPage'
import { GroupsPage } from './pages/GroupsPage'
import { GroupDetailPage } from './pages/GroupDetailPage'
import { JoinPage } from './pages/JoinPage'
import { DemoVisibilityPage } from './pages/DemoVisibilityPage'
import { LoginPage, NotFoundPage, ProfilePage, RegisterPage, ResetPasswordPage } from './pages/AuthPages'
import { AdminLayout } from './pages/admin/AdminLayout'
import { AdminMasterPage } from './pages/admin/AdminMasterPage'
import { AdminImportPage } from './pages/admin/AdminImportPage'
import {
  AdminAuditPage,
  AdminBuildsPage,
  AdminLineupsPage,
  AdminUsersPage,
} from './pages/admin/AdminModerationPages'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/lineups/new', element: <CreateLineupPage /> },
      { path: '/lineups/:lineupId', element: <LineupPage /> },
      { path: '/lineups/:lineupId/b/:buildId', element: <LineupPage /> },
      { path: '/builds/new', element: <BuildEditorPage /> },
      { path: '/builds/:buildId/edit', element: <BuildEditorPage /> },
      { path: '/me/builds', element: <MyBuildsPage /> },
      { path: '/groups', element: <GroupsPage /> },
      { path: '/groups/:groupId', element: <GroupDetailPage /> },
      { path: '/join/:code', element: <JoinPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/demo/visibility', element: <DemoVisibilityPage /> },
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminMasterPage /> },
          { path: 'import', element: <AdminImportPage /> },
          { path: 'lineups', element: <AdminLineupsPage /> },
          { path: 'builds', element: <AdminBuildsPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'audit', element: <AdminAuditPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
