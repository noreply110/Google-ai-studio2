import React, { useState } from "react";
import { Search, Plus, Trash2, Pen, Eye, Send, FileText } from "lucide-react";
import { motion } from "motion/react";
import { EmailTemplate } from "../types";

interface TemplatesTabProps {
  templates: EmailTemplate[];
  setActiveTab: (tab: "send" | "templates" | "terminal" | "accounts") => void;
  setEditingTemplateId: (id: string | null) => void;
  setTemplateForm: (form: { name: string; category: "General" | "Marketing" | "Support" | "Personal"; subject: string; message: string }) => void;
  setShowTemplateModal: (show: boolean) => void;
  setTemplateToDelete: (template: EmailTemplate | null) => void;
  setPreviewTemplate: (template: EmailTemplate | null) => void;
  setQuickTestTemplate: (template: EmailTemplate | null) => void;
  setQuickTestRecipient: (rec: string) => void;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
  templates,
  setActiveTab,
  setEditingTemplateId,
  setTemplateForm,
  setShowTemplateModal,
  setTemplateToDelete,
  setPreviewTemplate,
  setQuickTestTemplate,
  setQuickTestRecipient
}) => {
  const [templateSearch, setTemplateSearch] = useState("");

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.subject.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const startEditTemplate = (t: EmailTemplate) => {
    setTemplateForm({
      name: t.name,
      category: t.category,
      subject: t.subject,
      message: t.message
    });
    setEditingTemplateId(t.id);
    setShowTemplateModal(true);
  };

  const useTemplateContent = (t: EmailTemplate) => {
    window.dispatchEvent(new CustomEvent("use-template", { detail: t }));
    setActiveTab("send");
  };

  return (
    <motion.div
      key="templates-view"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-4 lg:p-10 max-w-7xl mx-auto pb-32"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Template Email
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kelola dan gunakan kembali draf pengiriman email kustom Anda.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari template..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
            />
          </div>

          <button 
            onClick={() => {
              setEditingTemplateId(null);
              setTemplateForm({ name: "", category: "General", subject: "", message: "" });
              setShowTemplateModal(true);
            }}
            className="w-10 h-10 bg-[#0050b3] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 transition-all active:scale-90 shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((t) => (
          <motion.div 
            key={t.id}
            layout
            className="bg-white border-2 border-white rounded-[28px] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,58,143,0.18)] hover:shadow-[0_30px_70px_-12px_rgba(0,58,143,0.35)] transition-all group hover:-translate-y-1 ring-1 ring-blue-100/30"
          >
            <div className="p-4 sm:p-6 flex flex-col h-full justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-blue-50 text-blue-800 text-[10px] font-extrabold uppercase rounded-full">
                    {t.category}
                  </span>
                  <button 
                    onClick={() => setTemplateToDelete(t)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-extrabold text-slate-900 mb-1 leading-tight text-sm">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-500 font-bold mb-6 line-clamp-2 leading-relaxed">
                  {t.subject}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-1.5 xs:gap-2 items-center">
                <button 
                  onClick={() => startEditTemplate(t)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-blue-700 rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center shrink-0"
                  title="Edit Draft"
                >
                  <Pen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button 
                  onClick={() => setPreviewTemplate(t)}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center shrink-0"
                  title="Pratinjau"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button 
                  onClick={() => {
                    setQuickTestTemplate(t);
                    setQuickTestRecipient("");
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center shrink-0"
                  title="Kirim Tes"
                >
                  <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                </button>
                <button 
                  onClick={() => useTemplateContent(t)}
                  className="flex-1 h-8 sm:h-10 bg-[#0050b3] text-white text-[9px] sm:text-[10px] font-black rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-md shadow-blue-500/20 truncate px-1"
                >
                  PAKAI TEMPLATE
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-slate-900 font-black">Belum Ada Template</h3>
          <p className="text-sm text-slate-500 font-bold mt-1">
            Mulai dengan membuat draf email pertama Anda untuk pengiriman cepat.
          </p>
        </div>
      )}
    </motion.div>
  );
};
