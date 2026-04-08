import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { HttpCertificateGateway } from './gateways/HttpCertificateGateway';
import { HttpCourseGateway } from './gateways/HttpCourseGateway';
import { LocalStorageThemeGateway } from './gateways/LocalStorageThemeGateway';
import { HttpAuthGateway } from './gateways/HttpAuthGateway';
import { HttpVideoGateway } from './gateways/HttpVideoGateway';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { ComingSoonGuard } from './components/ComingSoonGuard';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { LessonPage } from './pages/LessonPage';
import { CourseLearnPage } from './pages/CourseLearnPage';
import { ThemeSwitch } from './components/ThemeSwitch';
import { UserMenu } from './components/UserMenu';
import { useTheme } from './hooks/useTheme';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { CoursesAdminPage } from './pages/admin/CoursesAdminPage';
import { CreateCoursePage } from './pages/admin/CreateCoursePage';
import { EditCoursePage } from './pages/admin/EditCoursePage';
import { CertificatesAdminPage } from './pages/admin/CertificatesAdminPage';
import { CreateCertificateTemplatePage } from './pages/admin/CreateCertificateTemplatePage';
import { EditCertificateTemplatePage } from './pages/admin/EditCertificateTemplatePage';
import { EditTemplateDesignPage } from './pages/admin/EditTemplateDesignPage';
import { GenerateCertificatesPage } from './pages/admin/GenerateCertificatesPage';
import { SearchCertificatesPage } from './pages/admin/SearchCertificatesPage';
import { CertificateDetailAdminPage } from './pages/admin/CertificateDetailAdminPage';
import { CertificateVerificationPage } from './pages/CertificateVerificationPage';
import { CertificateLookupPage } from './pages/CertificateLookupPage';
import { AccountPage } from './pages/AccountPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { HttpEnrollmentGateway } from './gateways/HttpEnrollmentGateway';
import { HttpOrderGateway } from './gateways/HttpOrderGateway';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from '@maris-nails/shared';
import { API_URL } from './config';
import { ToastProvider } from './components/Toast';

function AppContent() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme(new LocalStorageThemeGateway());
  const navigate = useNavigate();
  const location = useLocation();

  function handleContactoClick(e: React.MouseEvent) {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: 'contacto' } });
    }
  }
  // useMemo garantiza que solo creamos una instancia de cada gateway, no una por render.
  // Si creáramos el gateway dentro del render sin useMemo, cada re-render crearía
  // un objeto nuevo, lo que rompe las dependencias de useEffect en los hooks.
  const certificateGateway = useMemo(() => new HttpCertificateGateway(API_URL), []);
  const courseGateway = useMemo(() => new HttpCourseGateway(API_URL), []);
  const authGateway = useMemo(() => new HttpAuthGateway(API_URL), []);
  const enrollmentGateway = useMemo(() => new HttpEnrollmentGateway(API_URL), []);
  const orderGateway = useMemo(() => new HttpOrderGateway(API_URL), []);
  const videoGateway = useMemo(() => new HttpVideoGateway(API_URL), []);

  return (
    <>
      <header className="header">
        <div className="container nav">
          <Link to="/" className="logo">
            <img src="/images/Logo dorado.PNG" alt="" className="logo__img" />
            <span className="logo__name"><em>Mari's Nails Academy</em></span>
          </Link>
          <nav className="nav-links">
            {user?.role === UserRole.ADMIN && (
              <>
                <Link to="/cursos">Cursos</Link>
                <a href="#contacto" onClick={handleContactoClick}>Contacto</a>
              </>
            )}
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
          <Route path="/certificados/buscar" element={<CertificateLookupPage gateway={certificateGateway} />} />
          <Route path="/certificados/:id" element={<CertificateVerificationPage gateway={certificateGateway} />} />

          {/* Rutas públicas — visibles solo para ADMIN en modo coming soon */}
          <Route path="/" element={<ComingSoonGuard><HomePage gateway={courseGateway} /></ComingSoonGuard>} />
          <Route path="/cursos" element={<ComingSoonGuard><CatalogPage gateway={courseGateway} /></ComingSoonGuard>} />
          <Route path="/courses/:id" element={<ComingSoonGuard><CourseDetailsPage gateway={courseGateway} orderGateway={orderGateway} /></ComingSoonGuard>} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<ComingSoonGuard><LessonPage gateway={courseGateway} videoGateway={videoGateway} /></ComingSoonGuard>} />

          {/* Rutas protegidas — cualquier usuario autenticado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/cuenta" element={<AccountPage gateway={authGateway} />} />
            <Route path="/mis-cursos" element={<MyCoursesPage gateway={enrollmentGateway} />} />
            <Route path="/courses/:courseId/learn" element={<CourseLearnPage courseGateway={courseGateway} enrollmentGateway={enrollmentGateway} videoGateway={videoGateway} />} />
          </Route>

          {/* Rutas de Administración — solo accesibles con rol ADMIN */}
          <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/cursos" element={<CoursesAdminPage gateway={courseGateway} />} />
            <Route path="/admin/courses/new" element={<CreateCoursePage gateway={courseGateway} />} />
            <Route path="/admin/courses/:courseId/edit" element={<EditCoursePage gateway={courseGateway} />} />
            <Route path="/admin/certificados" element={<CertificatesAdminPage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/plantillas/nueva" element={<CreateCertificateTemplatePage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/plantillas/:id/editar" element={<EditCertificateTemplatePage gateway={certificateGateway} />} />
            <Route path="/admin/certificados/plantillas/:id/diseno" element={<EditTemplateDesignPage gateway={certificateGateway} />} />
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
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;