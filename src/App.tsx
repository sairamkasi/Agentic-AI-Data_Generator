import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Cpu, Database, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { DatasetJob, GenerateRequest } from './types';
import DatasetConfigurator from './components/DatasetConfigurator';
import DatasetWorkspace from './components/DatasetWorkspace';
import JobList from './components/JobList';

export default function App() {
  const [jobs, setJobs] = useState<DatasetJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      if (!res.ok) throw new Error('Failed to retrieve jobs history.');
      const data = await res.json();
      setJobs(data);
      
      // If there's no selected job, select the first completed or active one
      if (data.length > 0 && !selectedJobId) {
        setSelectedJobId(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server connection issue.');
    }
  }, [selectedJobId]);

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Smart Polling: Poll only when there is an active running job
  useEffect(() => {
    const hasActiveJob = jobs.some(j => 
      ['pending', 'searching', 'fetching', 'normalizing'].includes(j.status)
    );

    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 2500);

    return () => clearInterval(interval);
  }, [jobs, fetchJobs]);

  // Submit new dataset generation request
  const handleCreateDataset = async (request: GenerateRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit dataset task.');
      }

      const newJob = await res.json();
      setJobs(prev => [newJob, ...prev]);
      setSelectedJobId(newJob.id);
    } catch (err: any) {
      setError(err.message || 'An error occurred during task initiation.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a job
  const handleDeleteJob = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setJobs(prev => prev.filter(j => j.id !== id));
        if (selectedJobId === id) {
          setSelectedJobId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete dataset job', err);
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Premium Header */}
      <header className="print:hidden bg-slate-900 border-b border-slate-800 py-4 px-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-900/50 rounded-xl">
              <Cpu className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-sans font-medium text-white tracking-tight">Agentic Training Data Generator</h1>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700">v1.1</span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                AI researchers' gateway to custom structured crawling, grounding, and domain-targeted datasets
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchJobs}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"
              title="Refresh job registry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-sans bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Storage Status: <strong>Online</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Error notification */}
        {error && (
          <div className="print:hidden lg:col-span-12 bg-rose-950/20 border border-rose-900/30 p-4 rounded-xl flex items-start gap-3 text-sm text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Pipeline Execution Warning</p>
              <p className="text-xs text-rose-500 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-xs text-slate-500 hover:text-white">Dismiss</button>
          </div>
        )}

        {/* Left Side: Setup & Registry (4 columns) */}
        <section className="print:hidden lg:col-span-4 space-y-6">
          <DatasetConfigurator onSubmit={handleCreateDataset} isLoading={isLoading} />
          <JobList 
            jobs={jobs} 
            selectedJobId={selectedJobId} 
            onSelectJob={setSelectedJobId} 
            onDeleteJob={handleDeleteJob} 
          />
        </section>

        {/* Right Side: Active Workspace (8 columns) */}
        <section className="lg:col-span-8 flex flex-col h-full">
          {selectedJob ? (
            <div className="flex-1 space-y-6">
              {/* If job is running, show an active processing screen */}
              {['pending', 'searching', 'fetching', 'normalizing'].includes(selectedJob.status) && (
                <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-emerald-950/50 border border-emerald-900/40 rounded-full">
                    <Sparkles className="w-8 h-8 text-emerald-400 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-lg font-sans font-medium text-white tracking-tight">Agentic Pipeline Active</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      The crawler agent is executing search grounding, downloading external reference websites, and structuring training inputs matching your schema.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto bg-slate-950 border border-slate-800 p-4 rounded-xl text-left space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Pipeline Progress</span>
                      <span className="text-emerald-400 font-bold">{selectedJob.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full transition-all duration-300" style={{ width: `${selectedJob.progress}%` }} />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      <span className="text-[10px] text-slate-400 font-mono">
                        Stage: {selectedJob.status.toUpperCase()} ({selectedJob.data.length} compiled)
                      </span>
                    </div>
                  </div>

                  {/* Partial Preview */}
                  {selectedJob.data.length > 0 && (
                    <div className="text-left border-t border-slate-800/80 pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Partial Dataset Preview</h3>
                      </div>
                      <DatasetWorkspace job={selectedJob} />
                    </div>
                  )}
                </div>
              )}

              {/* Completed or failed workspace */}
              {['completed', 'failed'].includes(selectedJob.status) && (
                <DatasetWorkspace job={selectedJob} />
              )}
            </div>
          ) : (
            <div className="print:hidden flex-1 flex flex-col items-center justify-center border border-slate-800 bg-slate-900/30 rounded-2xl p-12 text-center h-[500px]">
              <Cpu className="w-12 h-12 text-slate-600 mb-4 animate-bounce" />
              <h2 className="text-base font-sans font-medium text-slate-300">No Dataset Active</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Initiate a new grounding job on the left configurator or select a compiled dataset from history to begin.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-900 bg-slate-950 py-4 text-center text-[11px] text-slate-500 font-mono mt-auto">
        &copy; 2026 Agentic Training Data Generator • Pure State-of-the-Art Syntheses
      </footer>
    </div>
  );
}
