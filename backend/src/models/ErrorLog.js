import mongoose from "mongoose";

const errorLogSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  level: { 
    type: String, 
    enum: ["error", "warn", "info", "debug"], 
    default: "error" 
  },
  message: { type: String, required: true },
  stack: { type: String },
  url: { type: String },
  method: { type: String },
  statusCode: { type: Number },
  userAgent: { type: String },
  ip: { type: String },
  requestId: { type: String },
  metadata: { type: Object },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
  tags: [{ type: String }],
}, { timestamps: true });

// Index for efficient querying
errorLogSchema.index({ createdAt: -1 });
errorLogSchema.index({ level: 1, createdAt: -1 });
errorLogSchema.index({ resolved: 1, createdAt: -1 });
errorLogSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model("ErrorLog", errorLogSchema);
