'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../lib/api.js';
import { Button, TextField, Paper, Stack, Typography, Alert } from '@mui/material';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [uid, setUid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const uidParam = searchParams.get('uid');
    if (tokenParam) setToken(tokenParam);
    if (uidParam) setUid(uidParam);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token || !uid) {
      toast.error('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset', {
        uid,
        token,
        password
      });
      
      setSuccess(true);
      toast.success('Password reset successfully! You can now login with your new password.');
    } catch (e) {
      const errorMsg = e.response?.data?.message || 'Failed to reset password';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Paper className="p-6 max-w-md mx-auto mt-8">
        <Stack spacing={3} alignItems="center">
          <Typography variant="h5" color="success.main">
            Password Reset Successful!
          </Typography>
          <Alert severity="success">
            Your password has been reset successfully. You can now login with your new password.
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => window.location.href = '/login'}
            fullWidth
          >
            Go to Login
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper className="p-6 max-w-md mx-auto mt-8">
      <Typography variant="h5" className="mb-4">Reset Password</Typography>
      
      {(!token || !uid) && (
        <Alert severity="warning" className="mb-4">
          Invalid reset link. Please request a new password reset from the login page.
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <TextField
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText="Password must be at least 8 characters long"
          />
          
          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
            error={confirmPassword && password !== confirmPassword}
            helperText={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''}
          />
          
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !token || !uid || !password || !confirmPassword}
            fullWidth
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
          
          <Button
            variant="text"
            onClick={() => window.location.href = '/login'}
            fullWidth
          >
            Back to Login
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
