import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as MicrosoftStrategy } from "passport-microsoft";
import { envVars } from "../config/envVars.js";
import User from "../models/User.js";

async function findOrCreateOAuthUser({ provider, providerId, email, displayName }){
  const emailLc = (email || "").toLowerCase();
  let user = await User.findOne({ $or: [ { provider, providerId }, ...(emailLc ? [{ email: emailLc }] : []) ] });
  if (!user){
    user = new User({ email: emailLc || `${provider}_${providerId}@noemail.local`, username: displayName || `${provider}_${providerId}`, role: "user", provider, providerId });
    await user.save();
  } else {
    if (!user.provider || !user.providerId){ user.provider = provider; user.providerId = providerId; await user.save(); }
  }
  return user;
}

export function initPassport(){
  if (envVars.GOOGLE_CLIENT_ID && envVars.GOOGLE_CLIENT_SECRET){
    passport.use(new GoogleStrategy({
      clientID: envVars.GOOGLE_CLIENT_ID,
      clientSecret: envVars.GOOGLE_CLIENT_SECRET,
      callbackURL: envVars.GOOGLE_CALLBACK_URL
    }, async (_at, _rt, profile, done) => {
      try{ const email = profile.emails?.[0]?.value; const user = await findOrCreateOAuthUser({ provider: "google", providerId: profile.id, email, displayName: profile.displayName }); done(null, user);}catch(e){ done(e); }
    }));
  }
  if (envVars.MS_CLIENT_ID && envVars.MS_CLIENT_SECRET){
    passport.use(new MicrosoftStrategy({
      clientID: envVars.MS_CLIENT_ID,
      clientSecret: envVars.MS_CLIENT_SECRET,
      callbackURL: envVars.MS_CALLBACK_URL,
      scope: ["user.read"]
    }, async (_at, _rt, profile, done) => {
      try{
        const email = profile.emails?.[0]?.value || profile._json?.mail || profile._json?.userPrincipalName;
        const user = await findOrCreateOAuthUser({ provider: "microsoft", providerId: profile.id, email, displayName: profile.displayName });
        done(null, user);
      }catch(e){ done(e); }
    }));
  }
  return passport;
}
