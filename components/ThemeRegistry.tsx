'use client';

import { useMemo, type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { createXzTheme } from '@/lib/theme';

export function ThemeRegistry({
  fontFamily,
  children,
}: {
  fontFamily: string;
  children: ReactNode;
}) {
  const theme = useMemo(() => createXzTheme(fontFamily), [fontFamily]);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
