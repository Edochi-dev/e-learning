import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { HttpCourseGateway } from './gateways/HttpCourseGateway';
import { LocalStorageThemeGateway } from './gateways/LocalStorageThemeGateway';
import { HttpAuthGateway } from './gateways/HttpAuthGateway';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { LessonPage } from './pages/LessonPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ThemeSwitch } from './components/ThemeSwitch';
import { useTheme } from './hooks/useTheme';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { CreateCoursePage } from './pages/admin/CreateCoursePage';
import { EditCoursePage } from './pages/admin/EditCoursePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserRole } from '@maris-nails/shared';

function AppContent() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(new LocalStorageThemeGateway());
  const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);

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
            {user?.role === UserRole.ADMIN && (
              <Link to="/admin" style={{ marginRight: '1rem', fontWeight: 'bold' }}>
                Panel Admin
              </Link>
            )}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem' }}>Hola, {user.fullName}</span>
                <button onClick={logout} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  Salir
                </button>
              </div>
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

          {/* Ruta de lección protegida — requiere estar logueado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage gateway={courseGateway} />} />
          </Route>

          {/* Rutas de Administración Protegidas */}
          <Route element={<ProtectedRoute requiredRole={UserRole.ADMIN} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/courses/new" element={<CreateCoursePage />} />
            <Route path="/admin/courses/:courseId/edit" element={<EditCoursePage />} />
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
  const authGateway = useMemo(() => new HttpAuthGateway('http://localhost:3000'), []);

  return (
    <BrowserRouter>
      <AuthProvider gateway={authGateway}>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;