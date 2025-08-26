'use client';
import * as React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';

const theme = createTheme({ palette: { mode: 'light', primary: { main: '#2563eb' }, secondary: { main: '#9333ea' } }, shape: { borderRadius: 12 } });

export default function Providers({ children }){ 
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
          error: {
            duration: 5000,
            theme: {
              primary: '#ff4b4b',
            },
          },
        }}
      />
      {children}
    </ThemeProvider>
  ); 
}
