import express from "express";
import { envVars } from "../../config/envVars.js";
import { initPassport } from "../../passport/index.js";
import { issueTokens } from "../../services/auth.service.js";

const router = express.Router();
const passport = initPassport();

function redirectWithTokens(req, res){
  (async () => {
    const tokens = await issueTokens(req.user, { ip: req.ip, userAgent: req.get("User-Agent") || "" });
    const url = `${envVars.CLIENT_URL}/oauth-callback#accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
    res.redirect(url);
  })().catch(err => {
    console.error("OAuth post-login failed", err);
    res.redirect(`${envVars.CLIENT_URL}/oauth-callback#error=oauth_failed`);
  });
}

router.get("/google", passport.authenticate("google", { scope: ["profile","email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/api/auth/social/failed", session: false }), redirectWithTokens);
router.get("/microsoft", passport.authenticate("microsoft", { session: false }));
router.get("/microsoft/callback", passport.authenticate("microsoft", { failureRedirect: "/api/auth/social/failed", session: false }), redirectWithTokens);
router.get("/failed", (_req, res)=> res.status(401).json({ message: "OAuth failed" }));

export default router;
