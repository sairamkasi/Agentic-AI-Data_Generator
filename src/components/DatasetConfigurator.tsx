import React, { useState } from 'react';
import { Plus, Trash, Wand2, Search, Link2, BookOpen, Layers } from 'lucide-react';
import { SchemaField, GenerateRequest } from '../types';

interface DatasetConfiguratorProps {
  onSubmit: (request: GenerateRequest) => void;
  isLoading: boolean;
}

const PRESETS = [
  {
    name: "Instruction Tuning (Code & Logic)",
    description: "Great for building instruction-following developer agents.",
    taskType: "Instruction Tuning",
    schema: [
      { fieldName: "instruction", fieldType: "string" as const, description: "A clean, natural language query or task instruction for the agent." },
      { fieldName: "code_snippet", fieldType: "string" as const, description: "The highly correct, structured code block solving the instruction." },
      { fieldName: "explanation", fieldType: "string" as const, description: "Detailed, step-by-step documentation explaining the logic." }
    ]
  },
  {
    name: "Question-Answering (RAG / Facts)",
    description: "Perfect for domain-specific context QA and documentation agents.",
    taskType: "Context Q&A",
    schema: [
      { fieldName: "context", fieldType: "string" as const, description: "The raw domain-specific factual passage or documentation segment." },
      { fieldName: "question", fieldType: "string" as const, description: "A realistic question researchers or end-users would ask based on the context." },
      { fieldName: "answer", fieldType: "string" as const, description: "The correct, factual response strictly referenced from the context." }
    ]
  },
  {
    name: "Classification & Labeling",
    description: "Ideal for training sentiment, categorization, and gatekeeper models.",
    taskType: "Classification",
    schema: [
      { fieldName: "text_passage", fieldType: "string" as const, description: "A snippet or sentence of real-world domain content." },
      { fieldName: "category_label", fieldType: "string" as const, description: "A highly specific, normalized classification label." },
      { fieldName: "confidence_rating", fieldType: "number" as const, description: "A confidence score (0.0 to 1.0) indicating label reliability." }
    ]
  }
];

