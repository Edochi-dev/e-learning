import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { HttpCourseGateway } from './gateways/HttpCourseGateway';
import { HomePage } from './pages/HomePage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';

function App() {
  // Instanciamos el Gateway
  const courseGateway = useMemo(() => new HttpCourseGateway('http://localhost:3000'), []);

  return (
    <BrowserRouter>
      <header className="header">
        <div className="container nav">
          <Link to="/" className="logo">Mari's Nails Academy 💅</Link>
          <nav className="nav-links">
            <Link to="/">Cursos</Link>
            <a href="#">Sobre Mí</a>
            <a href="#">Contacto</a>
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

      <footer style={{ backgroundColor: '#fdf2f8', padding: '3rem 0', marginTop: '4rem', textAlign: 'center', color: '#666' }}>
        <div className="container">
          <p>© {new Date().getFullYear()} Mari's Nails Academy. Todos los derechos reservados.</p>
        </div>
      </footer>
    </BrowserRouter>
  );
}

export default App;