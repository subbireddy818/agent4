"use client";

import { useState } from "react";
import { 
  FileText, Search, Download, Share2, 
  Plus, X, Info, FileSpreadsheet, 
  Upload 
} from "lucide-react";

interface VaultDocument {
  id: string;
  name: string;
  type: "Brochure" | "Floor Plan" | "Price Sheet" | "Agreement";
  size: string;
  date: string;
  fileName: string;
  project: string;
}

export default function DocumentVault() {
  const [activeTab, setActiveTab] = useState<"All" | "Brochure" | "Floor Plan" | "Price Sheet" | "Agreement">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form states
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<VaultDocument["type"]>("Brochure");
  const [uploadProject, setUploadProject] = useState("");
  const [uploadSize, setUploadSize] = useState("2.4 MB");

  const [documents, setDocuments] = useState<VaultDocument[]>([
    { id: "1", name: "Skyline Heights Brochure", type: "Brochure", size: "4.2 MB", date: "22 May", fileName: "Skyline_Heights_Brochure.pdf", project: "Skyline Heights" },
    { id: "2", name: "Urban Rise Price Sheet", type: "Price Sheet", size: "1.8 MB", date: "22 May", fileName: "Urban_Rise_Price_Sheet.pdf", project: "Urban Rise" },
    { id: "3", name: "Green Harmony Floor Plan", type: "Floor Plan", size: "5.6 MB", date: "19 May", fileName: "Green_Harmony_Floor_Plan.pdf", project: "Green Harmony" },
    { id: "4", name: "Lodha Evermore Brochure", type: "Brochure", size: "8.4 MB", date: "15 May", fileName: "Lodha_Evermore_Brochure.pdf", project: "Lodha Evermore" },
    { id: "5", name: "CP Agreement Template", type: "Agreement", size: "1.2 MB", date: "12 May", fileName: "CP_Agreement_Template.docx", project: "Platform Template" }
  ]);

  const filteredDocuments = documents.filter(doc => {
    const matchesTab = activeTab === "All" || doc.type === activeTab;
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName || !uploadProject) return;

    const newDoc: VaultDocument = {
      id: Date.now().toString(),
      name: uploadName,
      type: uploadType,
      size: uploadSize,
      date: "Just now",
      fileName: uploadName.toLowerCase().replace(/\s+/g, "_") + ".pdf",
      project: uploadProject
    };

    setDocuments([newDoc, ...documents]);
    setUploadName("");
    setUploadProject("");
    setShowUploadModal(false);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Document Vault</h1>
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Access project brochures, pricing briefs, and CP layouts.</p>
        </div>

        <button 
          onClick={() => setShowUploadModal(true)}
          className="glow-button px-4 py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Tabs list & Search bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold overflow-x-auto w-full md:w-auto">
          {[
            { id: "All", label: "All Docs" },
            { id: "Brochure", label: "Brochures" },
            { id: "Floor Plan", label: "Floor Plans" },
            { id: "Price Sheet", label: "Price Sheets" },
            { id: "Agreement", label: "Agreements" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg transition shrink-0 ${
                activeTab === tab.id 
                  ? "bg-[#25d366] text-white" 
                  : "text-slate-500 hover:text-slate-850"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search document name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-250 focus:border-[#25d366] rounded-xl py-2 pl-9 pr-4 text-slate-800 placeholder-slate-455 outline-none text-xs transition"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs font-semibold text-slate-655">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Document Details</th>
              <th className="px-6 py-4">Associated Project</th>
              <th className="px-6 py-4">Format & Size</th>
              <th className="px-6 py-4">Uploaded</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredDocuments.map(doc => {
              const isPdf = doc.fileName.endsWith(".pdf");
              
              return (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                        {isPdf ? <FileText className="w-4.5 h-4.5" /> : <FileSpreadsheet className="w-4.5 h-4.5" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{doc.name}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{doc.fileName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-500">{doc.project}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600">
                      {doc.type} · {doc.size}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{doc.date}</td>
                  <td className="px-6 py-4 text-right space-x-2 shrink-0">
                    <button 
                      onClick={() => alert(`Downloading ${doc.fileName}`)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    
                    <button 
                      onClick={() => alert("Copied WhatsApp shareable link!")}
                      className="px-2.5 py-1.5 bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#16c47f] rounded-lg transition"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredDocuments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <Info className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                  <div className="font-bold">No documents found matching filters</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Upload File Simulation Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-[#25d366]" />
              <span>Upload Document</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">Attach files to populate document grids.</p>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Document Label Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Prestige Heights Price list"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">File Category</label>
                  <select 
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                  >
                    <option>Brochure</option>
                    <option>Floor Plan</option>
                    <option>Price Sheet</option>
                    <option>Agreement</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">File Size</label>
                  <input 
                    type="text" 
                    placeholder="3.2 MB"
                    value={uploadSize}
                    onChange={(e) => setUploadSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Associated Project</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Skyline Heights"
                  value={uploadProject}
                  onChange={(e) => setUploadProject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-sm font-bold">
                <button 
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 bg-transparent text-slate-500 hover:text-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white rounded-xl shadow-lg transition"
                >
                  Confirm Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
