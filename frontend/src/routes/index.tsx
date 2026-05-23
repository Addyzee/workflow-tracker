import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import ApplicationDetailPage from "../pages/ApplicationDetailPage";
import ApplicationFormPage from "../pages/ApplicationFormPage";
import ApplicationListPage from "../pages/ApplicationListPage";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<ApplicationListPage />} />
        <Route path="/applications/:trackingNumber" element={<ApplicationDetailPage />} />
        <Route element={<ProtectedRoute allowedRoles={["applicant"]} />}>
          <Route path="/applications/new" element={<ApplicationFormPage />} />
          <Route path="/applications/:trackingNumber/edit" element={<ApplicationFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
