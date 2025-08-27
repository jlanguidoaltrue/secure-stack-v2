'use client';
import { useEffect, useState } from 'react';
import api from '../../../lib/api.js';
import { Paper, Typography, TextField, Button, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, Stack } from '@mui/material';

export default function Users(){
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ email: '', username: '', password: '', role: 'user' });
  const [msg, setMsg] = useState('');

  const load = async ()=>{
    try{ const res = await api.get('/users'); setRows(res.data.data || []); setMsg(''); }
    catch(e){ setMsg(e.response?.data?.message || 'Failed loading users (need admin role?)'); }
  };

  useEffect(()=>{ load(); }, []);

  const create = async (e)=>{
    e.preventDefault(); setMsg('');
    try{ await api.post('/users', form); setForm({ email:'', username:'', password:'', role:'user' }); load(); }
    catch(e){ setMsg(e.response?.data?.message || 'Create failed'); }
  };

  const del = async (id)=>{ if (!confirm('Delete user?')) return; await api.delete(`/users/${id}`); load(); };

  return (
    <section className="space-y-4">
      <Typography variant="h5">Users</Typography>
      <Typography color={msg.includes('fail') ? 'error' : 'success'}>{msg}</Typography>

      <Paper className="p-4">
        <Typography variant="subtitle1" className="mb-2">Create user</Typography>
        <form onSubmit={create}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
            <TextField label="Username" value={form.username} onChange={e=>setForm({...form, username:e.target.value})}/>
            <TextField label="Password (optional)" value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
            <TextField select label="Role" value={form.role} onChange={e=>setForm({...form, role:e.target.value})} sx={{ minWidth: 160 }}>
              {["user","manager","tenant_admin","superadmin"].map(r=> <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <Button type="submit" variant="contained">Create</Button>
          </Stack>
        </form>
      </Paper>

      <Paper className="p-4">
        <Table size="small">
          <TableHead><TableRow><TableCell>Email</TableCell><TableCell>Username</TableCell><TableCell>Role</TableCell><TableCell>Active</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r._id}>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{String(r.isActive)}</TableCell>
                <TableCell><Button size="small" onClick={()=>del(r._id)}>Delete</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </section>
  );
}
