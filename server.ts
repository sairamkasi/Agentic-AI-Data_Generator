import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { DatasetJob, SchemaField } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
if (!fs.existsSync(JOBS_FILE)) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify([], null, 2));
}

// Read jobs helper
function readJobs(): DatasetJob[] {
  try {
    const data = fs.readFileSync(JOBS_FILE, "utf-8");
    return JSON.parse(data) as DatasetJob[];
  } catch (e) {
    return [];
  }
}

// Write jobs helper
function writeJobs(jobs: DatasetJob[]) {
  try {
    fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
  } catch (e) {
    console.error("Failed to write jobs.json", e);
  }
}

// Update single job helper
function updateJobState(jobId: string, updates: Partial<DatasetJob>) {
  const jobs = readJobs();
  const index = jobs.findIndex(j => j.id === jobId);
  if (index !== -1) {
    jobs[index] = { ...jobs[index], ...updates };
    writeJobs(jobs);
  }
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Clean fetch URL utility
async function fetchCleanWebText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return `[Failed to fetch URL: HTTP ${res.status}]`;
    const html = await res.text();

    // Strip scripts, styles, visual layouts, svg, etc.
    let text = html
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
      .replace(/<header[^>]*>([\s\S]*?)<\/header>/gi, '')
      .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
      .replace(/<svg[^>]*>([\s\S]*?)<\/svg>/gi, '');

    // Strip HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode html entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Compress whitespaces
    text = text.replace(/\s+/g, ' ').trim();

    return text.slice(0, 15000); // Top 15k characters for rich context
  } catch (err: any) {
    return `[Could not fetch URL due to error: ${err.message || err}]`;
  }
}

async function generateWithRetry(prompt: string, schema: any) {
    const MAX_RETRIES = 5;

    for (let retry = 0; retry < MAX_RETRIES; retry++) {

        try {

            return await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.85,
                    systemInstruction:
                        "You are a specialized agentic training data generator."
                }
            });

        } catch (err: any) {

            if (err.status === 503) {

                const delay = Math.pow(2, retry) * 2000;

                console.log(
                    `Gemini busy...Retry ${retry + 1}/${MAX_RETRIES} in ${delay / 1000}s`
                );

                await new Promise(resolve => setTimeout(resolve, delay));

                continue;
            }

            throw err;
        }
    }

    throw new Error("Gemini unavailable after maximum retries.");
}

