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
    if (!userRole || !allowed.includes(userRole as any)) {
      navigate('/home', { replace: true });
    }
  }, [userRole, isAuthenticated, allowed, navigate]);

  if (!userRole || !allowed.includes(userRole as any)) {
    return null;
  }
  return <>{children}</>;
};

export default RequireRole; 