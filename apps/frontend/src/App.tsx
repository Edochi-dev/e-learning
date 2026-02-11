import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { HttpCourseGateway } from './gateways/HttpCourseGateway';
import { LocalStorageThemeGateway } from './gateways/LocalStorageThemeGateway';
import { HomePage } from './pages/HomePage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { useTheme } from './hooks/useTheme';

function App() {
  // Instanciamos Gateways
  const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);
  const themeGateway = useMemo(() => new LocalStorageThemeGateway(), []);

  // Hooks
  const { theme, toggleTheme } = useTheme(themeGateway);

  return (
    <BrowserRouter>
      <header className="header">
        <div className="container nav">
          <Link to="/" className="logo">Mari's Nails Academy 💅</Link>
          <nav className="nav-links">
            <Link to="/">Cursos</Link>
            <a href="#">Sobre Mí</a>
            <a href="#">Contacto</a>
            <button
              onClick={toggleTheme}
              className="btn-secondary"
              style={{ marginLeft: '1rem', border: 'none', fontSize: '1.2rem', padding: '0.5rem' }}
              aria-label="Toggle Dark Mode"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <a href="#" className="btn-primary" style={{ padding: '0.5rem 1rem', marginLeft: '1rem', color: 'white' }}>Campus Virtual</a>
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage gateway={courseGateway} />} />
          <Route path="/courses/:id" element={<CourseDetailsPage gateway={courseGateway} />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Mari's Nails Academy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </BrowserRouter>
  );
}

export default App;