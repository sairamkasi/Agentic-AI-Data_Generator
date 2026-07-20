import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { Redis } from "@upstash/redis";
import { DatasetJob } from "./types.js";

const app = express();
app.use(express.json({ limit: '10mb' }));

// Setup Serverless State Storage via Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Correct production initialization for @google/genai v1.0.0+
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

function cleanJsonString(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  }
  return clean;
}

async function fetchCleanWebText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) return `[Failed to fetch URL: HTTP ${res.status}]`;
    const html = await res.text();
    let text = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
      .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '')
      .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
      .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '');
    text = text.replace(/<[^>]+>/g, ' ');
    text = text.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return text.replace(/\s+/g, ' ').trim().slice(0, 12000);
  } catch (err: any) {
    return `[Could not fetch URL due to error: ${err.message || err}]`;
  }
}

async function generateWithRetry(prompt: string, schema: any) {
  const MAX_RETRIES = 3;
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.85,
          systemInstruction: "You are a specialized agentic training data generator. Output perfectly structured training sets without any external conversational wrapper."
        }
      });
    } catch (err: any) {
      if (err.status === 503 || err.status === 429) {
        const delay = Math.pow(2, retry) * 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gemini unavailable after maximum retries.");
}

async function runAgentPipeline(jobId: string, job: DatasetJob) {
  try {
    let fetchedSourcesText = "";
    const activeSources = [...job.sources];

    if (job.sourceType === 'auto') {
      job.status = 'searching'; job.progress = 5;
      await redis.set(`job:${jobId}`, JSON.stringify(job));

      const searchQuery = `Find documentation, real examples, code snippets, reference papers, and tutorials about: "${job.domain}" for task type "${job.taskType}".`;
      try {
        const searchResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: searchQuery,
          config: {
            tools: [{ googleSearch: {} }] as any,
            systemInstruction: "You are an expert training data crawler. Discover high-quality real-world documentation, repositories, articles, or resources to create domain-specific models."
          },
        });
        const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          chunks.forEach((chunk) => {
            if (chunk.web?.uri) {
              const url = chunk.web.uri;
              const title = chunk.web.title || "Discovered Source";
              if (!activeSources.some(s => s.url === url)) activeSources.push({ url, title });
            }
          });
        }
      } catch (searchError) {
        console.error("Search Grounding Failed", searchError);
      }
    } else if (job.sourceType === 'urls') {
      job.customUrls.forEach((url, i) => activeSources.push({ url, title: `Custom Provided Link ${i + 1}` }));
    }

    job.sources = activeSources;

    if (activeSources.length > 0) {
      job.status = 'fetching'; job.progress = 15;
      await redis.set(`job:${jobId}`, JSON.stringify(job));

      for (let i = 0; i < activeSources.length; i++) {
        const src = activeSources[i];
        const rawText = await fetchCleanWebText(src.url);
        src.sourceTextLength = rawText.length;
        if (!rawText.startsWith("[") && rawText.length > 100) {
          fetchedSourcesText += `\n\n--- Source: ${src.title} (${src.url}) ---\n${rawText}\n`;
        }
        job.progress = 15 + Math.floor((i / activeSources.length) * 15);
        await redis.set(`job:${jobId}`, JSON.stringify(job));
      }
    }

    job.status = 'normalizing'; job.progress = 30;
    await redis.set(`job:${jobId}`, JSON.stringify(job));

    const propertiesObj: Record<string, any> = {};
    job.schema.forEach((field) => {
      propertiesObj[field.fieldName] = {
        type: field.fieldType === 'number' ? Type.NUMBER : field.fieldType === 'boolean' ? Type.BOOLEAN : Type.STRING,
        description: field.description
      };
    });

    const geminiResponseSchema = {
      type: Type.OBJECT,
      properties: {
        entries: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: propertiesObj,
            required: job.schema.map(f => f.fieldName)
          }
        }
      },
      required: ["entries"]
    };

    const batchSize = 5; 
    const totalBatches = Math.ceil(job.quantity / batchSize);
    const generatedData: any[] = [];

    for (let batch = 1; batch <= totalBatches; batch++) {
      const currentBatchQty = Math.min(batchSize, job.quantity - generatedData.length);
      if (currentBatchQty <= 0) break;

      const prompt = `
        You are a dataset engineer. Domain: "${job.domain}". Task Type: "${job.taskType}".
        Generate exactly ${currentBatchQty} valid training entries matching schema layout rules.
        ${fetchedSourcesText ? `Reference Context:\n${fetchedSourcesText.slice(0, 25000)}` : ''}
        Ensure strict JSON layout alignment. Do not truncate.
      `;

      try {
        const generationResponse = await generateWithRetry(prompt, geminiResponseSchema);
        const rawResult = generationResponse.text;
        if (rawResult) {
          const parsedResult = JSON.parse(cleanJsonString(rawResult));
          if (parsedResult.entries && Array.isArray(parsedResult.entries)) {
            parsedResult.entries.forEach((entry: any) => {
              const cleanedEntry: Record<string, any> = {};
              job.schema.forEach((f) => {
                let val = entry[f.fieldName];
                if (val === undefined || val === null) val = f.fieldType === 'number' ? 0 : f.fieldType === 'boolean' ? false : "";
                cleanedEntry[f.fieldName] = f.fieldType === 'number' ? Number(val) : f.fieldType === 'boolean' ? Boolean(val) : String(val);
              });
              generatedData.push(cleanedEntry);
            });
            job.data = generatedData;
            job.progress = 30 + Math.floor((generatedData.length / job.quantity) * 70);
            await redis.set(`job:${jobId}`, JSON.stringify(job));
          }
        }
      } catch (e) {
        console.error(`Error in batch ${batch}`, e);
      }
    }

    job.status = 'completed';
    job.progress = 100;
    await redis.set(`job:${jobId}`, JSON.stringify(job));
  } catch (err: any) {
    job.status = 'failed';
    job.error = err.message || "Execution exception occurred inside pipeline layout.";
    await redis.set(`job:${jobId}`, JSON.stringify(job));
  }
}

app.get("/api/jobs", async (req, res) => {
  try {
    const keys = await redis.keys("job:*");
    if (!keys || keys.length === 0) return res.json([]);
    const jobsData = await redis.mget(...keys);
    const sortedJobs = (jobsData.filter(Boolean) as string[])
      .map(item => JSON.parse(item) as DatasetJob)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sortedJobs);
  } catch (err) {
    res.status(500).json({ error: "Failed to read database pipeline state." });
  }
});

app.post("/api/jobs", async (req, res) => {
  const { domain, taskType, schema, sourceType, customUrls, quantity } = req.body;
  if (!domain || !taskType || !schema || !Array.isArray(schema) || schema.length === 0) {
    return res.status(400).json({ error: "Missing properties validation constraints." });
  }

  const newJob: DatasetJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    domain, taskType, schema, sourceType,
    customUrls: customUrls || [],
    quantity: Math.min(30, Math.max(1, Number(quantity) || 5)), 
    status: 'pending', progress: 0, sources: [], data: [], createdAt: new Date().toISOString()
  };

  await redis.set(`job:${newJob.id}`, JSON.stringify(newJob));
  
  runAgentPipeline(newJob.id, newJob);

  res.status(201).json(newJob);
});

app.delete("/api/jobs/:id", async (req, res) => {
  await redis.del(`job:${req.params.id}`);
  res.json({ success: true });
});

app.use((err: any, req: any, res: any, next: any) => {
  res.status(500).json({ error: err.message || "Internal App Crash Control Block Tracker Handler Encountered." });
});

export default app;