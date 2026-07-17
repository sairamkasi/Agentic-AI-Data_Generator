import { DatasetJob } from '../types';
import { History, Calendar, HelpCircle, Loader2, PlayCircle, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';

interface JobListProps {
  jobs: DatasetJob[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onDeleteJob: (id: string) => void;
}

export default function JobList({ jobs, selectedJobId, onSelectJob, onDeleteJob }: JobListProps) {
  
  const getStatusIcon = (status: DatasetJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'pending':
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
      default:
        return <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />;
    }
  };

  const getStatusLabel = (job: DatasetJob) => {
    switch (job.status) {
      case 'completed':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Waiting...';
      case 'searching':
        return 'Auto Grounding & URL Search...';
      case 'fetching':
        return 'Scraping Sources...';
      case 'normalizing':
        return `Normalizing batch (${job.data.length}/${job.quantity})`;
      default:
        return 'Agent Active';
    }
  };

  return (
    <div id="job-list" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full max-h-[700px]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4.5 h-4.5 text-slate-400" />
          <h2 className="text-sm font-sans font-semibold text-slate-200 uppercase tracking-wider">Dataset History</h2>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 border border-slate-800 rounded-md">
          {jobs.length}
        </span>
      </div>

      <div className="overflow-y-auto space-y-3 pr-1 flex-1">
        {jobs.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500">
            <PlayCircle className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-sans">No dataset jobs compiled yet.</p>
            <p className="text-[10px] text-slate-600 font-sans mt-0.5">Use the configurator to start your first crawler agent.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const isSelected = job.id === selectedJobId;
            const isRunning = ['searching', 'fetching', 'normalizing'].includes(job.status);

            return (
              <div
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className={`relative group border rounded-xl p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-slate-950 border-emerald-500 shadow-sm shadow-emerald-950/25'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                {/* Deletion button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteJob(job.id);
                  }}
                  className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 bg-slate-900/80 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-lg transition-all"
                  title="Remove Job"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div>
                  <h3 className="text-xs font-medium text-slate-100 truncate pr-6 font-sans">
                    {job.domain}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-sans mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Qty: {job.quantity}</span>
                  </div>

                  {/* Status track */}
                  <div className="flex items-center justify-between mt-3 text-[11px] font-sans">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(job.status)}
                      <span className={`font-medium ${
                        job.status === 'completed'
                          ? 'text-emerald-400'
                          : job.status === 'failed'
                          ? 'text-rose-400'
                          : isRunning
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}>
                        {getStatusLabel(job)}
                      </span>
                    </div>
                    <span className="font-mono text-slate-400 font-bold text-[10px]">{job.progress}%</span>
                  </div>

                  {/* Progress Indicator line */}
                  <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden border border-slate-800/20">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        job.status === 'failed'
                          ? 'bg-rose-500'
                          : job.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-emerald-400 animate-pulse'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>

                  {job.error && (
                    <p className="text-[9px] text-rose-400 mt-2 line-clamp-1 font-mono">
                      {job.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
