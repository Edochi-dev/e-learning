import { useState, useEffect } from 'react';
import './App.css';
import type { Course } from '@maris-nails/shared';

function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/courses')
      .then((res) => res.json())
      .then((data) => {
        setCourses(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching courses:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', backgroundColor: '#fdf2f8', minHeight: '100vh', padding: '20px' }}>
      <h1>💅 Mari's Nails Academy</h1>
      <p>Bienvenida a la plataforma de aprendizaje.</p>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '30px' }}>
        {loading ? (
          <p>Cargando cursos...</p>
        ) : courses.length > 0 ? (
          courses.map((course) => (
            <div
              key={course.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '12px',
                padding: '20px',
                width: '300px',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                textAlign: 'left'
              }}
            >
              <h3 style={{ color: '#d946ef', marginTop: 0 }}>{course.title}</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>{course.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>${course.price}</span>
                {course.isLive ? (
                  <span style={{ backgroundColor: '#ff4d4d', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>EN VIVO 🔴</span>
                ) : (
                  <span style={{ backgroundColor: '#4ade80', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>GRABADO 📼</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>No se encontraron cursos.</p>
        )}
      </div>
    </div>
  );
}

export default App;