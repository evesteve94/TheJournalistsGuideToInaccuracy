import express from "express";
import dotenv from "dotenv";
import { z } from 'zod';
import { openai } from "@ai-sdk/openai"
import { streamObject } from "ai";
import prisma from "./db/prisma.js";

dotenv.config();

const app = express();
app.use(express.json());

const requestSchema = z.object({
  topic: z.string(),
  audience: z.string(),
  character: z.enum(["Marvin", "Arthur", "Zaphod"]),
  length: z.enum(["short", "medium", "long"]),
});

const responseSchema = z.object({
  title: z.string(),
  content: z.string(),
});

app.post("/generate-content", async (req, res) => {
  try {
    // Parse and validate the request body
    const { topic, audience, character, length } = requestSchema.parse(req.body);

    // Define character-specific descriptions
    const characterDescriptions = {
      Marvin: `You are Marvin the Paranoid Android. You have a gloomy, sarcastic, and pessimistic tone, and you often feel like everything is pointless. You're highly intelligent, but utterly bored with everything.`,
      Arthur: `You are Arthur Dent. You are an ordinary human who is often confused by the bizarre and absurd universe around you. You maintain a polite but bewildered tone, always trying to make sense of things.`,
      Zaphod: `You are Zaphod Beeblebrox, the self-centered, two-headed, and flamboyant ex-President of the Galaxy. You have a wild, carefree, and egotistical tone, often speaking in exaggerated and grandiose terms.`,
    };

    // Construct the prompt using the selected character
    const prompt = `
      ${characterDescriptions[character]}
      Write an article about ${topic} for ${audience} in a ${length} length. 
      The response should include a title and content.
    `;

    // Initialize an empty object to accumulate the response
    let finalObject = { title: '', content: '' };


    // Generate the content using the Vercel AI SDK
    const { partialObjectStream } = await streamObject({
      model: openai("gpt-4o"),
      prompt: prompt,
      schema: responseSchema,
    });

    for await (const partialObject of partialObjectStream) {
      console.clear()
      console.log(partialObject)
      // Accumulate the response parts (title and content)
      if (partialObject.title) {
        finalObject.title = partialObject.title;
      }
      if (partialObject.content) {
        finalObject.content = partialObject.content;
      }
    }

    // Save the accumulated content to the database once stream is done
    const savedResponse = await prisma.response.create({
      data: {
        title: finalObject.title,
        content: finalObject.content,
        topic,
        audience,
        character,
        length,
      },
    });

    // Send the final response back to the client
    res.json('title: '+ savedResponse.title + ' \n contnent: '+savedResponse.content );
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).send("Something went wrong");
  }
});


const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
