'use client';

import { createTheme } from '@mui/material/styles';

export const kaitenTheme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    primary: {
      main: '#4caf50',
      dark: '#388e3c',
    },
    secondary: {
      main: '#9c27b0',
    },
    success: {
      main: '#4caf50',
      dark: '#2e7d32',
    },
    error: {
      main: '#e91e63',
      dark: '#c2185b',
    },
    warning: {
      main: '#ff9800',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#212121' },
    h5: { fontSize: '1.25rem', fontWeight: 700 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 500 },
    body1: { fontSize: '0.875rem', fontWeight: 400 },
    body2: { fontSize: '0.8125rem', fontWeight: 400 },
    caption: { fontSize: '0.75rem', fontWeight: 400 },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          borderRadius: 8,
          fontWeight: 500,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#757575',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.04em',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            paddingTop: 10,
            paddingBottom: 10,
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            fontSize: '0.8125rem',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.15)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        input: {
          fontSize: '0.8125rem',
          padding: '8px 12px',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '0.8125rem',
          padding: '8px 12px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          minHeight: 36,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