export default function DatasetConfigurator({ onSubmit, isLoading }: DatasetConfiguratorProps) {
  const [domain, setDomain] = useState("Python programming language");
  const [taskType, setTaskType] = useState("Instruction Tuning");
  const [sourceType, setSourceType] = useState<'auto' | 'urls' | 'synthetic'>('auto');
  const [customUrls, setCustomUrls] = useState<string[]>([""]);
  const [quantity, setQuantity] = useState(15);
  const [schema, setSchema] = useState<SchemaField[]>([
    { fieldName: "instruction", fieldType: "string", description: "A clean, natural language query or task instruction for the agent." },
    { fieldName: "code_snippet", fieldType: "string", description: "The highly correct, structured code block solving the instruction." },
    { fieldName: "explanation", fieldType: "string", description: "Detailed, step-by-step documentation explaining the logic." }
  ]);

  const addSchemaField = () => {
    setSchema([...schema, { fieldName: `field_${schema.length + 1}`, fieldType: 'string', description: '' }]);
  };

  const removeSchemaField = (index: number) => {
    setSchema(schema.filter((_, i) => i !== index));
  };

  const updateSchemaField = (index: number, key: keyof SchemaField, value: any) => {
    const updated = [...schema];
    updated[index] = { ...updated[index], [key]: value };
    setSchema(updated);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setTaskType(preset.taskType);
    setSchema(preset.schema);
  };

  const addUrlField = () => {
    setCustomUrls([...customUrls, ""]);
  };

  const removeUrlField = (index: number) => {
    setCustomUrls(customUrls.filter((_, i) => i !== index));
  };

  const updateUrlField = (index: number, value: string) => {
    const updated = [...customUrls];
    updated[index] = value;
    setCustomUrls(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    // Filter empty URLs if sourceType is 'urls'
    const cleanUrls = sourceType === 'urls' ? customUrls.filter(u => u.trim().startsWith('http')) : [];

    onSubmit({
      domain: domain.trim(),
      taskType,
      schema: schema.filter(f => f.fieldName.trim() !== ""),
      sourceType,
      customUrls: cleanUrls,
      quantity
    });
  };

  return (
    <div id="dataset-configurator" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Wand2 className="w-6 h-6 text-emerald-400" />
        <div>
          <h2 className="text-xl font-sans font-medium text-white tracking-tight">Dataset Setup & Grounding</h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">Define your domain target, validation schema, and agent crawler specs</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Domain Selection */}
        <div>
          <label htmlFor="domain-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Target Domain or Topic
          </label>
          <input
            id="domain-input"
            type="text"
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all font-sans"
            placeholder="e.g. Python programming language, Cancer pathology notes, Fintech ledger errors"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>

        {/* Presets */}
        <div>
          <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Quick Schema Presets
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-left bg-slate-950/50 border border-slate-800/80 hover:border-emerald-600/50 hover:bg-slate-950 p-3 rounded-xl transition-all group"
              >
                <div className="text-xs font-medium text-slate-200 group-hover:text-emerald-400 font-sans">{p.name}</div>
                <div className="text-[11px] text-slate-400 font-sans mt-1 leading-normal">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Task Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-type-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Model Training Target / Task Type
            </label>
            <input
              id="task-type-input"
              type="text"
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-all font-sans"
              placeholder="e.g. Instruction Tuning, Classification, Q&A"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="quantity-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Dataset Size (Target Quantity)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="quantity-input"
                type="range"
                min="5"
                max="100"
                step="5"
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
              <span className="text-sm font-mono text-emerald-400 font-bold bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg min-w-[55px] text-center">
                {quantity}
              </span>
            </div>
          </div>
        </div>

        {/* Data Sourcing Engine */}
        <div>
          <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Data Crawler & Grounding Sourcing
          </span>
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-3">
            <button
              type="button"
              onClick={() => setSourceType('auto')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                sourceType === 'auto'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Auto Web Search
            </button>
            <button
              type="button"
              onClick={() => setSourceType('urls')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                sourceType === 'urls'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Target URLs
            </button>
            <button
              type="button"
              onClick={() => setSourceType('synthetic')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                sourceType === 'synthetic'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Pure Synthetic
            </button>
          </div>

          {sourceType === 'auto' && (
            <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg text-[11px] text-emerald-400 font-sans leading-relaxed flex items-start gap-2">
              <Search className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Agentic Discovery:</strong> The AI agent will execute deep web searches using Gemini's search grounding, scrape clean reference pages related to the topic, and formulate high-fidelity training pairs from authenticated sources.
              </span>
            </div>
          )}

          {sourceType === 'urls' && (
            <div className="space-y-2">
              <span className="block text-[11px] text-slate-400 font-sans mb-1">
                Enter precise URLs (e.g. documentation, reference sites) for the crawler agent to parse:
              </span>
              {customUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.python.org/3/tutorial/..."
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                    value={url}
                    onChange={(e) => updateUrlField(index, e.target.value)}
                  />
                  {customUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrlField(index)}
                      className="p-2 bg-slate-950 border border-slate-800 hover:bg-rose-950/50 hover:border-rose-900/50 text-rose-400 rounded-lg transition-all"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addUrlField}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add URL Target
              </button>
            </div>
          )}

          {sourceType === 'synthetic' && (
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[11px] text-slate-400 font-sans leading-relaxed">
              <strong>Synthetic Expansion:</strong> Generates highly dense, logical, and diverse datasets directly from Gemini's expansive knowledge core. Excellent for bootstrap stages or unique logical scenarios.
            </div>
          )}
        </div>

        {/* Dynamic Schema builder */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Output Normalization Schema
            </span>
            <button
              type="button"
              onClick={addSchemaField}
              className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Field
            </button>
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80 max-h-[300px] overflow-y-auto">
            {schema.map((field, index) => (
              <div key={index} className="flex flex-col gap-2 p-3 bg-slate-900 rounded-lg border border-slate-800/80">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Field Name (e.g. instruction)"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 outline-none transition-all"
                    value={field.fieldName}
                    onChange={(e) => updateSchemaField(index, 'fieldName', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    required
                  />
                  <select
                    className="bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs text-white outline-none transition-all"
                    value={field.fieldType}
                    onChange={(e) => updateSchemaField(index, 'fieldType', e.target.value)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  {schema.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSchemaField(index)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-all"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Describe the target field constraints / guidelines..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none transition-all font-sans"
                  value={field.description}
                  onChange={(e) => updateSchemaField(index, 'description', e.target.value)}
                  required
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !domain.trim()}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-sans font-medium text-sm rounded-xl shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Spinning Crawler Agent...
            </>
          ) : (
            <>
              <Layers className="w-4 h-4" />
              Initiate Crawler & Dataset Normalizer
            </>
          )}
        </button>
      </form>
    </div>
  );
}
