import React, { useState, useEffect } from "react";
import { DatasetJob, SchemaField } from "../api/types";
import { Plus, Trash2, Cpu, RefreshCw, Layers, Database, Globe, Download, AlertTriangle, Loader2 } from "lucide-react";

export default function App() {
  const [jobs, setJobs] = useState<DatasetJob[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [domain, setDomain] = useState("Python advanced decorators & metaprogramming");
  const [taskType, setTaskType] = useState("Instruction Tuning");
  const [quantity, setQuantity] = useState(10);
  const [sourceType, setSourceType] = useState<'auto' | 'urls' | 'none'>('auto');
  const [customUrls, setCustomUrls] = useState<string>("");
  const [schema, setSchema] = useState<SchemaField[]>([
    { fieldName: "instruction", fieldType: "string", description: "Complex user instruction asking for custom meta hooks." },
    { fieldName: "code_solution", fieldType: "string", description: "Executable Python code resolving the prompt using wrappers." },
    { fieldName: "is_valid_pattern", fieldType: "boolean", description: "Flags true if it avoids circular updates." }
  ]);

  // Temporary schema field additions
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<'string' | 'number' | 'boolean'>('string');
  const [newFieldDesc, setNewFieldDesc] = useState("");

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (Array.isArray(data)) setJobs(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 4000);
    return () => clearInterval(interval);
  }, []);

  const addSchemaField = () => {
    if (!newFieldName.trim()) return;
    setSchema([...schema, { fieldName: newFieldName.replace(/\s+/g, '_'), fieldType: newFieldType, description: newFieldDesc }]);
    setNewFieldName(""); setNewFieldDesc("");
  };

  const removeSchemaField = (idx: number) => {
    setSchema(schema.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain, taskType, quantity, sourceType,
          schema, customUrls: customUrls.split("\n").filter(u => u.trim().startsWith("http"))
        })
      });
      if (res.ok) fetchJobs();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const deleteJob = async (id: string) => {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    fetchJobs();
  };

  const downloadDataset = (job: DatasetJob) => {
    const blob = new Blob([JSON.stringify(job.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${job.domain.toLowerCase().replace(/[^a-z0-x0-9]/g, "_")}_dataset.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 p-6 font-sans">
      {/* Header Panel */}
      <header className="max-w-7xl mx-auto flex justify-between items-center pb-6 border-b border-gray-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-900/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Agentic Training Data Generator <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 ml-2 font-mono">v1.1</span></h1>
            <p className="text-xs text-gray-400">Structured Deep-Crawling Grounding Framework Engine Workspace</p>
          </div>
        </div>
        <button onClick={fetchJobs} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-sm hover:bg-gray-800 text-gray-300">
          <RefreshCw className="w-4 h-4" /> Sync Core Status
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Input Configuration Column */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-[#0f1626] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-md font-semibold mb-4 flex items-center gap-2 text-emerald-400 border-b border-gray-800 pb-2">
              <Layers className="w-4 h-4" /> Setup Configuration Specs
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Target Topic Domain</label>
                <input value={domain} onChange={e => setDomain(e.target.value)} className="w-full bg-[#070b12] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 text-gray-200" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Task Pipeline Structure</label>
                  <input value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full bg-[#070b12] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 text-gray-200" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Sample Vol Target Quantity</label>
                  <input type="number" min="1" max="100" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full bg-[#070b12] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 text-gray-200" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Source Crawling Discovery Option</label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value as any)} className="w-full bg-[#070b12] border border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 text-gray-200">
                  <option value="auto">Google Autonomous Search Discovery Grounding</option>
                  <option value="urls">Explicit Targeted Blueprint Url Seeds</option>
                  <option value="none">Pure Synthetic Generation Model</option>
                </select>
              </div>

              {sourceType === 'urls' && (
                <div>
                  <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Custom Target Seed URLs (One per line)</label>
                  <textarea rows={3} value={customUrls} onChange={e => setCustomUrls(e.target.value)} placeholder="[https://example.com/docs](https://example.com/docs)" className="w-full bg-[#070b12] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-600 text-gray-200" />
                </div>
              )}

              {/* Advanced Custom Schema Builder */}
              <div className="pt-2">
                <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">Target Data Structural Schema Fields</label>
                <div className="space-y-2 max-h-44 overflow-y-auto mb-3 pr-1">
                  {schema.map((f, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#070b12] border border-gray-800 px-3 py-2 rounded-lg text-xs">
                      <div>
                        <span className="font-mono text-emerald-400 font-semibold">{f.fieldName}</span> 
                        <span className="text-gray-500 ml-1">({f.fieldType})</span>
                        <p className="text-gray-400 text-[11px] truncate max-w-xs">{f.description}</p>
                      </div>
                      <button type="button" onClick={() => removeSchemaField(idx)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Insertion row */}
                <div className="bg-[#070b12] border border-gray-800 p-3 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="field_name" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="bg-[#0f1626] border border-gray-800 text-xs rounded px-2 py-1 text-gray-200" />
                    <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} className="bg-[#0f1626] border border-gray-800 text-xs rounded px-2 py-1 text-gray-200">
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="Field purpose summary rule..." value={newFieldDesc} onChange={e => setNewFieldDesc(e.target.value)} className="flex-1 bg-[#0f1626] border border-gray-800 text-xs rounded px-2 py-1 text-gray-200" />
                    <button type="button" onClick={addSchemaField} className="bg-gray-800 text-gray-200 text-xs px-2.5 rounded hover:bg-gray-700 flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Include
                    </button>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading || schema.length === 0} className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium rounded-xl text-sm transition shadow-lg flex justify-center items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Dispatch Generation Stream Pipeline
              </button>
            </form>
          </div>
        </section>

        {/* Right Job Pipelines List Column */}
        <section className="lg:col-span-7 space-y-4">
          <h2 className="text-md font-semibold tracking-wide text-gray-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" /> Monitored Real-time Generation Pools ({jobs.length})
          </h2>

          {jobs.length === 0 ? (
            <div className="text-center py-16 bg-[#0f1626] rounded-2xl border border-gray-800 text-gray-500 text-sm">
              No dataset pipelines launched yet. Use the setup config panel to dispatch your first model run state.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="bg-[#0f1626] border border-gray-800 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-md">
                
                {/* Status Top Banner Strip */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">{job.domain}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Pipeline Identity ID: <span className="font-mono text-gray-300 text-[11px]">{job.id}</span> • Architecture Type: {job.taskType}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                      job.status === 'completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      job.status === 'failed' ? 'bg-red-950 text-red-400 border border-red-900' :
                      'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse'
                    }`}>{job.status}</span>
                    <button onClick={() => deleteJob(job.id)} className="text-gray-500 hover:text-red-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Metric Status bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Pipeline Step: {job.status.toUpperCase()}</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-[#070b12] rounded-full h-2 overflow-hidden border border-gray-800">
                    <div className={`h-full transition-all duration-500 rounded-full ${job.status === 'failed' ? 'bg-red-600' : job.status === 'completed' ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${job.progress}%` }} />
                  </div>
                </div>

                {/* Sub logs metadata display metrics block */}
                <div className="bg-[#070b12] border border-gray-900 rounded-xl p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-gray-400">
                    <span>Discovered Context Sources Found:</span>
                    <span className="font-mono text-gray-200">{job.sources?.length || 0} tracks</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Generated Valid Matrix Records:</span>
                    <span className="font-mono text-emerald-400 font-bold">{job.data?.length || 0} / {job.quantity} instances</span>
                  </div>
                  {job.error && (
                    <div className="flex gap-1.5 items-start text-red-400 border-t border-red-950/50 pt-1.5 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-mono break-all">{job.error}</p>
                    </div>
                  )}
                </div>

                {/* Operational Execution actions bar row */}
                {job.status === 'completed' && job.data?.length > 0 && (
                  <div className="flex justify-end pt-1">
                    <button onClick={() => downloadDataset(job)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition">
                      <Download className="w-3.5 h-3.5" /> Export Structured Matrix Asset Dataset (.JSON)
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}