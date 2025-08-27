"use client";
import * as React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import AuthProvider from './AuthProvider';
import { useRouter } from 'next/navigation';

const theme = createTheme({ palette: { mode: 'light', primary: { main: '#2563eb' }, secondary: { main: '#9333ea' } }, shape: { borderRadius: 12 } });

export default function Providers({ children }){ 
  const router = useRouter();

  React.useEffect(() => {
    const onRedirect = (e) => {
      const to = e?.detail?.to;
      if (!to) return;
      // prevent multiple redirects in quick succession
      try {
        if (window.__authRedirecting) return;
        window.__authRedirecting = true;
        // perform a replace to avoid back-button loops
        router.replace(to);
        // clear the flag shortly after to allow future redirects
        setTimeout(() => {
          window.__authRedirecting = false;
        }, 1500);
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('auth:redirect', onRedirect);
    return () => window.removeEventListener('auth:redirect', onRedirect);
  }, [router]);

  React.useEffect(() => {
    const onThrottled = (e) => {
      const ms = e?.detail?.retryAfter || 60000;
      toast.error(`API rate limit reached. Retrying in ${Math.ceil(ms/1000)}s`);
    };
    window.addEventListener('api:throttled', onThrottled);
    return () => window.removeEventListener('api:throttled', onThrottled);
  }, []);
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
  <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  ); 
}
