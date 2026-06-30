import React, { useEffect, useRef } from "react";
import { Trash2, Terminal as TerminalIcon } from "lucide-react";
import { motion } from "motion/react";
import { LogEntry } from "../types";

// Classname utility helper locally
function hn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

interface TerminalTabProps {
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ logs, setLogs }) => {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to terminal bottom on log stream
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <motion.div
      key="terminal-view"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="p-4 max-w-lg mx-auto h-full flex flex-col gap-4"
    >
      <div className="bg-[#020617] rounded-[24px] border border-slate-800 shadow-2xl flex flex-col h-[70vh] overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              RELAY CONSOLE
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
              <span className="text-[9px] text-[#0050b3] font-bold uppercase tracking-wider">
                Streaming live
              </span>
            </div>
          </div>

          <button 
            onClick={() => setLogs([])}
            className="p-2 bg-slate-800 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Logs stream body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] no-scrollbar relative">
          {/* Retro Monitor Grid/Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] opacity-15 z-10" />

          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 relative z-10">
              <TerminalIcon className="w-8 h-8 opacity-20" />
              <p className="italic text-xs font-semibold">Console idle...</p>
            </div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-2.5 items-start relative z-10">
              <span className="text-slate-500 shrink-0 select-none font-bold">
                [{log.timestamp}]
              </span>
              <span className={hn(
                "leading-relaxed break-words font-semibold",
                log.type === "error" 
                  ? "text-rose-400" 
                  : log.type === "success" 
                  ? "text-emerald-400" 
                  : log.type === "warning" 
                  ? "text-amber-400 animate-pulse" 
                  : "text-slate-200"
              )}>
                {log.message}
              </span>
            </div>
          ))}

          {/* Interactive glowing blinking CLI prompt cursor */}
          <div className="flex gap-1.5 items-center text-slate-500 font-bold relative z-10 pt-1">
            <span>&gt; sys_status: OK</span>
            <div 
              className="w-1.5 h-3 bg-emerald-400 shadow-[0_0_6px_#10b981] animate-terminal-blink"
            />
          </div>

          <div ref={terminalEndRef} />
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center px-4 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
            Log Count: {logs.length}/50
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#0050b3] rounded-full shadow-[0_0_8px_rgba(0,80,179,0.6)]" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
              GF-V104
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
