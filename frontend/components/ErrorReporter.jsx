'use client';
import { useEffect } from 'react';
import api from '../lib/api.js';
export default function ErrorReporter(){
  useEffect(()=>{
    const send = (payload)=>{ try{ api.post('/logs/client-error', payload); }catch{} };
    const onError = (event)=> send({ message: event.message||'window.onerror', stack: event.error?.stack||'', url: location.href, userAgent: navigator.userAgent });
    const onRej = (event)=> { const err = event.reason; send({ message: err?.message||'unhandledrejection', stack: err?.stack||String(err), url: location.href, userAgent: navigator.userAgent }); };
    window.addEventListener('error', onError); window.addEventListener('unhandledrejection', onRej);
    return ()=>{ window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRej); };
  }, []);
  return null;
}
