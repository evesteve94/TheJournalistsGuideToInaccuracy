import express, { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import upload from '../upload.js';
import multer from 'multer';
import OpenAI from "openai";
import prisma from '../db/prisma.js';
import axios from 'axios';
import dotenv from 'dotenv';
import streamifier from 'streamifier';
import {z} from 'zod';


dotenv.config();

const router = express.Router();

// Zod schemas for validation
const requestSchema = z.object({
  topic: z.string(),
  audience: z.string(),
  character: z.enum(["Marvin", "Arthur", "Zaphod"]),
  length: z.enum(["short", "medium", "long"]),
});

const responseSchema = z.object({
  title: z.string(),
  content: z.string(),
  imageURL: z.string(),
});

type RequestData = z.infer<typeof requestSchema>;
type ResponseData = z.infer<typeof responseSchema>;

// Initialize OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to download an image
const downloadImage = async (url: string): Promise<Buffer> => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return response.data;
};

// Function to generate content using OpenAI
const generateContent = async (requestData: RequestData): Promise<ResponseData> => {
  const { topic, audience, character, length } = requestData;

  // Character-specific descriptions
  const characterDescriptions = {
    Marvin: `You are Marvin the Paranoid Android. You have a gloomy, sarcastic, and pessimistic tone, and you often feel like everything is pointless. You're highly intelligent, but utterly bored with everything.`,
    Arthur: `You are Arthur Dent. You are an ordinary human who is often confused by the bizarre and absurd universe around you. You maintain a polite but bewildered tone, always trying to make sense of things.`,
    Zaphod: `You are Zaphod Beeblebrox, the self-centered, two-headed, and flamboyant ex-President of the Galaxy. You have a wild, carefree, and egotistical tone, often speaking in exaggerated and grandiose terms.`,
  };

  // Generate content using OpenAI's GPT-4 model with function calling
  const completion = await openai.chat.completions.create({
    model: "gpt-4o", // Make sure to use a valid model name
    messages: [
      { role: "system", content: characterDescriptions[character] },
      { role: "user", content: `Write an article about ${topic} for ${audience} in a ${length} length.` },
    ],
    functions: [
      {
        name: "generateArticle",
        description: "Generate an article with a title and content",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the article",
            },
            content: {
              type: "string",
              description: "The main content of the article",
            },
          },
          required: ["title", "content"],
        },
      },
    ],
    function_call: { name: "generateArticle" },
  });

  const functionCall = completion.choices[0].message.function_call;
  if (!functionCall) throw new Error("Unexpected response from OpenAI");

  const { title, content } = JSON.parse(functionCall.arguments);

  // Generate image with OpenAI's DALL-E
  const imageResponse = await openai.images.generate({
    model: "dall-e-3",
    prompt: `An image representing ${topic}`,
    n: 1,
    size: "1024x1024",
  });

  const imageUrl = imageResponse.data[0]?.url || '';
  
  return {
    title: title.trim(),
    content: content.trim(),
    imageURL: imageUrl, // Temporarily store the OpenAI image URL
  };
};

// Save the generated content to the database
const saveResponse = async (data: RequestData & ResponseData) => {
  try {
    const savedResponse = await prisma.response.create({
      data: {
        ...data,
        imageURL: data.imageURL,
      },
    });
    return savedResponse;
  } catch (error) {
    console.error("Error saving to the database:", error);
    throw new Error("Failed to save response");
  }
};

// Content generation route
router.post("/generate-content", upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Validate the request body using zod
    const requestData: RequestData = requestSchema.parse(req.body);

    // Generate article content
    const generatedContent = await generateContent(requestData);

    // Download the image from the URL (temporarily)
    const imageBuffer = await downloadImage(generatedContent.imageURL);

    // Save image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload_stream({ folder: 'article-images' }, async (error, result) => {
      if (error || !result) {
        throw new Error("Cloudinary upload failed");
      }

      // Replace the imageURL with the Cloudinary URL
      const finalResponseData: ResponseData = {
        ...generatedContent,
        imageURL: result.secure_url, // Store the Cloudinary URL
      };

      // Save content to the database
      const savedResponse = await saveResponse({ ...finalResponseData, ...requestData });

      // Send the response to the client
      res.json(savedResponse);
    });

    // Use Cloudinary uploader stream to handle the imageBuffer
    streamifier.createReadStream(imageBuffer).pipe(uploadResult);

  } catch (error) {
    console.error("Error generating or saving content:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});


// Read all articles
router.get("/", async (req, res) => {
  try {
    const articles = await prisma.response.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        character: true,
        topic: true,
        audience: true,
        length: true,
        createdAt: true, // Make sure this is included
        imageURL: true
      },
    });
    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Read a single article
router.get("/:id", async (req, res) => {
  try {
    const article = await prisma.response.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        content: true,
        character: true,
        topic: true,
        audience: true,
        length: true,
        createdAt: true, // Make sure this is included
        imageURL: true
      },
    });
    if (article) {
      res.json(article);
    } else {
      res.status(404).json({ error: "Article not found" });
    }
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Update an article
router.put("/:id", async (req, res) => {
  try {
    const updatedArticle = await prisma.response.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updatedArticle);
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Delete an article
router.delete("/:id", async (req, res) => {
  try {
    await prisma.response.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;