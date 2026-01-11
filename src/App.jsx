import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './admin/LoginPage.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import Dashboard from './admin/Dashboard.jsx'
import ProjectForm from './admin/ProjectForm.jsx'
import ProjectView from './admin/ProjectView.jsx'
import VerifyForm from './verify/VerifyForm.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects/new" element={<ProjectForm />} />
          <Route path="projects/:id/edit" element={<ProjectForm />} />
          <Route path="projects/:id/submissions" element={<ProjectView />} />
        </Route>

        <Route path="/verify/:projectId" element={<VerifyForm />} />

        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
