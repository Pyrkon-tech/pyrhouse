import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { saveInvite } from '../auth';

/**
 * /invite/<token>: keeps the token for the login that follows, then shows the login page.
 * Saved during render on purpose: <Navigate> fires before this component's effects would run.
 */
const InvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  if (token) saveInvite(token);
  return <Navigate to="/login" replace />;
};

export default InvitePage;
