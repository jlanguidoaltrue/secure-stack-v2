'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api.js';
import { Button, TextField, Paper, Stack, Typography } from '@mui/material';
import toast from 'react-hot-toast';

export default function LoginPage(){
  const router = useRouter();
  const [usernameOrEmail, setU] = useState('');
  const [password, setP] = useState('');
  const [mfaToken, setOtp] = useState('');
  const [backupCode, setBackup] = useState('');
  const [msg, setMsg] = useState('');

  // Check if user is already logged in and redirect
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // User is already logged in, redirect to home page
      router.push('/');
    }
  }, [router]);

  const submit = async (e)=>{
    e.preventDefault();
    setMsg('');
    try{
      const res = await api.post('/auth/login', { usernameOrEmail, password, mfaToken, backupCode });
      const { accessToken, refreshToken } = res.data.data.tokens;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      toast.success('Successfully logged in!');
      setMsg('Logged in!');
      
      // Redirect to home page after successful login
      setTimeout(() => {
        router.push('/');
      }, 1000); // Small delay to show success message
      
    }catch(e){
      const errorMsg = e.response?.data?.message || 'Login failed';
      toast.error(errorMsg);
      setMsg(errorMsg);
    }
  };

  const oauth = (provider)=>{ window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/social/${provider}`; };

  const triggerTestError = () => {
    // Trigger a test error for testing error reporting
    throw new Error('Test error triggered for testing purposes');
  };

  const forgotPassword = async () => {
    if (!usernameOrEmail) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      await api.post('/auth/forgot', { email: usernameOrEmail });
      toast.success('Password reset email sent! Check your inbox.');
    } catch (e) {
      const errorMsg = e.response?.data?.message || 'Failed to send reset email';
      toast.error(errorMsg);
    }
  };

  return (
    <Paper className="p-6 max-w-md">
      <Typography variant="h5" className="mb-4">Login</Typography>
      <form onSubmit={submit}>
        <Stack spacing={2}>
          <TextField label="Username or Email" value={usernameOrEmail} onChange={e=>setU(e.target.value)} fullWidth/>
          <TextField label="Password" type="password" value={password} onChange={e=>setP(e.target.value)} fullWidth/>
          <TextField label="TOTP (if enabled)" value={mfaToken} onChange={e=>setOtp(e.target.value)} fullWidth/>
          <TextField label="Backup code (optional)" value={backupCode} onChange={e=>setBackup(e.target.value)} fullWidth/>
          <Button type="submit" variant="contained">Login</Button>
          <Typography color={msg.includes('failed') ? 'error' : 'success'}>{msg}</Typography>
          
          <div className="flex gap-2">
            <Button variant="text" onClick={forgotPassword} size="small">
              Forgot Password?
            </Button>
            <Button variant="text" onClick={triggerTestError} size="small" color="error">
              Test Error
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outlined" onClick={()=>oauth('google')}>Continue with Google</Button>
            <Button variant="outlined" onClick={()=>oauth('microsoft')}>Microsoft</Button>
          </div>
        </Stack>
      </form>
    </Paper>
  );
}
