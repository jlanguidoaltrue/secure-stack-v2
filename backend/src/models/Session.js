import mongoose from "mongoose";
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: true,
    },
    family: { type: String, index: true, required: true },
    currentId: { type: String, required: true },
    meta: { ip: String, userAgent: String, fpHash: String },
  },
  { timestamps: true }
);

export default mongoose.model("Session", sessionSchema);
