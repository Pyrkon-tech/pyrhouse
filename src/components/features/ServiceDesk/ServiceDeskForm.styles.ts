import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';

export const StyledPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => ({
  width: '100%',
  padding: theme.spacing(2, 4),
  borderRadius: 20,
  textAlign: 'center',
  boxShadow: isPublic
    ? '0 8px 32px 0 rgba(60,60,80,0.12)'
    : theme.palette.mode === 'dark'
    ? '0 8px 32px 0 rgba(20,20,30,0.45)'
    : '0 8px 32px 0 rgba(60,60,80,0.12)',
  background: isPublic
    ? 'rgba(255,255,255,0.98)'
    : theme.palette.mode === 'dark'
    ? 'rgba(32,32,40,0.98)'
    : 'rgba(255,255,255,0.98)',
  maxWidth: '100vw',
  transition: 'background 0.2s',
}));

export const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => {
  const isDark = !isPublic && theme.palette.mode === 'dark';
  return {
    marginBottom: theme.spacing(2),
    background: isPublic
      ? '#fafbfc'
      : isDark
      ? 'rgba(44,44,56,0.98)'
      : '#fafbfc',
    borderRadius: 10,
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
      background: isPublic
        ? '#fafbfc'
        : isDark
        ? 'rgba(44,44,56,0.98)'
        : '#fafbfc',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderRadius: 10,
      borderColor: isPublic
        ? 'rgba(120,120,140,0.25)'
        : isDark
        ? 'rgba(120,120,140,0.35)'
        : 'rgba(120,120,140,0.25)',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
      borderRadius: 10,
    },
    '& .MuiInputBase-input::placeholder': {
      color: isPublic ? '#888' : isDark ? '#aaa' : '#888',
      opacity: 1,
    },
    '& label': {
      color: isPublic ? '#333' : isDark ? '#e0e0e0' : '#333',
      fontWeight: 500,
    },
    '& .MuiFormHelperText-root': {
      color: isPublic ? '#666' : isDark ? '#bdbdbd' : '#666',
    },
    '& input': {
      color: isPublic ? '#181818' : isDark ? '#fff' : '#181818',
    },
  };
});

export const StyledSelect = styled(Select, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => {
  const isDark = !isPublic && theme.palette.mode === 'dark';
  return {
    background: isPublic
      ? '#fafbfc'
      : isDark
      ? 'rgba(44,44,56,0.98)'
      : '#fafbfc',
    borderRadius: 10,
    color: isPublic ? '#181818' : isDark ? '#fff' : '#181818',
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
      background: isPublic
        ? '#fafbfc'
        : isDark
        ? 'rgba(44,44,56,0.98)'
        : '#fafbfc',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderRadius: 10,
      borderColor: isPublic
        ? 'rgba(120,120,140,0.25)'
        : isDark
        ? 'rgba(120,120,140,0.35)'
        : 'rgba(120,120,140,0.25)',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
      borderRadius: 10,
    },
  };
});

export const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.4, 0),
  fontWeight: 600,
  fontSize: '1.1rem',
  borderRadius: 8,
  ...(isPublic
    ? {
        background: '#ffb347',
        color: '#181818',
        boxShadow: '0 2px 8px 0 rgba(60,60,80,0.10)',
        '&:hover': {
          background: '#ffa726',
        },
        '&:disabled': {
          background: '#eee',
          color: '#bbb',
        },
      }
    : {}),
})); 