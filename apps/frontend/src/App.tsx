import { lazy, Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { HttpCertificateGateway } from './gateways/HttpCertificateGateway';
import { HttpCourseGateway } from './gateways/HttpCourseGateway';
import { HttpAuthGateway } from './gateways/HttpAuthGateway';
import { HttpVideoGateway } from './gateways/HttpVideoGateway';
import { AuthProvider } from './context/AuthContext';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { ComingSoonGuard } from './components/ComingSoonGuard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { RedeemInvitationPage } from './pages/RedeemInvitationPage';
import { CertificateVerificationPage } from './pages/CertificateVerificationPage';
import { CertificateLookupPage } from './pages/CertificateLookupPage';
import { AccountPage } from './pages/AccountPage';
import { MyCoursesPage } from './pages/MyCoursesPage';
import { HttpEnrollmentGateway } from './gateways/HttpEnrollmentGateway';
import { HttpOrderGateway } from './gateways/HttpOrderGateway';
import { HttpCorrectionGateway } from './gateways/HttpCorrectionGateway';
import { HttpNameChangeGateway } from './gateways/HttpNameChangeGateway';
import { HttpScheduleGateway } from './gateways/HttpScheduleGateway';
import { HttpInvitationGateway } from './gateways/HttpInvitationGateway';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SiteLayout } from './components/SiteLayout';
import { SalesLandingPage } from './pages/SalesLandingPage';
import { ScrollToTop } from './components/ScrollToTop';
import { UserRole } from '@maris-nails/shared';
import { API_URL } from './config';
import { ToastProvider } from './components/Toast';

/**
 * Rutas diferidas.
 *
 * React Router no reparte el código por sí solo: cualquier página importada
 * arriba entra en el paquete inicial aunque nadie visite su ruta. Sin esto, la
 * visitante que llega a /oferta desde un anuncio se descarga el panel de
 * administración entero —con el lector de PDF y el calendario— antes de ver
 * una letra.
 *
 * Las páginas exportan con nombre y lazy() espera `default`, de ahí el .then.
 */
const LessonPage = lazy(() =>
  import('./pages/LessonPage').then((m) => ({ default: m.LessonPage })),
);
const CourseLearnPage = lazy(() =>
  import('./pages/CourseLearnPage').then((m) => ({ default: m.CourseLearnPage })),
);
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
);
const CorrectionsAdminPage = lazy(() =>
  import('./pages/admin/CorrectionsAdminPage').then((m) => ({ default: m.CorrectionsAdminPage })),
);
const NameChangeRequestsAdminPage = lazy(() =>
  import('./pages/admin/NameChangeRequestsAdminPage').then((m) => ({ default: m.NameChangeRequestsAdminPage })),
);
const SchedulePage = lazy(() =>
  import('./pages/admin/SchedulePage').then((m) => ({ default: m.SchedulePage })),
);
const ReviewCorrectionPage = lazy(() =>
  import('./pages/admin/ReviewCorrectionPage').then((m) => ({ default: m.ReviewCorrectionPage })),
);
const CoursesAdminPage = lazy(() =>
  import('./pages/admin/CoursesAdminPage').then((m) => ({ default: m.CoursesAdminPage })),
);
const CreateCoursePage = lazy(() =>
  import('./pages/admin/CreateCoursePage').then((m) => ({ default: m.CreateCoursePage })),
);
const EditCoursePage = lazy(() =>
  import('./pages/admin/EditCoursePage').then((m) => ({ default: m.EditCoursePage })),
);
const CourseStudentsPage = lazy(() =>
  import('./pages/admin/CourseStudentsPage').then((m) => ({ default: m.CourseStudentsPage })),
);
const CourseInvitationsPage = lazy(() =>
  import('./pages/admin/CourseInvitationsPage').then((m) => ({ default: m.CourseInvitationsPage })),
);
const CertificatesAdminPage = lazy(() =>
  import('./pages/admin/CertificatesAdminPage').then((m) => ({ default: m.CertificatesAdminPage })),
);
const CreateCertificateTemplatePage = lazy(() =>
  import('./pages/admin/CreateCertificateTemplatePage').then((m) => ({ default: m.CreateCertificateTemplatePage })),
);
const EditCertificateTemplatePage = lazy(() =>
  import('./pages/admin/EditCertificateTemplatePage').then((m) => ({ default: m.EditCertificateTemplatePage })),
);
const EditTemplateDesignPage = lazy(() =>
  import('./pages/admin/EditTemplateDesignPage').then((m) => ({ default: m.EditTemplateDesignPage })),
);
const GenerateCertificatesPage = lazy(() =>
  import('./pages/admin/GenerateCertificatesPage').then((m) => ({ default: m.GenerateCertificatesPage })),
);
const SearchCertificatesPage = lazy(() =>
  import('./pages/admin/SearchCertificatesPage').then((m) => ({ default: m.SearchCertificatesPage })),
);
const CertificateDetailAdminPage = lazy(() =>
  import('./pages/admin/CertificateDetailAdminPage').then((m) => ({ default: m.CertificateDetailAdminPage })),
);

