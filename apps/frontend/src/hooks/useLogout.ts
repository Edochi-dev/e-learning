import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Cierra la sesión y lleva al login: el mismo final desde cualquier botón. */
export const useLogout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    return async () => {
        await logout();
        navigate('/login');
    };
};
