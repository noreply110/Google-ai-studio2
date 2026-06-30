import React, { useRef, useEffect, useState } from "react";
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, 
  List, ListOrdered, Link2, Type, Palette, Code, Eye, Eraser,
  ChevronDown
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Tulis pesan Anda di sini...",
  minHeight = "200px"
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlValue, setHtmlValue] = useState(value);
  const [activeFormat, setActiveFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
  });

  // Keep raw HTML input in sync with value
  useEffect(() => {
    setHtmlValue(value);
  }, [value]);

  // Handle setting initial value or external value changes without losing focus
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setHtmlValue(html);
    }
  };

  const executeCommand = (command: string, argument: string = "") => {
    document.execCommand(command, false, argument);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    setActiveFormat({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const handleSelectionChange = () => {
    updateActiveFormats();
  };

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const insertLink = () => {
    const url = prompt("Masukkan URL Link:");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const setTextColor = (color: string) => {
    executeCommand("foreColor", color);
  };

  const setFontSize = (size: string) => {
    // execCommand "fontSize" accepts 1-7
    executeCommand("fontSize", size);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // Default pasting in contentEditable retains HTML and inline styles 1:1.
    // If they paste, trigger the onChange handler right after paste event finishes.
    setTimeout(() => {
      handleInput();
    }, 50);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setHtmlValue(newVal);
    onChange(newVal);
  };

  return (
    <div className="w-full flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-inner ring-1 ring-slate-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-1.5 bg-slate-50 border-b border-slate-200 select-none overflow-hidden">
        {!isHtmlMode ? (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 whitespace-nowrap py-1 pr-2 scroll-smooth">
            {/* Formatting Actions */}
            <button
              type="button"
              onClick={() => executeCommand("bold")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                activeFormat.bold ? "bg-[#0050b3] text-white" : "text-slate-600 hover:bg-slate-200"
              }`}
              title="Tebal (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("italic")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                activeFormat.italic ? "bg-[#0050b3] text-white" : "text-slate-600 hover:bg-slate-200"
              }`}
              title="Miring (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("underline")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                activeFormat.underline ? "bg-[#0050b3] text-white" : "text-slate-600 hover:bg-slate-200"
              }`}
              title="Garis Bawah (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

            {/* Alignment */}
            <button
              type="button"
              onClick={() => executeCommand("justifyLeft")}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Rata Kiri"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("justifyCenter")}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Rata Tengah"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("justifyRight")}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Rata Kanan"
            >
              <AlignRight className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => executeCommand("insertUnorderedList")}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Daftar Simbol"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("insertOrderedList")}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Daftar Nomor"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

            {/* Font Size Dropdown */}
            <div className="relative group/size flex items-center shrink-0">
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Ukuran Font"
              >
                <Type className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 hidden group-hover/size:block min-w-[120px]">
                {[
                  { label: "Sangat Kecil", size: "1" },
                  { label: "Kecil", size: "2" },
                  { label: "Normal", size: "3" },
                  { label: "Sedang", size: "4" },
                  { label: "Besar", size: "5" },
                  { label: "Sangat Besar", size: "6" },
                  { label: "Raksasa", size: "7" }
                ].map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => setFontSize(item.size)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color Dropdown */}
            <div className="relative group/color flex items-center shrink-0">
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                title="Warna Teks"
              >
                <Palette className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 hidden group-hover/color:block">
                <div className="grid grid-cols-5 gap-1.5 min-w-[140px]">
                  {[
                    "#000000", "#475569", "#dc2626", "#ea580c", "#ca8a04",
                    "#16a34a", "#059669", "#0284c7", "#2563eb", "#7c3aed",
                    "#db2777", "#ffffff", "#f1f5f9", "#fee2e2", "#dcfce7"
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTextColor(color)}
                      style={{ backgroundColor: color }}
                      className="w-5 h-5 rounded border border-slate-300 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />

            {/* Link & Clear */}
            <button
              type="button"
              onClick={insertLink}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Sisipkan Link"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand("removeFormat")}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-all cursor-pointer shrink-0"
              title="Hapus Format"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden pr-2">
            <span className="text-[9px] sm:text-[10px] font-bold text-[#0050b3] bg-blue-50 px-2 py-1 rounded border border-blue-200 uppercase tracking-wider block truncate">
              Mode Editor HTML (Kode Sumber)
            </span>
          </div>
        )}

        <div className="flex items-center shrink-0 border-l border-slate-200 pl-1.5">
          {/* HTML Source Toggle */}
          <button
            type="button"
            onClick={() => setIsHtmlMode(!isHtmlMode)}
            className="px-2 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0"
            title={isHtmlMode ? "Beralih ke Visual" : "Beralih ke Kode HTML"}
          >
            {isHtmlMode ? (
              <>
                <Eye className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Visual</span>
              </>
            ) : (
              <>
                <Code className="w-3.5 h-3.5" /> <span className="hidden xs:inline">HTML</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div 
        className="relative flex-1 bg-white overflow-y-auto"
        style={{ minHeight }}
      >
        {!isHtmlMode ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="w-full h-full min-h-[inherit] p-4 text-slate-800 text-sm focus:outline-none overflow-y-auto leading-relaxed select-text"
            style={{ minHeight }}
            data-placeholder={placeholder}
          />
        ) : (
          <textarea
            value={htmlValue}
            onChange={handleHtmlChange}
            className="w-full h-full min-h-[inherit] p-4 text-slate-800 text-xs font-mono focus:outline-none bg-slate-900 text-slate-100 resize-none"
            style={{ minHeight }}
            placeholder="Ketik atau tempel kode HTML kustom di sini..."
          />
        )}
      </div>

      {/* Styles to support placeholder on contenteditable and scrollbar hiding */}
      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          cursor: text;
        }
        [contenteditable] {
          outline: none;
        }
        /* Style standard tag output for consistent contenteditable visual representation */
        [contenteditable] ul {
          list-style-type: disc !important;
          padding-left: 24px !important;
          margin: 8px 0 !important;
        }
        [contenteditable] ol {
          list-style-type: decimal !important;
          padding-left: 24px !important;
          margin: 8px 0 !important;
        }
        [contenteditable] blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 12px;
          color: #475569;
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
};
