import { Navigate, Route, Routes } from "react-router-dom";

import ApplicationDetailPage from "../pages/ApplicationDetailPage";
import ApplicationFormPage from "../pages/ApplicationFormPage";
import ApplicationListPage from "../pages/ApplicationListPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ApplicationListPage />} />
      <Route path="/applications/new" element={<ApplicationFormPage />} />
      <Route path="/applications/:trackingNumber" element={<ApplicationDetailPage />} />
      <Route path="/applications/:trackingNumber/edit" element={<ApplicationFormPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
