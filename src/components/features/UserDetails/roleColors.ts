export const getRoleColor = (role: string): 'error' | 'warning' | 'info' => {
  switch (role) {
    case 'admin': return 'error';
    case 'moderator': return 'warning';
    case 'dispatcher': return 'info';
    default: return 'info';
  }
};
