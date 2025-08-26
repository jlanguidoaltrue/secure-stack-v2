import mongoose from "mongoose";
const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
}, { timestamps: true });
export default mongoose.model("Tenant", tenantSchema);
