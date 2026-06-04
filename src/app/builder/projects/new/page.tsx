"use client";

import { useState, useEffect } from "react";
import { 
  Building, Upload, FileSpreadsheet, Loader2, 
  CheckCircle, Sparkles, X, Users, Check, MapPin
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveProjectAction } from "./actions";
import { supabase } from "@/lib/supabase";
import { HYDERABAD_LOCATIONS } from "@/lib/hyderabadLocations";

interface ParsedUnit {
  number: string;
  config: string;
  size: string;
  price: string;
  status: "AVAILABLE" | "HOLD" | "SOLD" | "BLOCKED";
}

export default function NewProject() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [price, setPrice] = useState("");
  const [propType, setPropType] = useState<"Apartment" | "Plot" | "Villa" | "Commercial">("Apartment");

  const [fileName, setFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [parsedUnits, setParsedUnits] = useState<ParsedUnit[]>([]);
  const [step, setStep] = useState(1); // 1: Form, 2: Parsing/Result
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // WhatsApp Broadcast Targets & Filters
  const [recipientFilter, setRecipientFilter] = useState<"all" | "verified" | "rera">("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState(0);

  useEffect(() => {
    async function fetchEstimatedReach() {
      try {
        let query = supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "agent");

        if (recipientFilter === "verified") {
          query = query.eq("status", "approved");
        } else if (recipientFilter === "rera") {
          query = query.not("rera_number", "is", null).neq("rera_number", "N/A").neq("rera_number", "");
        }

        if (selectedLocations.length > 0) {
          query = query.in("location", selectedLocations);
        }

        const { count } = await query;
        setEstimatedReach(count || 0);
      } catch {
        setEstimatedReach(0);
      }
    }
    fetchEstimatedReach();
  }, [recipientFilter, selectedLocations]);

  const toggleLocation = (loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
    );
  };

  const filteredLocations = HYDERABAD_LOCATIONS.filter((loc) =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFileName(selectedFile.name);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) return;

    setSaving(true);
    const phone = localStorage.getItem("agentsapp_logged_in_phone") || "";
    // Save project with no units for now
    const res = await saveProjectAction(
      phone, 
      name, 
      location, 
      city, 
      price, 
      propType, 
      [],
      recipientFilter,
      selectedLocations.length > 0 ? selectedLocations : undefined
    );

    if (res.ok) {
      router.push("/builder/dashboard");
    } else {
      alert("Error saving project: " + res.error);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6 text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Project</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">Define project configuration templates and upload Excel spreadsheets.</p>
      </div>

      {/* Form & Upload Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-indigo-500" />
              <span>Project Schema Configuration</span>
            </h3>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Project Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Prestige Heights"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-450 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">Location</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Kokapet"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-455 outline-none text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">Property Template</label>
                  <select 
                    value={propType}
                    onChange={(e) => setPropType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-850 outline-none text-sm font-medium transition"
                  >
                    <option>Apartment</option>
                    <option>Plot</option>
                    <option>Villa</option>
                    <option>Commercial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">City</label>
                  <input 
                    type="text" 
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">Price Estimate</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ₹1.82 Cr Onwards"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-455 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              {/* WhatsApp Broadcast Target Filters */}
              <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#25d366]" />
                    <span>WhatsApp Launch Broadcast Filter</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Choose which agents will receive the automatic WhatsApp notification on project launch.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <label className="block uppercase tracking-wider text-[10px]">Verification Filter</label>
                    <select 
                      value={recipientFilter}
                      onChange={(e) => setRecipientFilter(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-850 outline-none text-xs font-semibold transition"
                    >
                      <option value="all">To All Agents</option>
                      <option value="verified">Only Verified Agents</option>
                      <option value="rera">RERA Approved Agents</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block uppercase tracking-wider text-[10px]">Filter by Location (Hyderabad Areas)</label>
                  
                  {/* Selected Locations Tags */}
                  {selectedLocations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedLocations.map((loc) => (
                        <span key={loc} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 mr-0.5" />
                          <span>{loc}</span>
                          <button 
                            type="button" 
                            onClick={() => toggleLocation(loc)}
                            className="text-indigo-400 hover:text-indigo-650 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button 
                        type="button"
                        onClick={() => setSelectedLocations([])}
                        className="text-[9px] text-red-550 hover:text-red-700 font-bold uppercase tracking-wider px-2 py-1"
                      >
                        Clear All
                      </button>
                    </div>
                  )}

                  {/* Location Input & Dropdown */}
                  <div className="relative">
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(e) => { setLocationSearch(e.target.value); setShowLocationDropdown(true); }}
                      onFocus={() => setShowLocationDropdown(true)}
                      placeholder="Search area... (e.g. Madhapur, Gachibowli, Kokapet)"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-xs font-medium transition"
                    />
                    {showLocationDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredLocations.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400">No areas found</div>
                        ) : (
                          filteredLocations.map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => { toggleLocation(loc); setLocationSearch(""); }}
                              className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition flex items-center justify-between ${
                                selectedLocations.includes(loc) ? "bg-indigo-50 text-indigo-700" : "text-slate-700"
                              }`}
                            >
                              <span className="flex items-center space-x-2">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{loc}</span>
                              </span>
                              {selectedLocations.includes(loc) && (
                                <Check className="w-3.5 h-3.5 text-indigo-600" />
                              )}
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => setShowLocationDropdown(false)}
                          className="w-full text-center py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 hover:bg-slate-50"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estimated Reach Display */}
                <div className="flex items-center space-x-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">
                    Estimated Reach: {estimatedReach} agent{estimatedReach !== 1 ? "s" : ""}
                    {selectedLocations.length > 0 ? ` in ${selectedLocations.length} area${selectedLocations.length !== 1 ? "s" : ""}` : " (all areas)"}
                  </span>
                </div>
              </div>

              {/* Upload area */}
              <div className="space-y-1.5 pt-2">
                <label className="block uppercase tracking-wider text-[10px]">Excel Spreadsheet Upload</label>
                <div className="relative border border-dashed border-slate-350 hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="text-[10px] text-slate-700 font-bold">
                    {fileName ? `Attached: ${fileName}` : "Drag and drop your Excel inventory here"}
                  </div>
                  <div className="text-[8px] text-slate-500 mt-1">Accepts Excel (.xlsx), CSV up to 8MB</div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-sm font-bold">
                <Link href="/builder/dashboard" className="px-4 py-2.5 bg-transparent text-slate-500 hover:text-slate-800 rounded-xl transition">
                  Cancel
                </Link>
                <button 
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-70"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
    </div>
  );
}
