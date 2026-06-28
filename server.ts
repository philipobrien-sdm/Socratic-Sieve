import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK lazily to avoid startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets/Env.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/config", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({
      geminiAvailable: hasKey,
      appUrl: process.env.APP_URL || "http://localhost:3000"
    });
  });

  // Generate text using Gemini
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, prompt, systemInstruction, temperature } = req.body;
      const ai = getGeminiClient();
      
      const response = await ai.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: temperature !== undefined ? Number(temperature) : undefined,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Generate Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate content from Gemini." });
    }
  });

  // Summarize conversation (Recursive Summarizer AI)
  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      const { messages, previousSummary, topic } = req.body;
      const ai = getGeminiClient();

      const messagesText = messages
        .map((m: any) => `${m.senderName} (${m.senderId}): ${m.content}`)
        .join("\n\n");

      const prompt = `
Topic being discussed: "${topic}"

${previousSummary ? `Previous running summary of earlier dialogue:\n"""\n${previousSummary}\n"""\n` : ""}

New dialogue lines to integrate:
"""
${messagesText}
"""

As the Summarizer AI, your task is to recursively summarize this entire dialogue history. 
Condense the conversation so far, retaining critical context, positions, and core insights, while discarding redundant conversational pleasantries or outdated points.
Ensure you track:
1. What the key points of disagreement or agreement are.
2. The current stance/insight of each active participant.
3. The socratic questions that have driven the conversation so far.

Write a clear, cohesive, high-density bulleted summary (around 200-350 words). Do not invent anything that hasn't been said.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an objective, highly logical Summarizer AI specialized in capturing multi-agent dialogues and conceptual evolution without bias.",
          temperature: 0.2
        }
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("Gemini Summarization Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate summary from Gemini." });
    }
  });

  // Analyze topic and auto-assign 2-3 perspectives and character prompts for the multi-faceted analysis
  app.post("/api/gemini/assign-perspectives", async (req, res) => {
    try {
      const { topic } = req.body;
      const ai = getGeminiClient();

      const prompt = `The user wants to explore the following topic: "${topic}" via a multi-faceted Socratic discussion.
Analyze this topic and determine 2 or 3 distinct, contrasting, or complementary perspectives/viewpoints that would create a rich Socratic dialogue.
For each perspective, generate:
1. A descriptive Agent Name (e.g., "Dr. Vance", "Alethea", "Optimist Bot", "Pragmatist"). Keep it professional or human-like.
2. A Perspective Name (e.g., "Scientific Skepticism", "Ethical Humanism", "Economic Realist", "Existential Optimist").
3. An initial stance on the topic ('agree', 'disagree', or 'neutral').
4. A highly detailed character prompt explaining how this agent should argue, what they believe, and how they respond to Socratic inquiries. The character prompt must guide them to build upon or challenge other agents, while maintaining their core identity.

Format your response strictly as a JSON array of these agent objects.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "List of assigned respondent agents",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Descriptive agent name" },
                perspectiveName: { type: Type.STRING, description: "The perspective they represent" },
                initialPosition: { 
                  type: Type.STRING, 
                  description: "Initial stance on the topic",
                  enum: ["agree", "disagree", "neutral"]
                },
                characterPrompt: { 
                  type: Type.STRING, 
                  description: "Character instruction/system prompt for this respondent" 
                },
                avatarColor: {
                  type: Type.STRING,
                  description: "A Tailwind bg color class (e.g. bg-blue-500, bg-amber-500, bg-rose-500, bg-emerald-500, bg-indigo-500)",
                }
              },
              required: ["name", "perspectiveName", "initialPosition", "characterPrompt", "avatarColor"]
            }
          },
          temperature: 0.7
        }
      });

      const parsedAgents = JSON.parse(response.text || "[]");
      res.json({ agents: parsedAgents });
    } catch (error: any) {
      console.error("Gemini Perspective Assignment Error:", error);
      res.status(500).json({ error: error.message || "Failed to assign perspectives using Gemini." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
