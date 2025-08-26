import express from "express";
import { envVars } from "../config/envVars.js";
import { sendMail } from "../utils/mailer.js";
const router = express.Router();
router.post("/", async (req, res) => {
  try{
    if (!envVars.CLIENT_ERROR_EMAIL) return res.status(204).end();
    const p = req.body || {};
    const subject = `[FE Error] ${p.message || "Error"}`;
    const html = `
      <h3>Frontend Error</h3>
      <p><b>URL:</b> ${p.url || ""}</p>
      <p><b>Component:</b> ${p.component || ""}</p>
      <p><b>User Agent:</b> ${p.userAgent || ""}</p>
      <pre>${(p.stack || "").replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))}</pre>
      <pre>${JSON.stringify(p.extra || {}, null, 2)}</pre>`;
    await sendMail({ to: envVars.CLIENT_ERROR_EMAIL, subject, html });
    res.json({ data: { emailed: true } });
  }catch(e){ res.status(200).json({ data: { emailed: false } }); }
});
export default router;
