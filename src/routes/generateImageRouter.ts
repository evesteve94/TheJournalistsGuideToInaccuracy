import express from "express";
import OpenAI from "openai";

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/generate-image", async (req, res) => {
    const {prompt} = req.body;
  try {
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd"
    });

    const imageURL: string = imageResponse.data[0]?.url || "";
    const revisedPrompt = imageResponse.data[0]?.revised_prompt || "";

    res.json({imageURL, revisedPrompt});
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;