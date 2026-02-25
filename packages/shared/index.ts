// Esta es la definición ÚNICA de un curso para todo el proyecto

export interface Lesson {
    id: string;
    title: string;
    description: string;
    duration: string; // Ej: "10:00", "1h 30m"
    videoUrl: string; // URL del video (YouTube embed o MP4)
}

export interface Course {
    id: string;
    title: string;
    price: number;
    description: string;
    isLive: boolean; // True si es en vivo, False si es grabado
    lessons: Lesson[];
}

// Este objeto define los roles permitidos en tu academia.
// Usamos "const + as const" en lugar de "enum" porque TypeScript moderno
// (con erasableSyntaxOnly) exige que todo el código sea borrable al compilar.
export const UserRole = {
    ADMIN: 'admin',
    STUDENT: 'student',
} as const;

// Este type reconstruye la unión de valores: 'admin' | 'student'
// Permite usar UserRole como tipo (role: UserRole) igual que antes.
export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    user: User;
}

export interface CreateCoursePayload {
    title: string;
    price: number;
    description: string;
    isLive: boolean;
}

export interface CreateLessonPayload {
    title: string;
    description: string;
    duration: string;
    videoUrl: string;
}

export interface UpdateCoursePayload {
    title?: string;
    price?: number;
    description?: string;
    isLive?: boolean;
}

export interface UpdateLessonPayload {
    title?: string;
    description?: string;
    duration?: string;
    videoUrl?: string;
}