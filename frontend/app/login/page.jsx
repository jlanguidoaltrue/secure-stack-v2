"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api.js";
import {
  Button,
  TextField,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setU] = useState("");
  const [password, setP] = useState("");
  const [mfaToken, setOtp] = useState("");
  const [backupCode, setBackup] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false); // <-- lock
  const controllerRef = useRef(null); // optional: abort previous try

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) router.push("/");
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return; // <-- ignore extra clicks/enters
    setSubmitting(true);

    // abort any previous attempt (belt & suspenders)
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    setMsg("");
    try {
      const res = await api.post(
        "/auth/login",
        { usernameOrEmail, password, mfaToken, backupCode },
        { signal: controllerRef.current.signal }
      );
      const { accessToken, refreshToken } = res.data.data.tokens;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      window.dispatchEvent(new Event("auth:changed"));
      toast.success("Successfully logged in!");
      setMsg("Logged in!");
      router.push("/");
    } catch (e) {
      const errorMsg =
        e.response?.data?.message ||
        (e.name === "CanceledError" ? "Canceled" : "Login failed");
      toast.error(errorMsg);
      setMsg(errorMsg);
    } finally {
      controllerRef.current = null;
      setSubmitting(false);
    }
  };

  const oauth = (provider) => {
    if (submitting) return; // optional: also lock OAuth buttons
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/social/${provider}`;
  };

  const triggerTestError = () => {
    throw new Error("Test error triggered for testing purposes");
  };

  const forgotPassword = async () => {
    if (!usernameOrEmail)
      return toast.error("Please enter your email address first");
    try {
      await api.post("/auth/forgot", { email: usernameOrEmail });
      toast.success("Password reset email sent! Check your inbox.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send reset email");
    }
  };

  return (
    <Paper className="p-6 max-w-md">
      <Typography variant="h5" className="mb-4">
        Login
      </Typography>
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if (submitting && e.key === "Enter") e.preventDefault();
        }}
      >
        <Stack spacing={2}>
          <TextField
            label="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setU(e.target.value)}
            fullWidth
            disabled={submitting}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            fullWidth
            disabled={submitting}
          />
          <TextField
            label="TOTP (if enabled)"
            value={mfaToken}
            onChange={(e) => setOtp(e.target.value)}
            fullWidth
            disabled={submitting}
          />
          <TextField
            label="Backup code (optional)"
            value={backupCode}
            onChange={(e) => setBackup(e.target.value)}
            fullWidth
            disabled={submitting}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <CircularProgress size={18} sx={{ mr: 1 }} /> Signing in…
              </>
            ) : (
              "Login"
            )}
          </Button>
          <Typography color={msg.includes("fail") ? "error" : "success"}>
            {msg}
          </Typography>

          <div className="flex gap-2">
            <Button
              variant="text"
              onClick={forgotPassword}
              size="small"
              disabled={submitting}
            >
              Forgot Password?
            </Button>
            <Button
              variant="text"
              onClick={triggerTestError}
              size="small"
              color="error"
              disabled={submitting}
            >
              Test Error
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outlined"
              onClick={() => oauth("google")}
              disabled={submitting}
            >
              Continue with Google
            </Button>
            <Button
              variant="outlined"
              onClick={() => oauth("microsoft")}
              disabled={submitting}
            >
              Microsoft
            </Button>
          </div>
        </Stack>
      </form>
    </Paper>
  );
}
