import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { HttpCourseGateway } from './gateways/HttpCourseGateway';
import { HttpEnrollmentGateway } from './gateways/HttpEnrollmentGateway';
import { HttpCertificateGateway } from './gateways/HttpCertificateGateway';
import { LocalStorageThemeGateway } from './gateways/LocalStorageThemeGateway';
import { HttpAuthGateway } from './gateways/HttpAuthGateway';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { LessonPage } from './pages/LessonPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { AccountPage } from './pages/AccountPage';
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
  const courseGateway = useMemo(() => new HttpCourseGateway(API_URL), []);
  const enrollmentGateway = useMemo(() => new HttpEnrollmentGateway(API_URL), []);
  const certificateGateway = useMemo(() => new HttpCertificateGateway(API_URL), []);

  return (
    <>
      <header className="header">
        <div className="container nav">
          <Link to="/" className="logo">Mari's Nails Academy 💅</Link>
          <nav className="nav-links">
            <Link to="/catalogo">Catálogo</Link>
            <Link to="/#sobre-mi">Sobre Mí</Link>
            <a href="https://wa.me/525512345678" target="_blank" rel="noreferrer">Contacto</a>
            <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
            {/* Si hay usuario: mostramos el menú desplegable con avatar */}
            {/* Si no hay usuario: botones de registro e inicio de sesión */}
            {user ? (
              <UserMenu />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                <Link to="/register" className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                  Registrarse
                </Link>
                <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1rem', color: 'white' }}>
                  Ingresar
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage gateway={courseGateway} />} />
          <Route path="/catalogo" element={<CatalogPage gateway={courseGateway} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/courses/:id" element={<CourseDetailsPage gateway={courseGateway} />} />
          <Route path="/certificados/:id" element={<CertificateVerificationPage gateway={certificateGateway} />} />

          {/* Rutas protegidas — requieren estar logueado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage gateway={courseGateway} />} />
            {/* Mis cursos y cuenta: solo accesibles si estás autenticado */}
            <Route path="/mis-cursos" element={<MyCoursesPage gateway={enrollmentGateway} />} />
            <Route path="/cuenta" element={<AccountPage />} />
          </Route>

          {/* Rutas de Administración Protegidas */}
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