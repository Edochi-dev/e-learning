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

export interface User {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    user: User;
}