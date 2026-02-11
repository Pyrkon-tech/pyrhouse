import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTokenValidation } from '../../hooks/useTokenValidation';
import { jwtDecode } from 'jwt-decode';
import { useStorage } from '../../hooks/useStorage';

interface JwtPayload {
  role: string;
  userID: number;
  exp: number;
}

// Stała określająca margines bezpieczeństwa w sekundach (5 minut)
const SAFETY_MARGIN = 5 * 60;

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const navigate = useNavigate();
  const { isTokenValid } = useTokenValidation();
  const { getToken } = useStorage();
  const token = getToken();

  console.log('[PrivateRoute] Check:', {
    hasToken: !!token,
    tokenPreview: token?.substring(0, 30) + '...',
    isTokenValid
  });

  useEffect(() => {
    if (!token || !isTokenValid) {
      console.log('[PrivateRoute] Redirecting to /login - token:', !!token, 'isTokenValid:', isTokenValid);
      navigate('/login');
      return;
    }

    try {
      const decodedToken = jwtDecode<JwtPayload>(token);
      const currentTime = Date.now() / 1000;
      
      // Dodajemy margines bezpieczeństwa - token jest uznawany za nieważny 5 minut przed faktycznym wygaśnięciem
      if (decodedToken.exp < currentTime + SAFETY_MARGIN) {
        navigate('/login');
        return;
      }
      
      const userRole = decodedToken.role;

      // Sprawdź, czy użytkownik ma wymagane uprawnienia
      const rolesHierarchy = {
        'admin': 3,
        'moderator': 2,
        'user': 1
      };

      if (rolesHierarchy[userRole as keyof typeof rolesHierarchy] < rolesHierarchy[requiredRole as keyof typeof rolesHierarchy]) {
        navigate('/home');
      }
    } catch (error) {
      console.error('Błąd dekodowania tokenu:', error);
      navigate('/login');
    }
  }, [token, isTokenValid, navigate, requiredRole]);

  if (!token || !isTokenValid) {
    return null;
  }

  return <>{children}</>;
};

export default PrivateRoute;
