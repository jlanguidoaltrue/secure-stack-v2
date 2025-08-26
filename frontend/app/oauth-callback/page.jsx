'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography } from '@mui/material';

function parseHash(hash){
  const out = {}; const s = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const part of s.split('&')){ const [k,v] = part.split('='); if (k) out[decodeURIComponent(k)] = decodeURIComponent(v||''); }
  return out;
}

export default function OAuthCallback(){
  const [msg, setMsg] = useState('Processing...'); const router = useRouter();
  useEffect(()=>{
    const q = parseHash(window.location.hash || '');
    if (q.error){ setMsg('OAuth failed: ' + q.error); return; }
    if (q.accessToken){ localStorage.setItem('accessToken', q.accessToken); if (q.refreshToken) localStorage.setItem('refreshToken', q.refreshToken); setMsg('Logged in via OAuth!'); setTimeout(()=> router.push('/users'), 500); } else { setMsg('No tokens received'); }
  }, []);
  return <Typography>{msg}</Typography>;
}