// Background Worker for Agentic Pipeline
async function runAgentPipeline(jobId: string) {
  const jobs = readJobs();
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;

  try {
    // ---- STEP 1: WEB SEARCH & DISCOVERY ----
    let fetchedSourcesText = "";
    const activeSources = [...job.sources];

    if (job.sourceType === 'auto') {
      updateJobState(jobId, { status: 'searching', progress: 5 });

      const searchQuery = `Find documentation, real examples, code snippets, reference papers, and tutorials about: "${job.domain}" for task type "${job.taskType}".`;
      console.log(`[Job ${jobId}] Grounding search with query: ${searchQuery}`);

      try {
        const searchResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: searchQuery,
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "You are an expert training data crawler. Discover high-quality real-world documentation, repositories, articles, or resources to create domain-specific models."
          },
        });

        const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
          chunks.forEach((chunk) => {
            if (chunk.web?.uri) {
              const url = chunk.web.uri;
              const title = chunk.web.title || "Discovered Source";
              if (!activeSources.some(s => s.url === url)) {
                activeSources.push({ url, title });
              }
            }
          });
        }
      } catch (searchError) {
        console.error("Search Grounding Failed, falling back to fully synthetic extraction context", searchError);
      }
    } else if (job.sourceType === 'urls') {
      job.customUrls.forEach((url, i) => {
        activeSources.push({ url, title: `Custom Provided Link ${i + 1}` });
      });
    }

    updateJobState(jobId, { sources: activeSources });

    // ---- STEP 2: SOURCE FETCHING & SCRAPING ----
    if (activeSources.length > 0) {
      updateJobState(jobId, { status: 'fetching', progress: 15 });
      console.log(`[Job ${jobId}] Scraping and parsing ${activeSources.length} resources...`);

      const loadedSources: typeof activeSources = [];

      for (let i = 0; i < activeSources.length; i++) {
        const src = activeSources[i];
        const rawText = await fetchCleanWebText(src.url);
        
        src.sourceTextLength = rawText.length;
        if (!rawText.startsWith("[") && rawText.length > 100) {
          fetchedSourcesText += `\n\n--- Source: ${src.title} (${src.url}) ---\n${rawText}\n`;
        }
        loadedSources.push(src);

        // Update progress through loading sources
        const fetchProgress = 15 + Math.floor((i / activeSources.length) * 15);
        updateJobState(jobId, { progress: fetchProgress, sources: loadedSources });
      }
    }

    // ---- STEP 3: DATA GENERATION AND NORMALIZATION ----
    updateJobState(jobId, { status: 'normalizing', progress: 30 });
    console.log(`[Job ${jobId}] Starting normalization and structuring...`);

    const schema = job.schema;
    const targetQty = job.quantity;
    const generatedData: any[] = [];

    // Dynamically build Gemini Response Schema based on custom researcher fields
    const propertiesObj: Record<string, any> = {};
    schema.forEach((field) => {
      let geminiType = Type.STRING;
      if (field.fieldType === 'number') {
        geminiType = Type.NUMBER;
      } else if (field.fieldType === 'boolean') {
        geminiType = Type.BOOLEAN;
      }
      propertiesObj[field.fieldName] = {
        type: geminiType,
        description: field.description
      };
    });

    const geminiResponseSchema = {
      type: Type.OBJECT,
      properties: {
        entries: {
          type: Type.ARRAY,
          description: "List of structured training instances extracted, normalized, and synthesized.",
          items: {
            type: Type.OBJECT,
            properties: propertiesObj,
            required: schema.map(f => f.fieldName)
          }
        }
      },
      required: ["entries"]
    };

    // Calculate batches (e.g. 10 items per batch to avoid prompt timeouts)
    const batchSize = Math.min(10, targetQty);
    const totalBatches = Math.ceil(targetQty / batchSize);

    for (let batch = 1; batch <= totalBatches; batch++) {
      const currentBatchQty = Math.min(batchSize, targetQty - generatedData.length);
      if (currentBatchQty <= 0) break;

      console.log(`[Job ${jobId}] Generating batch ${batch}/${totalBatches} with ${currentBatchQty} entries`);

      // Refined domain prompt instructions
      const prompt = `
        You are a highly capable dataset engineer training a state-of-the-art AI agent in the domain of: "${job.domain}".
        The task type is: "${job.taskType}".
        
        Generate exactly ${currentBatchQty} diverse, completely valid, high-quality, and robust training entries.
        Avoid repetitive ideas, duplicate contents, or placeholders. Make sure every entry is fully realized and highly professional.
        
        ${fetchedSourcesText ? `
        Strictly base your training data on facts, techniques, patterns, and code discovered in these external sources:
        === START REFERENCE DATA ===
        ${fetchedSourcesText.slice(0, 40000)}
        === END REFERENCE DATA ===
        ` : 'Since no external URL sources are supplied, generate highly accurate, state-of-the-art synthetic data to train the agent.'}

        Every entry in the 'entries' array must strictly match the following researcher schema requirements:
        ${schema.map(f => `- Field '${f.fieldName}' (${f.fieldType}): ${f.description}`).join('\n')}

        Ensure you strictly output valid JSON conforming exactly to the responseSchema constraint. Do not truncate the JSON.
      `;

      try {
        const generationResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: geminiResponseSchema,
            temperature: 0.85,
            systemInstruction: "You are a specialized agentic training data generator. Output perfectly structured training sets without any external conversational wrapper."
          }
        });

        const rawResult = generationResponse.text;
        if (rawResult) {
          const parsedResult = JSON.parse(rawResult);
          if (parsedResult.entries && Array.isArray(parsedResult.entries)) {
            generatedData.push(...parsedResult.entries);
            
            // Normalize & validate the schema on the server side
            const cleanedData = generatedData.map((entry) => {
              const cleaned: Record<string, any> = {};
              schema.forEach((f) => {
                let val = entry[f.fieldName];
                if (val === undefined || val === null) {
                  // Fallbacks
                  if (f.fieldType === 'number') val = 0;
                  else if (f.fieldType === 'boolean') val = false;
                  else val = "";
                }
                // Coerce types to be absolutely certain
                if (f.fieldType === 'number') {
                  cleaned[f.fieldName] = Number(val) || 0;
                } else if (f.fieldType === 'boolean') {
                  cleaned[f.fieldName] = Boolean(val);
                } else {
                  cleaned[f.fieldName] = String(val);
                }
              });
              return cleaned;
            });

            const currentProgress = 30 + Math.floor((cleanedData.length / targetQty) * 70);
            updateJobState(jobId, {
              progress: Math.min(99, currentProgress),
              data: cleanedData
            });
          }
        }
      } catch (batchErr: any) {
        console.error(`[Job ${jobId}] Error in batch ${batch}`, batchErr);
        // We will retry once or continue to avoid failing the whole job if we already have partial data
        if (generatedData.length === 0) {
          throw new Error(`Data generation failed at batch ${batch}: ${batchErr.message || batchErr}`);
        }
      }
    }

    // Wrap up job
    updateJobState(jobId, {
      status: 'completed',
      progress: 100
    });
    console.log(`[Job ${jobId}] Generation Completed Successfully!`);

  } catch (err: any) {
    console.error(`[Job ${jobId}] Pipeline failed`, err);
    updateJobState(jobId, {
      status: 'failed',
      error: err.message || "An unexpected error occurred during the agent generation loop."
    });
  }
}

// API Routes
app.get("/api/jobs", (req, res) => {
  res.json(readJobs());
});

app.post("/api/jobs", (req, res) => {
  const { domain, taskType, schema, sourceType, customUrls, quantity } = req.body;

  if (!domain || !taskType || !schema || !Array.isArray(schema) || schema.length === 0) {
    return res.status(400).json({ error: "Missing required parameters: domain, taskType, and non-empty schema array." });
  }

  const newJob: DatasetJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    domain,
    taskType,
    schema,
    sourceType,
    customUrls: customUrls || [],
    quantity: Math.min(200, Math.max(1, Number(quantity) || 10)), // safe range
    status: 'pending',
    progress: 0,
    sources: [],
    data: [],
    createdAt: new Date().toISOString()
  };

  const jobs = readJobs();
  jobs.unshift(newJob);
  writeJobs(jobs);

  // Trigger background job without blocking HTTP thread
  runAgentPipeline(newJob.id);

  res.status(201).json(newJob);
});

app.delete("/api/jobs/:id", (req, res) => {
  const { id } = req.params;
  const jobs = readJobs();
  const filtered = jobs.filter(j => j.id !== id);
  writeJobs(filtered);
  res.json({ success: true });
});

// Vite Setup
async function startServer() {
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
