"use client";

import { useEffect, useState } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function MfaSetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState(0);

  // TOTP enroll
  const [enroll, setEnroll] = useState(null); // { qrDataUrl, secret, backupCodes }
  const [totpCode, setTotpCode] = useState("");

  // Email/SMS enroll
  const [channel, setChannel] = useState("email");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tempEmail, setTempEmail] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile/me");
      const user = res.data.data;
      setProfile(user);
      // Initialize temp values with current values
      setTempEmail(user.email || "");
      setTempPhone(user.phone || "");
      if (user.mfaEnabled) {
        // Already has MFA, go to dashboard
        router.replace("/dashboard");
      }
    } catch (e) {
      if (e.response?.status !== 428) {
        // Ignore MFA required errors
        console.error("Failed to load profile:", e);
        router.replace("/login");
      }
    }
  };

  useEffect(() => {
    // Read user data from login and load full profile
    try {
      const userData = sessionStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        setProfile(user);
        loadProfile(); // Load full profile data
      } else {
        router.replace("/login");
      }
    } catch (e) {
      router.replace("/login");
    }
  }, [router]);

  // cooldown timer for resend
  useEffect(() => {
    if (!secondsLeft) return;
    const t = setInterval(
      () => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [secondsLeft]);

  const startTotpEnroll = async () => {
    try {
      const res = await api.post("/auth/mfa/enroll", { type: "totp" });
      const { secret, qrDataUrl, backupCodes } = res.data.data;
      setEnroll({ secret: secret.base32, qrDataUrl, backupCodes });
      toast.success("Scan the QR and enter your 6-digit code to verify.");
    } catch (e) {
      toast.error(
        e.response?.data?.message || "Failed to start TOTP enrollment"
      );
    }
  };

  const verifyTotpEnroll = async () => {
    try {
      await api.post("/auth/mfa/verify", { token: totpCode });
      toast.success("TOTP enabled!");
      setEnroll(null);
      setTotpCode("");
      // refresh profile
      const me = await api.get("/profile/me");
      setProfile(me.data.data);
      router.replace("/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid code");
    }
  };

  const sendOtp = async () => {
    try {
      setSending(true);
      await api.post("/auth/mfa/otp/send", { method: channel });
      toast.success(`Code sent via ${channel}`);
      setSecondsLeft(60);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const verifyOtpEnroll = async () => {
    try {
      await api.post("/auth/mfa/otp/verify", { code: otp });
      toast.success(`${channel.toUpperCase()} MFA enabled!`);
      setOtp("");
      const me = await api.get("/profile/me");
      setProfile(me.data.data);
      // Add redirect to dashboard
      router.replace("/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.message || "Invalid or expired code");
    }
  };

  const disableMfa = async () => {
    try {
      await api.post("/auth/mfa/disable");
      toast.success("MFA disabled.");
      const me = await api.get("/profile/me");
      setProfile(me.data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to disable MFA");
    }
  };

  return (
    <Paper className="p-6 max-w-2xl">
      <Typography variant="h5" className="mb-1">
        Secure your account
      </Typography>
      <Typography color="text.secondary" className="mb-4">
        Add a second step to your sign in. Choose an authenticator app or
        receive one-time codes.
      </Typography>

      {profile?.mfaEnabled ? (
        <Box className="mb-4">
          <Typography color="success.main">
            MFA is currently enabled ({profile.mfaMethod}).
          </Typography>
          <Button
            color="error"
            variant="outlined"
            onClick={disableMfa}
            sx={{ mt: 1 }}
          >
            Disable MFA
          </Button>
        </Box>
      ) : (
        <Typography color="warning.main" className="mb-2">
          MFA is not enabled yet. Pick a method below.
        </Typography>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Authenticator app (TOTP)" />
        <Tab label="One-time PIN (Email/SMS)" />
      </Tabs>

      {/* TOTP ENROLL */}
      {tab === 0 && (
        <Stack spacing={2}>
          {!enroll ? (
            <Button variant="outlined" onClick={startTotpEnroll}>
              Generate QR & Secret
            </Button>
          ) : (
            <Stack spacing={2}>
              <Typography>
                Scan this in Google Authenticator / 1Password / Authy.
              </Typography>
              <img
                src={enroll.qrDataUrl}
                alt="TOTP QR"
                style={{ width: 180, height: 180 }}
              />
              <Typography fontFamily="monospace">
                Secret: {enroll.secret}
              </Typography>

              {enroll.backupCodes?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">
                    Backup codes (store safely):
                  </Typography>
                  <pre className="p-2 rounded bg-gray-100">
                    {enroll.backupCodes.join("\n")}
                  </pre>
                </Box>
              )}

              <TextField
                label="6-digit code"
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 6,
                }}
              />
              <Button
                variant="contained"
                onClick={verifyTotpEnroll}
                disabled={totpCode.length !== 6}
              >
                Verify & Enable
              </Button>
            </Stack>
          )}
        </Stack>
      )}

      {/* EMAIL/SMS ENROLL */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Typography color="info.main" className="mb-2">
            You can update your contact information below before enabling MFA
          </Typography>

          {/* Contact Info Update Section */}
          <div className="flex gap-2 items-end">
            <TextField
              className="flex-1"
              label="Email Address"
              value={tempEmail || profile?.email || ""}
              error={!!emailError}
              helperText={emailError || ""}
              onChange={(e) => {
                const email = e.target.value;
                setTempEmail(email);
                if (!email) {
                  setEmailError("Email is required");
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  setEmailError("Invalid email format");
                } else {
                  setEmailError("");
                }
              }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!!emailError || tempEmail === profile?.email}
              onClick={async () => {
                try {
                  await api.patch("/profile/me", { email: tempEmail });
                  await loadProfile(); // Reload full profile
                  toast.success("Email updated");
                } catch (err) {
                  if (err.response?.status === 428) {
                    // Ignore MFA required error and check if update succeeded
                    await loadProfile();
                  } else {
                    toast.error(
                      err.response?.data?.message || "Failed to update email"
                    );
                  }
                }
              }}
            >
              Save Email
            </Button>
          </div>

          <div className="flex gap-2 items-end">
            <TextField
              className="flex-1"
              label="Phone Number (with country code)"
              value={tempPhone || profile?.phone || ""}
              error={!!phoneError}
              helperText={phoneError || "Include country code, e.g. +1 for USA"}
              onChange={(e) => {
                const phone = e.target.value;
                setTempPhone(phone);
                if (!phone) {
                  setPhoneError(
                    "Phone number is required for SMS verification"
                  );
                } else if (!/^\+?[\d\s-()]+$/.test(phone)) {
                  setPhoneError(
                    "Invalid phone format. Must include country code (+)"
                  );
                } else {
                  setPhoneError("");
                }
              }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!!phoneError || tempPhone === profile?.phone}
              onClick={async () => {
                try {
                  await api.patch("/profile/me", { phone: tempPhone });
                  await loadProfile(); // Reload full profile
                  toast.success("Phone number updated");
                } catch (err) {
                  if (err.response?.status === 428) {
                    // Ignore MFA required error and check if update succeeded
                    await loadProfile();
                  } else {
                    toast.error(
                      err.response?.data?.message || "Failed to update phone"
                    );
                  }
                }
              }}
            >
              Save Phone
            </Button>
          </div>

          <FormControl>
            <InputLabel id="ch-lbl">Verification Method</InputLabel>
            <Select
              labelId="ch-lbl"
              label="Verification Method"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <MenuItem value="email">
                Email {profile?.email ? `(${profile.email})` : "(not set)"}
              </MenuItem>
              <MenuItem value="sms">
                SMS {profile?.phone ? `(${profile.phone})` : "(not set)"}
              </MenuItem>
            </Select>
          </FormControl>

          <div className="flex gap-2">
            <Button
              onClick={sendOtp}
              variant="outlined"
              disabled={
                sending ||
                secondsLeft > 0 ||
                (channel === "email" && (!!emailError || !profile?.email)) ||
                (channel === "sms" && (!!phoneError || !profile?.phone))
              }
            >
              {secondsLeft
                ? `Resend in ${secondsLeft}s`
                : `Send code via ${channel}`}
            </Button>
          </div>

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
            onClick={verifyOtpEnroll}
            disabled={otp.length !== 6}
          >
            Verify & Enable
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
