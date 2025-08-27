import { connectDb } from "../config/db.js";
import User from "../models/User.js";

async function seedUser() {
  try {
    await connectDb();

    // Check if user already exists
    const existingUser = await User.findOne({ email: "test5@example.com" });
    if (existingUser) {
      console.log("User already exists, skipping creation");
      process.exit(0);
    }

    const user = new User({
      email: "test5@example.com",
      username: "test5",
      role: "superadmin",
      isActive: true, // Make sure account is active
    });

    await user.setPassword("Admin123!");
    await user.save();
    console.log("Successfully seeded superadmin test1@example.com / Admin123!");
  } catch (error) {
    console.error("Seeding failed:", error);
  }
  process.exit(0);
}

seedUser();
