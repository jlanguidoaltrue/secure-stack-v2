import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    originalName: String,
    url: String,
    path: String, 
    size: Number,
    mimetype: String,
  },
  { timestamps: true }
);

export default mongoose.model("UploadFile", schema);
