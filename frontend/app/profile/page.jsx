'use client';
import { useEffect, useState } from 'react';
import api from '../../lib/api.js';
import { Paper, Typography, TextField, Button, Stack, Avatar } from '@mui/material';

export default function ProfilePage(){
  const [profile, setProfile] = useState(null);
  const [msg, setMsg] = useState('');
  const [file, setFile] = useState(null);

  const load = async ()=>{
    try{ const res = await api.get('/profile/me'); setProfile(res.data.data); }
    catch(e){ setMsg(e.response?.data?.message || 'Failed to load profile'); }
  };
  useEffect(()=>{ load(); }, []);

  const save = async (e)=>{
    e.preventDefault();
    try{
      const patch = { firstName: e.currentTarget.firstName.value, lastName: e.currentTarget.lastName.value, bio: e.currentTarget.bio.value };
      const res = await api.patch('/profile/me', patch);
      setProfile(res.data.data);
      setMsg('Saved!');
    }catch(e){ setMsg(e.response?.data?.message || 'Save failed'); }
  };

  const upload = async ()=>{
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try{
      const res = await api.post('/profile/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(res.data.data.user);
      setMsg('Photo updated!');
    }catch(e){ setMsg(e.response?.data?.message || 'Upload failed'); }
  };

  return (
    <section className="space-y-4">
      <Typography variant="h5">Profile</Typography>
      <Typography color={msg.includes('fail') ? 'error' : 'success'}>{msg}</Typography>
      {profile && (
        <Paper className="p-4 space-y-4">
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar src={profile.avatarUrl ? `${process.env.NEXT_PUBLIC_API_URL}${profile.avatarUrl}` : undefined} sx={{ width: 80, height: 80 }} />
            <div className="space-y-2">
              <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
              <Button onClick={upload} variant="outlined">Upload Photo</Button>
            </div>
          </Stack>
          <form onSubmit={save}>
            <Stack spacing={2}>
              <TextField name="firstName" label="First name" defaultValue={profile.firstName || ''} />
              <TextField name="lastName" label="Last name" defaultValue={profile.lastName || ''} />
              <TextField name="bio" label="Bio" defaultValue={profile.bio || ''} multiline rows={3} />
              <Button type="submit" variant="contained">Save</Button>
            </Stack>
          </form>
        </Paper>
      )}
    </section>
  );
}
