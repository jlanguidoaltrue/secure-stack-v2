'use client';
import { useState } from 'react';
import api from '../../lib/api.js';
import { Paper, Typography, Button } from '@mui/material';

export default function UploadPage(){
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async () => {
    setMsg(''); if (!file) return;
    const form = new FormData(); form.append('file', file);
    try{ const res = await api.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } }); setUrl(res.data.data.url); setMsg('Uploaded!'); }
    catch(e){ setMsg(e.response?.data?.message || 'Upload failed'); }
  };

  return (
    <section className="space-y-4">
      <Typography variant="h5">Upload tester</Typography>
      <Paper className="p-4 space-y-3">
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <Button variant="contained" onClick={submit}>Upload</Button>
        <Typography color={msg.includes('fail') ? 'error' : 'success'}>{msg}</Typography>
        {url && <p>URL: <a href={`${process.env.NEXT_PUBLIC_API_URL}${url}`} target="_blank" rel="noreferrer">{url}</a></p>}
      </Paper>
    </section>
  );
}