function AppContent() {
  // useMemo garantiza que solo creamos una instancia de cada gateway, no una por render.
  // Si creáramos el gateway dentro del render sin useMemo, cada re-render crearía
  // un objeto nuevo, lo que rompe las dependencias de useEffect en los hooks.
  const certificateGateway = useMemo(() => new HttpCertificateGateway(API_URL), []);
  const courseGateway = useMemo(() => new HttpCourseGateway(API_URL), []);
  const authGateway = useMemo(() => new HttpAuthGateway(API_URL), []);
  const enrollmentGateway = useMemo(() => new HttpEnrollmentGateway(API_URL), []);
  const orderGateway = useMemo(() => new HttpOrderGateway(API_URL), []);
  const videoGateway = useMemo(() => new HttpVideoGateway(API_URL), []);
  const correctionGateway = useMemo(() => new HttpCorrectionGateway(API_URL), []);
  const nameChangeGateway = useMemo(() => new HttpNameChangeGateway(API_URL), []);
  const scheduleGateway = useMemo(() => new HttpScheduleGateway(API_URL), []);
  const invitationGateway = useMemo(() => new HttpInvitationGateway(API_URL), []);

  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
        <Routes>
        {/* Fuera del layout a propósito: una página de ventas no ofrece
            salidas, y la cabecera lleva a la home, que para el público es
            la de "próximamente". */}
        <Route path="/oferta" element={<SalesLandingPage />} />

        <Route element={<SiteLayout />}>
            {/* Rutas siempre públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            {/* Fuera del ComingSoonGuard a propósito: quien recibe una invitación
                debe poder entrar aunque el sitio siga en modo próximamente. */}
            <Route path="/invitacion/:token" element={<RedeemInvitationPage gateway={invitationGateway} authGateway={authGateway} />} />
            <Route path="/recuperar" element={<ForgotPasswordPage />} />
            <Route path="/restablecer" element={<ResetPasswordPage />} />
            <Route path="/certificados/buscar" element={<CertificateLookupPage gateway={certificateGateway} />} />
            <Route path="/certificados/:id" element={<CertificateVerificationPage gateway={certificateGateway} />} />

            {/* Rutas públicas — visibles solo para ADMIN en modo coming soon */}
            <Route path="/" element={<ComingSoonGuard><HomePage gateway={courseGateway} /></ComingSoonGuard>} />
            <Route path="/cursos" element={<ComingSoonGuard><CatalogPage gateway={courseGateway} /></ComingSoonGuard>} />
            <Route path="/courses/:id" element={<ComingSoonGuard><CourseDetailsPage gateway={courseGateway} orderGateway={orderGateway} /></ComingSoonGuard>} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<ComingSoonGuard><LessonPage gateway={courseGateway} videoGateway={videoGateway} /></ComingSoonGuard>} />

            {/* Rutas protegidas — cualquier usuario autenticado */}
            <Route element={<ProtectedRoute />}>
              <Route path="/cuenta" element={<AccountPage gateway={authGateway} orderGateway={orderGateway} certificateGateway={certificateGateway} nameChangeGateway={nameChangeGateway} />} />
              <Route path="/mis-cursos" element={<MyCoursesPage gateway={enrollmentGateway} />} />
              <Route path="/courses/:courseId/learn" element={<CourseLearnPage courseGateway={courseGateway} enrollmentGateway={enrollmentGateway} videoGateway={videoGateway} correctionGateway={correctionGateway} />} />
            </Route>

            {/* Rutas de Administración — solo accesibles con rol ADMIN */}
            <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
              <Route path="/admin" element={<AdminDashboardPage correctionGateway={correctionGateway} nameChangeGateway={nameChangeGateway} />} />
              <Route path="/admin/cambios-nombre" element={<NameChangeRequestsAdminPage gateway={nameChangeGateway} />} />
              <Route path="/admin/agenda" element={<SchedulePage gateway={scheduleGateway} />} />
              <Route path="/admin/correcciones" element={<CorrectionsAdminPage gateway={correctionGateway} courseGateway={courseGateway} />} />
              <Route path="/admin/correcciones/curso/:courseId" element={<ReviewCorrectionPage gateway={correctionGateway} />} />
              <Route path="/admin/cursos" element={<CoursesAdminPage gateway={courseGateway} />} />
              <Route path="/admin/courses/new" element={<CreateCoursePage gateway={courseGateway} />} />
              <Route path="/admin/courses/:courseId/edit" element={<EditCoursePage gateway={courseGateway} />} />
              <Route path="/admin/cursos/:courseId/alumnas" element={<CourseStudentsPage gateway={enrollmentGateway} courseGateway={courseGateway} />} />
              <Route path="/admin/cursos/:courseId/invitaciones" element={<CourseInvitationsPage gateway={invitationGateway} courseGateway={courseGateway} />} />
              <Route path="/admin/certificados" element={<CertificatesAdminPage gateway={certificateGateway} />} />
              <Route path="/admin/certificados/plantillas/nueva" element={<CreateCertificateTemplatePage gateway={certificateGateway} />} />
              <Route path="/admin/certificados/plantillas/:id/editar" element={<EditCertificateTemplatePage gateway={certificateGateway} />} />
              <Route path="/admin/certificados/plantillas/:id/diseno" element={<EditTemplateDesignPage gateway={certificateGateway} />} />
              <Route path="/admin/certificados/generar" element={<GenerateCertificatesPage gateway={certificateGateway} authGateway={authGateway} />} />
              <Route path="/admin/certificados/buscar" element={<SearchCertificatesPage gateway={certificateGateway} />} />
              <Route path="/admin/certificados/ver/:id" element={<CertificateDetailAdminPage gateway={certificateGateway} />} />
            </Route>

            {/* Cualquier otra URL → página de próximamente */}
            <Route path="*" element={<ComingSoonPage />} />
        </Route>
        </Routes>
      </Suspense>
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