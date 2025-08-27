"use client";

import { useState } from "react";
import { Paper, Typography, Button, TextField } from "@mui/material";
import api from "../lib/api.js";

export default function TOTP({ mfaEnabled = false, onChanged }) {
  const [msg, setMsg] = useState("");
  const [enroll, setEnroll] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [busy, setBusy] = useState(false);

  const startTotpEnroll = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await api.post("/auth/mfa/enroll", { type: "totp" });
      const { secret, qrDataUrl, backupCodes } = res.data.data;
      setEnroll({ secret: secret.base32, qrDataUrl, backupCodes });
    } catch (e) {
      setMsg(e.response?.data?.message || "Failed to start TOTP enrollment");
    } finally {
      setBusy(false);
    }
  };

  const verifyTotpEnroll = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post("/auth/mfa/verify", { token: verifyCode });
      setMsg("TOTP enabled!");
      setEnroll(null);
      setVerifyCode("");
      onChanged?.(); // ask parent to refresh profile
    } catch (e) {
      setMsg(e.response?.data?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await api.post("/auth/mfa/disable"); // make sure this backend route exists
      setMsg("TOTP disabled");
      setEnroll(null);
      setVerifyCode("");
      onChanged?.();
    } catch (e) {
      setMsg(e.response?.data?.message || "Failed to disable TOTP");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper className="p-4 space-y-3">
      <Typography variant="h6">Two-Factor Authentication (TOTP)</Typography>
      <Typography color={msg.includes("fail") ? "error" : "success"}>
        {msg}
      </Typography>

      {!mfaEnabled ? (
        <>
          {!enroll ? (
            <Button
              variant="outlined"
              onClick={startTotpEnroll}
              disabled={busy}
            >
              Enable TOTP
            </Button>
          ) : (
            <div className="space-y-3">
              <Typography>
                Scan this QR in Google Authenticator / Authy / Microsoft
                Authenticator, or enter the secret manually.
              </Typography>
              <img
                src={enroll.qrDataUrl}
                alt="TOTP QR"
                width={180}
                height={180}
              />
              <Typography fontFamily="monospace">
                Secret: {enroll.secret}
              </Typography>

              <TextField
                label="6-digit code"
                value={verifyCode}
                onChange={(e) =>
                  setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
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
                disabled={busy}
              >
                Verify & Enable
              </Button>

              {enroll.backupCodes?.length > 0 && (
                <div className="space-y-1">
                  <Typography variant="subtitle2">
                    Backup codes (store safely):
                  </Typography>
                  <pre className="p-2 rounded bg-gray-100">
                    {enroll.backupCodes.join("\n")}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <Typography color="success.main">TOTP is enabled.</Typography>
          <Button
            color="error"
            variant="outlined"
            onClick={disableTotp}
            disabled={busy}
          >
            Disable TOTP
          </Button>
        </>
      )}
    </Paper>
  );
}
