import express from "express";
import dotenv from "dotenv";
import { z } from "zod";
import OpenAI from "openai"; // Use OpenAI SDK here
import prisma from "./db/prisma.js";
import cors from "cors";
import articleRouter from "./routes/articleRouter.js";
import imageRouter from "./routes/generateImageRouter.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5174",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Use the article router
app.use("/articles", articleRouter);
app.use("/images", imageRouter);

// Start the server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
