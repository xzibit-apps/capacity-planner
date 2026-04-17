import { createTheme, type Theme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

const teal = '#19B1A1';
const teal600 = '#0F8E80';
const teal50 = '#E6F6F3';
const teal100 = '#CFEDE8';
const teal700 = '#0A7060';

const ink = '#0F172A';
const ink700 = '#334155';
const ink500 = '#64748B';
const ink400 = '#94A3B8';
const ink300 = '#CBD5E1';

const surface = '#FFFFFF';
const surfaceSoft = '#F8FAFC';
const surfaceSub = '#F1F5F9';
const hairline = '#E2E8F0';
const hairlineSoft = '#EDF2F7';

const mint50 = '#E6F6F3';
const mint500 = '#19B1A1';
const mint700 = '#0F8E80';
const sky50 = '#EAF3FF';
const sky500 = '#3B82F6';
const sky700 = '#1D4ED8';
const amber50 = '#FEF3C7';
const amber500 = '#F59E0B';
const amber700 = '#B45309';
const coral50 = '#FFE4E0';
const coral500 = '#F87171';
const coral700 = '#B91C1C';
const lilac50 = '#EDE9FE';
const lilac500 = '#8B5CF6';
const lilac700 = '#5B21B6';

const rSm = 8;
const rMd = 12;
const rLg = 16;
const rPill = 999;

const shadowSm = '0 1px 2px rgba(15,23,42,0.04)';
const shadowMd = '0 1px 3px rgba(15,23,42,0.04), 0 6px 18px rgba(15,23,42,0.05)';
const shadowFloat = '0 10px 40px rgba(15,23,42,0.10)';
const shadowTeal = '0 4px 12px rgba(25,177,161,0.28)';
const shadowTealHover = '0 6px 16px rgba(25,177,161,0.32)';

export function createXzTheme(fontFamily: string): Theme {
  const stack = `${fontFamily}, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif`;

  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: teal, dark: teal600, light: teal50, contrastText: '#fff' },
      secondary: { main: ink, dark: '#000', light: ink500, contrastText: '#fff' },
      success: { main: mint500, dark: mint700, light: mint50, contrastText: '#fff' },
      warning: { main: amber500, dark: amber700, light: amber50, contrastText: '#fff' },
      error:   { main: coral500, dark: coral700, light: coral50, contrastText: '#fff' },
      info:    { main: sky500, dark: sky700, light: sky50, contrastText: '#fff' },
      text: {
        primary: ink,
        secondary: ink500,
        disabled: ink400,
      },
      background: { default: surfaceSoft, paper: surface },
      divider: hairline,
      grey: {
        100: surfaceSub,
        200: hairline,
        300: hairlineSoft,
        500: ink500,
        700: ink700,
        900: ink,
      },
    },

    typography: {
      fontFamily: stack,
      fontSize: 14,
      h1: { fontFamily: stack, fontWeight: 700, fontSize: '30px', lineHeight: 1.15, letterSpacing: '-0.02em', color: ink },
      h2: { fontFamily: stack, fontWeight: 700, fontSize: '22px', lineHeight: 1.2, letterSpacing: '-0.01em', color: ink },
      h3: { fontFamily: stack, fontWeight: 600, fontSize: '16px', lineHeight: 1.4, color: ink },
      h4: { fontFamily: stack, fontWeight: 700, fontSize: '22px', lineHeight: 1.2, letterSpacing: '-0.01em', color: ink },
      h5: { fontFamily: stack, fontWeight: 600, fontSize: '16px', lineHeight: 1.4, color: ink },
      h6: { fontFamily: stack, fontWeight: 600, fontSize: '15px', lineHeight: 1.4, color: ink },
      body1: { fontFamily: stack, fontSize: '14px', fontWeight: 400, lineHeight: 1.55, color: ink700 },
      body2: { fontFamily: stack, fontSize: '14px', fontWeight: 400, lineHeight: 1.55, color: ink500 },
      subtitle1: { fontFamily: stack, fontSize: '14px', fontWeight: 500, color: ink },
      subtitle2: { fontFamily: stack, fontSize: '12.5px', fontWeight: 600, color: ink500 },
      caption: { fontFamily: stack, fontSize: '12px', fontWeight: 400, lineHeight: 1.4, color: ink400 },
      overline: { fontFamily: stack, fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: teal600 },
      button: { fontFamily: stack, fontWeight: 600, fontSize: '13px', textTransform: 'none' },
    },

    shape: { borderRadius: rSm },

    spacing: 8,

    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: rPill,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '13px',
            padding: '10px 18px',
            gap: 8,
            minHeight: 'unset',
          },
          containedPrimary: {
            boxShadow: shadowTeal,
            '&:hover': { backgroundColor: teal600, boxShadow: shadowTealHover },
          },
          outlined: {
            borderColor: hairline,
            color: ink,
            backgroundColor: surface,
            '&:hover': { borderColor: ink300, backgroundColor: surface },
          },
          text: {
            color: ink500,
            '&:hover': { color: ink, backgroundColor: surfaceSoft },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: rPill,
            color: ink500,
            '&:hover': { backgroundColor: surfaceSoft, color: ink },
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: rPill,
            fontWeight: 600,
            fontSize: '11.5px',
            height: 'auto',
            padding: '5px 12px',
            '& .MuiChip-label': { padding: 0 },
          },
          filledSuccess: { backgroundColor: mint50, color: mint700 },
          filledWarning: { backgroundColor: amber50, color: amber700 },
          filledError:   { backgroundColor: coral50, color: coral700 },
          filledInfo:    { backgroundColor: sky50, color: sky700 },
          filledDefault: { backgroundColor: surfaceSoft, color: ink500 },
          filledPrimary: { backgroundColor: teal50, color: teal700 },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: rLg,
            border: `1px solid ${hairline}`,
            backgroundColor: surface,
            boxShadow: shadowSm,
            backgroundImage: 'none',
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: rLg,
          },
          outlined: {
            border: `1px solid ${hairline}`,
            backgroundColor: surface,
            boxShadow: shadowSm,
          },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundColor: surface,
            color: ink,
            boxShadow: 'none',
            borderBottom: `1px solid ${hairline}`,
            backgroundImage: 'none',
          },
        },
      },

      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: teal, height: 3, borderRadius: 3 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '13px',
            color: ink500,
            minHeight: 'unset',
            '&.Mui-selected': { color: ink, fontWeight: 600 },
          },
        },
      },

      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            borderRadius: rPill,
            backgroundColor: surface,
            border: `1px solid ${hairline}`,
            padding: 4,
            gap: 2,
          },
          grouped: {
            border: 0,
            '&:not(:first-of-type)': { borderRadius: rPill, marginLeft: 0 },
            '&:first-of-type': { borderRadius: rPill },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '13px',
            color: ink500,
            border: 0,
            borderRadius: rPill,
            padding: '6px 14px',
            '&:hover': { color: ink, backgroundColor: 'transparent' },
            '&.Mui-selected': {
              backgroundColor: ink,
              color: '#fff',
              '&:hover': { backgroundColor: ink700, color: '#fff' },
            },
          },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: rLg,
            boxShadow: shadowFloat,
            backgroundImage: 'none',
          },
        },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: rMd, fontSize: '13px' },
          standardSuccess: { backgroundColor: mint50, color: mint700, borderLeft: `4px solid ${mint500}` },
          standardWarning: { backgroundColor: amber50, color: amber700, borderLeft: `4px solid ${amber500}` },
          standardError:   { backgroundColor: coral50, color: coral700, borderLeft: `4px solid ${coral500}` },
          standardInfo:    { backgroundColor: sky50, color: sky700, borderLeft: `4px solid ${sky500}` },
        },
      },

      MuiSlider: {
        styleOverrides: {
          root: { color: teal },
          track: { backgroundColor: teal, border: 0 },
          rail: { backgroundColor: hairline, opacity: 1 },
          thumb: {
            backgroundColor: teal,
            '&:hover, &.Mui-focusVisible': { boxShadow: shadowTeal },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: rMd,
            backgroundColor: surface,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: hairline },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: ink300 },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: teal, borderWidth: 1 },
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { backgroundColor: teal50, borderRadius: rPill, height: 4 },
          bar: { backgroundColor: teal },
        },
      },

      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            color: ink700,
            '--DataGrid-rowBorderColor': hairlineSoft,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: surfaceSoft,
              borderBottom: `1px solid ${hairline}`,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
              color: ink500,
              fontSize: 12,
              textTransform: 'none',
            },
            '& .MuiDataGrid-cell': {
              borderBottomColor: hairlineSoft,
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: surfaceSoft,
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: `1px solid ${hairline}`,
              backgroundColor: surfaceSoft,
            },
          },
        },
      },
    },
  });
}

export const xzTokens = {
  teal, teal600, teal50, teal100, teal700,
  ink, ink700, ink500, ink400, ink300,
  surface, surfaceSoft, surfaceSub, hairline, hairlineSoft,
  mint50, mint500, mint700,
  sky50, sky500, sky700,
  amber50, amber500, amber700,
  coral50, coral500, coral700,
  lilac50, lilac500, lilac700,
  shadowSm, shadowMd, shadowFloat, shadowTeal,
} as const;
