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

export const TerminalTab: React.FC<TerminalTabProps> = React.memo(({ logs, setLogs }) => {
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
      className="p-4 sm:p-6 w-full max-w-md mx-auto h-full flex flex-col gap-4"
    >
      <div className="bg-slate-50 backdrop-blur-md rounded-[24px] border border-slate-200 shadow-xl flex flex-col h-[70vh] overflow-hidden w-full">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100/80">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              RELAY CONSOLE
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[9px] text-jago-dark font-bold uppercase tracking-wider">
                Streaming live
              </span>
            </div>
          </div>

          <button 
            onClick={() => setLogs([])}
            className="p-2 bg-slate-200/60 hover:bg-rose-50 hover:border-rose-200 rounded-xl text-slate-600 hover:text-rose-600 border border-slate-300 transition-all cursor-pointer"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Logs stream body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] no-scrollbar relative">
          {/* Subtle Retro Monitor Grid/Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,0.03)_50%)] bg-[size:100%_4px] opacity-25 z-10" />

          {logs.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3 pointer-events-none select-none z-0">
              <TerminalIcon className="w-8 h-8 opacity-20" />
              <p className="italic text-xs font-semibold">Console idle...</p>
            </div>
          )}
          {logs.map((log, idx) => (
            <div key={idx} className="flex gap-2.5 items-start relative z-10">
              <span className="text-slate-400 shrink-0 select-none font-bold">
                [{log.timestamp}]
              </span>
              <span className={hn(
                "leading-relaxed break-words font-semibold",
                log.type === "error" 
                  ? "text-rose-600" 
                  : log.type === "success" 
                  ? "text-emerald-600" 
                  : log.type === "warning" 
                  ? "text-jago-dark animate-pulse" 
                  : "text-slate-700"
              )}>
                {log.message}
              </span>
            </div>
          ))}

          {/* Interactive glowing blinking CLI prompt cursor */}
          <div className="flex gap-1.5 items-center text-slate-400 font-bold relative z-10 pt-1">
            <span>&gt; sys_status: OK</span>
            <div 
              className="w-1.5 h-3 bg-jago shadow-[0_0_6px_rgba(255,179,0,0.5)] animate-terminal-blink"
            />
          </div>

          <div ref={terminalEndRef} />
        </div>

        <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex justify-between items-center px-4 shrink-0">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
            Log Count: {logs.length}/50
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-jago rounded-full shadow-[0_0_8px_rgba(255,179,0,0.4)]" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
              GF-V104
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
