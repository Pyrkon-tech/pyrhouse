import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface RequireRoleProps {
  allowed: ('admin' | 'moderator' | 'dispatcher')[];
  children: React.ReactNode;
}

const RequireRole: React.FC<RequireRoleProps> = ({ allowed, children }) => {
  const { userRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!userRole || !(allowed as string[]).includes(userRole)) {
      navigate('/home', { replace: true });
    }
  }, [userRole, isAuthenticated, allowed, navigate]);

  if (!userRole || !(allowed as string[]).includes(userRole)) {
    return null;
  }
  return <>{children}</>;
};

export default RequireRole; 