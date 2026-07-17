import React, { useState } from 'react';
import { Download, FileCode, Table, LayoutList, Copy, Check, FileSpreadsheet, Printer, Globe, CornerDownRight, ExternalLink, Wand2 } from 'lucide-react';
import { DatasetJob } from '../types';

interface DatasetWorkspaceProps {
  job: DatasetJob;
}

export default function DatasetWorkspace({ job }: DatasetWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json' | 'cards'>('table');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const fields = job.schema;

  // Filter rows based on search term
  const filteredData = job.data.filter((row) => {
    if (!searchTerm) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(job.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe client-side CSV generator
  const downloadCSV = () => {
    if (job.data.length === 0) return;
    const headers = fields.map(f => f.fieldName);
    
    const csvRows = [
      headers.join(','), // header row
      ...job.data.map(row => 
        headers.map(fieldName => {
          const val = row[fieldName] === undefined ? "" : row[fieldName];
          const escaped = String(val).replace(/"/g, '""'); // escape double quotes
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n'); // add BOM for excel UTF-8
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${job.domain.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dataset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe Excel (Tab-Separated for ultimate compatibility)
  const downloadExcel = () => {
    if (job.data.length === 0) return;
    const headers = fields.map(f => f.fieldName);
    
    const tsvRows = [
      headers.join('\t'),
      ...job.data.map(row => 
        headers.map(fieldName => {
          const val = row[fieldName] === undefined ? "" : row[fieldName];
          // clean tabs & breaks
          const cleaned = String(val).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
          return cleaned;
        }).join('\t')
      )
    ];

    const tsvContent = "data:text/tab-separated-values;charset=utf-8,\uFEFF" + tsvRows.join('\n');
    const encodedUri = encodeURI(tsvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${job.domain.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dataset.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(job.data, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `${job.domain.toLowerCase().replace(/[^a-z0-9]/g, '_')}_dataset.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Elegant printable PDF layout trigger
  const triggerPrintPDF = () => {
    window.print();
  };

  return (
    <div id="dataset-workspace" className="space-y-6">
      {/* Printable Report View (Visible only during browser print) */}
      <div className="hidden print:block bg-white text-black p-8 font-sans">
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wide">AI Agent Training Dataset Report</h1>
          <p className="text-sm text-slate-500 mt-1">Generated Agentically via Gemini LLM Grounding</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <strong>Domain Topic:</strong> {job.domain}
          </div>
          <div>
            <strong>Task Type:</strong> {job.taskType}
          </div>
          <div>
            <strong>Generated Date:</strong> {new Date(job.createdAt).toLocaleDateString()}
          </div>
          <div>
            <strong>Total Entries:</strong> {job.data.length}
          </div>
        </div>

        <h3 className="text-lg font-bold mb-3 border-b border-slate-300 pb-1">Validation Schema</h3>
        <table className="w-full text-xs text-left border-collapse mb-6">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 border border-slate-300 font-bold">Field Name</th>
              <th className="p-2 border border-slate-300 font-bold">Field Type</th>
              <th className="p-2 border border-slate-300 font-bold">Guidelines</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, idx) => (
              <tr key={idx}>
                <td className="p-2 border border-slate-300 font-mono font-bold text-slate-800">{f.fieldName}</td>
                <td className="p-2 border border-slate-300">{f.fieldType}</td>
                <td className="p-2 border border-slate-300">{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="text-lg font-bold mb-3 border-b border-slate-300 pb-1">Normalized Dataset Samples</h3>
        {job.data.slice(0, 10).map((row, idx) => (
          <div key={idx} className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded text-xs page-break-inside-avoid">
            <div className="font-bold text-slate-700 mb-2">Instance #{idx + 1}</div>
            {fields.map((f, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-1.5 last:mb-0">
                <div className="font-mono text-slate-500 font-semibold">{f.fieldName}:</div>
                <div className="col-span-3 text-slate-900 whitespace-pre-wrap">{String(row[f.fieldName])}</div>
              </div>
            ))}
          </div>
        ))}
        {job.data.length > 10 && (
          <p className="text-[11px] text-slate-500 text-center italic mt-4">
            Truncated at 10 items for physical print. Full dataset contains {job.data.length} elements.
          </p>
        )}
      </div>

      {/* Main Workspace Dashboard (Screen view) */}
      <div className="print:hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-900/50 px-2 py-1 rounded-md uppercase tracking-wider">
              Active Dataset Workspace
            </span>
            <h1 className="text-2xl font-sans font-medium text-white tracking-tight mt-2">{job.domain}</h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Task Target: <span className="text-slate-300 font-medium">{job.taskType}</span> • Normalized {job.data.length} training records
            </p>
          </div>

          {/* Download & Export Panels */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadJSON}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-all"
              title="Download clean JSON"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              JSON
            </button>
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-all"
              title="Download CSV table"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              CSV
            </button>
            <button
              onClick={downloadExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-all"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              Excel
            </button>
            <button
              onClick={triggerPrintPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-all"
              title="Print standard report or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              PDF Report
            </button>
          </div>
        </div>

        {/* Crawler Web Sources Drawer */}
        {job.sources.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Agentic Crawled Grounding Sources</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto">
              {job.sources.map((src, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-900 border border-slate-800/60 p-2.5 rounded-lg">
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="overflow-hidden w-full">
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="text-xs font-medium text-slate-200 truncate pr-2" title={src.title}>
                        {src.title}
                      </span>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-slate-200 flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{src.url}</div>
                    {src.sourceTextLength && (
                      <div className="text-[9px] text-slate-400 mt-1 font-sans bg-slate-950 border border-slate-800/80 w-max px-1.5 py-0.5 rounded">
                        Scraped: {src.sourceTextLength.toLocaleString()} bytes
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Mode Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'table' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'cards' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              Key-Value Cards
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'json' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              JSON View
            </button>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-auto flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-emerald-500/50 transition-all">
            <input
              type="text"
              placeholder="Filter dataset rows..."
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full sm:w-48 font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Dataset Workspace Content Viewer */}
        {job.data.length === 0 ? (
          <div className="h-60 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 bg-slate-950/20">
            <Wand2 className="w-8 h-8 text-slate-600 animate-pulse mb-3" />
            <p className="text-xs font-medium font-sans">No records compiled yet.</p>
            <p className="text-[11px] text-slate-600 mt-1 font-sans">Wait for normalization pipeline to stream training inputs.</p>
          </div>
        ) : (
          <div className="min-h-[300px]">
            {/* 1. TABLE VIEW */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px] font-semibold tracking-wider font-sans uppercase">
                      <th className="p-3 w-16 text-center">Row</th>
                      {fields.map((f, i) => (
                        <th key={i} className="p-3 min-w-[150px] font-sans">{f.fieldName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                    {filteredData.map((row, idx) => (
                      <React.Fragment key={idx}>
                        <tr
                          onClick={() => setSelectedRow(selectedRow === idx ? null : idx)}
                          className={`hover:bg-slate-800/40 cursor-pointer text-xs text-slate-300 font-sans transition-all ${
                            selectedRow === idx ? 'bg-slate-800/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center font-mono text-slate-500 select-none border-r border-slate-800">
                            {idx + 1}
                          </td>
                          {fields.map((f, i) => (
                            <td key={i} className="p-3 align-top max-w-[280px]">
                              <div className={`line-clamp-3 leading-relaxed break-words font-sans text-slate-300 ${
                                selectedRow === idx ? 'line-clamp-none whitespace-pre-wrap' : ''
                              }`}>
                                {String(row[f.fieldName])}
                              </div>
                            </td>
                          ))}
                        </tr>
                        {selectedRow === idx && (
                          <tr className="bg-slate-950/30">
                            <td colSpan={fields.length + 1} className="p-4 border-t border-b border-slate-800 text-slate-400 text-xs">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">Detailed Record View (Row #{idx + 1})</span>
                                <button
                                  onClick={() => setSelectedRow(null)}
                                  className="text-[10px] text-slate-500 hover:text-slate-300 font-sans"
                                >
                                  Collapse
                                </button>
                              </div>
                              <div className="space-y-3">
                                {fields.map((f, i) => (
                                  <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                                    <div className="text-[10px] font-mono text-slate-500 mb-1">{f.fieldName} ({f.fieldType})</div>
                                    <div className="text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">{String(row[f.fieldName])}</div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {filteredData.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 font-sans">
                    No records match current query.
                  </div>
                )}
              </div>
            )}

            {/* 2. CARD VIEW */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredData.map((row, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">Record #{idx + 1}</span>
                        <span className="text-[9px] text-slate-500 font-mono">Normalized</span>
                      </div>
                      {fields.map((f, i) => (
                        <div key={i} className="space-y-1">
                          <span className="block text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-wider">{f.fieldName}:</span>
                          <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800/40 p-2.5 rounded-lg whitespace-pre-wrap leading-relaxed font-sans">
                            {String(row[f.fieldName])}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. JSON VIEW */}
            {viewMode === 'json' && (
              <div className="relative">
                <button
                  onClick={handleCopyJson}
                  className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all flex items-center gap-1 text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy JSON"}
                </button>
                <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto text-xs font-mono text-emerald-400 leading-relaxed max-h-[500px]">
                  {JSON.stringify(job.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
