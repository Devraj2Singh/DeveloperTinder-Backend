import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user.js";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config(); // MUST be at top

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// ROUTES BEFORE SERVER START
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 7000; // FIXED (capital PORT)

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL); // FIXED (capital MONGO_URL)
    console.log("Database Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Error connecting DB:", error.message);
  }
};

startServer();
