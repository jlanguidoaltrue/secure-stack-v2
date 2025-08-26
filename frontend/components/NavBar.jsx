'use client';
import Link from 'next/link';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function NavBar(){
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
      // Decode token to get user role (simplified - in production use proper JWT decode)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
  }, []);

  const logout = () => { 
    localStorage.removeItem('accessToken'); 
    localStorage.removeItem('refreshToken'); 
    setIsAuthenticated(false);
    setUserRole(null);
    router.push('/login'); 
  };

  const isAdmin = userRole === 'superadmin' || userRole === 'tenant_admin';

  return (
    <AppBar position="static" color="inherit" elevation={0}>
      <Toolbar className="max-w-6xl w-full mx-auto">
        <Box className="flex gap-3">
          <Button component={Link} href="/" color="primary">Home</Button>
          
          {/* Show these only when authenticated */}
          {isAuthenticated && (
            <>
              <Button component={Link} href="/users" color="primary">Users</Button>
              <Button component={Link} href="/profile" color="primary">Profile</Button>
              <Button component={Link} href="/upload" color="primary">Upload</Button>
              {isAdmin && (
                <Button component={Link} href="/admin/error-logs" color="primary">Error Logs</Button>
              )}
            </>
          )}
          
          {/* Show login only when not authenticated */}
          {!isAuthenticated && (
            <Button component={Link} href="/login" color="primary">Login</Button>
          )}
          
          {/* Show logout only when authenticated */}
          {isAuthenticated && (
            <Button onClick={logout} color="primary">Logout</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
