/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, HelpCircle } from "lucide-react";

interface AiAssistantProps {
  workspaceContext: string;
}

export default function AiAssistant({ workspaceContext }: AiAssistantProps) {
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([
    {
      role: "assistant",
      text: "Halo! Saya adalah **BinaryForge AI Reverse Engineering Assistant**. Saya bisa membantu Anda menganalisis kode assembly, menerjemahkan fungsi ke pseudocode C, menjelaskan cara kerja Stack Frame, atau membimbing Anda mem-bypass validasi serial key. Apa yang ingin Anda tanyakan hari ini?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: workspaceContext,
          history: messages
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${data.error || "Gagal mendapatkan respon dari AI."}` }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Gagal terhubung ke AI Assistant: ${err.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
      {/* Header */}
      <div className="bg-gray-800/80 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span className="font-semibold font-mono text-xs text-gray-200 uppercase tracking-wider">
            AI REVERSING HELPER
          </span>
        </div>
        <span className="text-[10px] bg-sky-950 text-sky-300 font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
          <Bot className="w-3 h-3" />
          <span>Gemini 3.5 Flash</span>
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-sky-600 text-white" : "bg-gray-800 text-sky-400 border border-gray-700"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-sky-600 text-white"
                  : "bg-gray-950/80 text-gray-200 border border-gray-800"
              }`}
            >
              {/* Basic markdown emulation */}
              <div className="space-y-1.5 whitespace-pre-wrap font-sans">
                {msg.text.split("\n").map((line, idx) => {
                  let formatted = line;

                  // bold formatting
                  if (formatted.includes("**")) {
                    const parts = formatted.split("**");
                    return (
                      <p key={idx}>
                        {parts.map((p, pIdx) =>
                          pIdx % 2 === 1 ? <strong key={pIdx} className="text-sky-400 font-bold">{p}</strong> : p
                        )}
                      </p>
                    );
                  }

                  // code block check
                  if (formatted.startsWith("`") && formatted.endsWith("`")) {
                    return (
                      <code key={idx} className="block bg-gray-900 text-amber-300 p-2 rounded border border-gray-800 font-mono text-[10px] my-1">
                        {formatted.replace(/`/g, "")}
                      </code>
                    );
                  }

                  return <p key={idx}>{formatted}</p>;
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-7 h-7 rounded-lg bg-gray-800 text-sky-400 border border-gray-700 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-gray-950/80 rounded-xl px-4 py-2 text-xs text-gray-500 border border-gray-800 flex items-center gap-1.5 font-mono">
              <span>Menganalisis logika biner...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Prompts */}
      <div className="px-4 py-2 bg-gray-950/40 border-t border-gray-800 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => handleSuggestionClick("Bagaimana cara bypass instruksi JE di serial key?")}
          className="text-[10px] bg-gray-800 hover:bg-gray-700 text-sky-400 rounded-full px-2.5 py-1 border border-gray-700 transition shrink-0"
        >
          Bypass JE Serial Key
        </button>
        <button
          onClick={() => handleSuggestionClick("Jelaskan cara kerja exploit Stack Buffer Overflow gets()")}
          className="text-[10px] bg-gray-800 hover:bg-gray-700 text-sky-400 rounded-full px-2.5 py-1 border border-gray-700 transition shrink-0"
        >
          Eksploitasi Stack Gets
        </button>
        <button
          onClick={() => handleSuggestionClick("Bagaimana cara reverse engineering loop dekripsi XOR?")}
          className="text-[10px] bg-gray-800 hover:bg-gray-700 text-sky-400 rounded-full px-2.5 py-1 border border-gray-700 transition shrink-0"
        >
          Dekripsi Loop XOR
        </button>
      </div>

      {/* Input */}
      <div className="bg-gray-950 p-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Tanyakan analisis biner, instruksi CPU register, dll..."
          className="flex-1 bg-gray-900 border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sky-500 placeholder-gray-600"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
