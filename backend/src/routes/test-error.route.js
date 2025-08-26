import express from "express";
import AppError from "../utils/AppError.js";

const router = express.Router();

// Test error endpoints for debugging
router.get("/500", (req, res, next) => {
  next(new AppError("Test 500 error for debugging", 500));
});

router.get("/404", (req, res, next) => {
  next(new AppError("Test 404 error for debugging", 404));
});

router.get("/cors", (req, res, next) => {
  next(new AppError("Test CORS error for debugging", 403));
});

router.get("/uncaught", (req, res, next) => {
  // This will trigger an uncaught exception
  throw new Error("Test uncaught exception for debugging");
});

router.get("/rejection", (req, res, next) => {
  // This will trigger an unhandled promise rejection
  Promise.reject(new Error("Test unhandled rejection for debugging"));
  res.json({ message: "This should not be reached" });
});

export default router;
