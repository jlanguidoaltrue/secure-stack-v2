import mongoose from "mongoose";
const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  resource: { type: String },
  meta: { type: Object },
  ip: String,
  userAgent: String,
}, { timestamps: true });
export default mongoose.model("AuditLog", schema);
