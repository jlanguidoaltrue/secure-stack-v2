"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api.js";
import {
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import toast from "react-hot-toast";

export default function MFAPage() {
  const router = useRouter();
  const [creds, setCreds] = useState(null);
  const [tab, setTab] = useState(0);

  // TOTP
  const [totp, setTotp] = useState("");

  // Backup code
  const [backup, setBackup] = useState("");

  // One-time PIN (email/sms)
  const [channel, setChannel] = useState("email");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("mfaLogin");
    if (!raw) {
      toast.error("No pending login. Please sign in again.");
      router.replace("/login");
      return;
    }
    setCreds(JSON.parse(raw));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  // simple cooldown timer for "Resend"
  const startCooldown = (s = 60) => {
    setSecondsLeft(s);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitWith = async (payloadExtra) => {
    if (!creds) return;
    try {
      const res = await api.post("/auth/login", {
        usernameOrEmail: creds.usernameOrEmail,
        password: creds.password,
        ...payloadExtra,
      });
      const { accessToken, refreshToken } = res.data.data.tokens;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      sessionStorage.removeItem("mfaLogin");
      window.dispatchEvent(new Event("auth:changed"));
      toast.success("MFA success!");
      router.replace("/");
    } catch (e) {
      toast.error(e.response?.data?.message || "Verification failed");
    }
  };

  const sendOtp = async () => {
    if (!creds) return;
    setSending(true);
    try {
      await api.post("/auth/mfa/otp/send", {
        usernameOrEmail: creds.usernameOrEmail,
        method: channel, // 'email' | 'sms'
      });
      toast.success(`Code sent via ${channel}.`);
      startCooldown(60);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  if (!creds) return null;

  return (
    <Paper className="p-6 max-w-md">
      <Typography variant="h5" className="mb-4">
        Multi-Factor Authentication
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="App OTP" />
        <Tab label="Backup Code" />
        <Tab label="One-time PIN (Email / SMS)" />
      </Tabs>

      {/* TOTP */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Typography>
            Open your authenticator app and enter the 6-digit code.
          </Typography>
          <TextField
            label="TOTP"
            value={totp}
            onChange={(e) =>
              setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 6,
            }}
          />
          <Button
            variant="contained"
            onClick={() => submitWith({ mfaToken: totp })}
            disabled={!totp}
          >
            Verify
          </Button>
        </Stack>
      )}

      {/* Backup code */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Typography>
            Use one of your backup codes (it will be consumed).
          </Typography>
          <TextField
            label="Backup code"
            value={backup}
            onChange={(e) => setBackup(e.target.value.toUpperCase())}
          />
          <Button
            variant="contained"
            onClick={() => submitWith({ backupCode: backup })}
            disabled={!backup}
          >
            Verify
          </Button>
        </Stack>
      )}

      {/* One-time PIN */}
      {tab === 2 && (
        <Stack spacing={2}>
          <Typography>Receive a one-time code by email or SMS.</Typography>
          <FormControl>
            <InputLabel id="channel-lbl">Channel</InputLabel>
            <Select
              labelId="channel-lbl"
              label="Channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
            </Select>
          </FormControl>

          <Box className="flex gap-2">
            <Button
              onClick={sendOtp}
              disabled={sending || secondsLeft > 0}
              variant="outlined"
            >
              {secondsLeft > 0
                ? `Resend in ${secondsLeft}s`
                : `Send code via ${channel}`}
            </Button>
          </Box>

          <TextField
            label="Enter code"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputProps={{
              inputMode: "numeric",
              pattern: "[0-9]*",
              maxLength: 6,
            }}
          />
          <Button
            variant="contained"
            onClick={() => submitWith({ otp })}
            disabled={!otp}
          >
            Verify
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
