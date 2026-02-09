// Esta es la definición ÚNICA de un curso para todo el proyecto
export interface Course {
    id: string;
    title: string;
    price: number;
    description: string;
    isLive: boolean; // True si es en vivo, False si es grabado
}