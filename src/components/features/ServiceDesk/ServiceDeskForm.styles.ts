import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';

// --- Color tokens ---

const COLORS = {
  light: {
    bg: '#fafbfc',
    border: 'rgba(120,120,140,0.25)',
    text: '#181818',
    label: '#333',
    placeholder: '#888',
    helper: '#666',
    icon: '#555',
  },
  dark: {
    bg: 'rgba(44,44,56,0.98)',
    border: 'rgba(120,120,140,0.35)',
    text: '#fff',
    label: '#e0e0e0',
    placeholder: '#aaa',
    helper: '#bdbdbd',
    icon: '#aaa',
  },
} as const;

const c = (isDark: boolean) => isDark ? COLORS.dark : COLORS.light;

// --- Shared MUI input overrides (TextField + Select share the same outline structure) ---

const inputOverrides = (isDark: boolean, primaryColor: string) => {
  const { bg, border } = c(isDark);
  return {
    background: bg,
    borderRadius: 10,
    '& .MuiOutlinedInput-root': {
      borderRadius: 10,
      background: bg,
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderRadius: 10,
      borderColor: border,
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: primaryColor,
      borderRadius: 10,
    },
  };
};

// --- Styled components ---

export const StyledPaper = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => {
  const isDark = !isPublic && theme.palette.mode === 'dark';
  return {
    width: '100%',
    padding: theme.spacing(2, 4),
    borderRadius: 20,
    textAlign: 'center',
    maxWidth: '100vw',
    transition: 'background 0.2s',
    boxShadow: isDark
      ? '0 8px 32px 0 rgba(20,20,30,0.45)'
      : '0 8px 32px 0 rgba(60,60,80,0.12)',
    background: isDark ? 'rgba(32,32,40,0.98)' : 'rgba(255,255,255,0.98)',
  };
});

export const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => {
  const isDark = !isPublic && theme.palette.mode === 'dark';
  const { text, label, placeholder, helper } = c(isDark);
  return {
    marginBottom: theme.spacing(2),
    ...inputOverrides(isDark, theme.palette.primary.main),
    '& .MuiInputBase-input::placeholder': { color: placeholder, opacity: 1 },
    '& label': { color: label, fontWeight: 500 },
    '& .MuiFormHelperText-root': { color: helper },
    '& input': { color: text },
  };
});

export const StyledSelect = styled(Select, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => {
  const isDark = !isPublic && theme.palette.mode === 'dark';
  const { text, icon } = c(isDark);
  return {
    ...inputOverrides(isDark, theme.palette.primary.main),
    color: text,
    '& .MuiSelect-select': { color: text },
    '& .MuiSvgIcon-root': { color: icon },
  };
});

export const StyledFormControl = styled(FormControl, {
  shouldForwardProp: (prop) => prop !== 'isPublic',
})<{ isPublic?: boolean }>(({ theme, isPublic }) => {
  const isDark = !isPublic && theme.palette.mode === 'dark';
  return {
    '& .MuiInputLabel-root': { color: c(isDark).label },
    '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primary.main },
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
  ...(isPublic ? {
    background: '#ffb347',
    color: '#181818',
    boxShadow: '0 2px 8px 0 rgba(60,60,80,0.10)',
    '&:hover': { background: '#ffa726' },
    '&:disabled': { background: '#eee', color: '#bbb' },
  } : {}),
}));
