import { connectDb } from "../config/db.js";
import User from "../models/User.js";

await connectDb();
const user = new User({ email: "admin@example.com", username: "admin", role: "superadmin" });
await user.setPassword("Password1!");
await user.save();
console.log("Seeded superadmin admin@example.com / Password1!");
process.exit(0);
