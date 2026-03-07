import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { HttpCertificateGateway } from './gateways/HttpCertificateGateway';
import { LocalStorageThemeGateway } from './gateways/LocalStorageThemeGateway';
import { HttpAuthGateway } from './gateways/HttpAuthGateway';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { LoginPage } from './pages/LoginPage';
import { ThemeSwitch } from './components/ThemeSwitch';
import { UserMenu } from './components/UserMenu';
import { useTheme } from './hooks/useTheme';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { CreateCoursePage } from './pages/admin/CreateCoursePage';
import { EditCoursePage } from './pages/admin/EditCoursePage';
import { CertificatesAdminPage } from './pages/admin/CertificatesAdminPage';
import { CreateCertificateTemplatePage } from './pages/admin/CreateCertificateTemplatePage';
import { GenerateCertificatesPage } from './pages/admin/GenerateCertificatesPage';
import { SearchCertificatesPage } from './pages/admin/SearchCertificatesPage';
import { CertificateDetailAdminPage } from './pages/admin/CertificateDetailAdminPage';
import { CertificateVerificationPage } from './pages/CertificateVerificationPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from '@maris-nails/shared';

const API_URL = import.meta.env.VITE_API_URL;

function AppContent() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme(new LocalStorageThemeGateway());
  // useMemo garantiza que solo creamos una instancia de cada gateway, no una por render.
  // Si creáramos el gateway dentro del render sin useMemo, cada re-render crearía
  // un objeto nuevo, lo que rompe las dependencias de useEffect en los hooks.
  const certificateGateway = useMemo(() => new HttpCertificateGateway(API_URL), []);

  return (
    <>
      <header className="header">
        <div className="container nav">
          <Link to="/" className="logo">Mari's Nails Academy 💅</Link>
          <nav className="nav-links">
            <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
            {user ? (
              <UserMenu />
            ) : (
              <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1rem', color: 'white' }}>
                Ingresar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          {/* Rutas siempre públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/certificados/:id" element={<CertificateVerificationPage gateway={certificateGateway} />} />

          {/* Rutas de Administración — solo accesibles con rol ADMIN */}
          <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/courses/new" element={<CreateCoursePage />} />
            <Route path="/admin/courses/:courseId/edit" element={<EditCoursePage />} />
            <Route path="/admin/certificados" element={<CertificatesAdminPage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/plantillas/nueva" element={<CreateCertificateTemplatePage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/generar" element={<GenerateCertificatesPage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/buscar" element={<SearchCertificatesPage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/ver/:id" element={<CertificateDetailAdminPage gateway={certificateGateway} />} />
          </Route>

          {/* Cualquier otra URL → página de próximamente */}
          <Route path="*" element={<ComingSoonPage />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Mari's Nails Academy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}

function App() {
  const authGateway = useMemo(() => new HttpAuthGateway(API_URL), []);

  return (
    <BrowserRouter>
      <AuthProvider gateway={authGateway}>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;