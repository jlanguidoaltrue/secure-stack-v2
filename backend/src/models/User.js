import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fieldEncryption } from "mongoose-field-encryption";

const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  email: { type: String, required: true, lowercase: true, unique: true, index: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  role: { type: String, enum: ["superadmin","tenant_admin","manager","user"], default: "user" },
  isActive: { type: Boolean, default: true },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  mfaEnabled: { type: Boolean, default: false },
  mfaMethod: { type: String, enum: ["totp","sms","email",null], default: null },
  totpSecret: { type: String },
  backupCodes: [{ type: String }],
  provider: { type: String },
  providerId: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  bio: { type: String },
  avatarUrl: { type: String },
}, { timestamps: true });

userSchema.virtual("isLocked").get(function(){
  return this.lockUntil && this.lockUntil > new Date();
});

userSchema.methods.setPassword = async function(password){
  this.passwordHash = await bcrypt.hash(password, 10);
};

userSchema.methods.checkPassword = function(password){
  return bcrypt.compare(password, this.passwordHash || "");
};

userSchema.methods.getTotpSecret = function(){
  return this.totpSecret;
};

userSchema.plugin(fieldEncryption, {
  fields: ["totpSecret", "backupCodes"],
  secret: process.env.ENCRYPTION_KEY || "32_character_encryption_key__123456",
  saltGenerator: () => "1234567890123456"
});

export default mongoose.model("User", userSchema);
