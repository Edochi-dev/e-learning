import { Link } from 'react-router-dom';

interface CourseCardLinkProps {
    courseId: string;
    /** Cursos con acceso vigente de quien mira: para esos, el enlace va a su portada. */
    enrolledIds: ReadonlySet<string>;
    className: string;
    children: React.ReactNode;
}

/** Enlace de una tarjeta de curso: a la ficha si no lo tiene, a su portada si ya está inscrita. */
export const CourseCardLink = ({ courseId, enrolledIds, className, children }: CourseCardLinkProps) =>
    enrolledIds.has(courseId)
        ? <Link to={`/mis-cursos/${courseId}`} className={className}>Ir al curso →</Link>
        : <Link to={`/courses/${courseId}`} className={className}>{children}</Link>;
