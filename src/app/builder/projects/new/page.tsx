"use client";

import { useState } from "react";
import { 
  Building, Upload, FileSpreadsheet, Loader2, 
  CheckCircle, Sparkles, X 
} from "lucide-react";
import Link from "next/link";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFileName(selectedFile.name);
    }
  };

  const handleUploadInventory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !fileName) return;

    setStep(2);
    setParsing(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setParsing(false);
          // Set parsed units with statuses from spec: AVAILABLE, HOLD, SOLD, BLOCKED
          setParsedUnits([
            { number: "A-101", config: "3 BHK Apartment", size: "1850 Sqft", price: "₹1.82 Cr", status: "AVAILABLE" },
            { number: "A-102", config: "3 BHK Apartment", size: "1850 Sqft", price: "₹1.82 Cr", status: "AVAILABLE" },
            { number: "B-201", config: "4 BHK Villa", size: "2600 Sqft", price: "₹2.55 Cr", status: "HOLD" },
            { number: "C-104", config: "Retail Shop", size: "1200 Sqft", price: "₹3.10 Cr", status: "BLOCKED" }
          ]);
          return 100;
        }
        return prev + 30;
      });
    }, 800);
  };

  const handleSaveProject = () => {
    alert(`Project "${name}" and all ${parsedUnits.length} parsed inventory units have been saved successfully!`);
    setStep(1);
    setName("");
    setLocation("");
    setFileName("");
    setParsedUnits([]);
  };

  return (
    <div className="max-w-4xl space-y-6 text-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Project</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">Define project configuration templates and upload Excel spreadsheets.</p>
      </div>

      {step === 1 ? (
        /* Form & Upload Area */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-indigo-500" />
              <span>Project Schema Configuration</span>
            </h3>

            <form onSubmit={handleUploadInventory} className="space-y-4 text-xs font-semibold text-slate-400">
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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  Upload & Parse Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Parsing Results */
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
          {parsing ? (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
              <div>
                <h3 className="font-extrabold text-base text-slate-800">AI Parsing spreadsheet...</h3>
                <p className="text-slate-500 text-xs mt-1">Extracting units metadata from file rows.</p>
              </div>
              <div className="w-48 bg-slate-100 rounded-full h-1.5 mx-auto overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-base text-slate-900">Parsing Complete! 4 Units Extracted.</h3>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[9px]">
                    <tr>
                      <th className="px-4 py-3">Unit Number</th>
                      <th className="px-4 py-3">Description Template</th>
                      <th className="px-4 py-3">Area Size</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Availability Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedUnits.map((unit) => (
                      <tr key={unit.number} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{unit.number}</td>
                        <td className="px-4 py-3.5">{unit.config}</td>
                        <td className="px-4 py-3.5">{unit.size}</td>
                        <td className="px-4 py-3.5 font-extrabold text-[#16c47f]">{unit.price}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            unit.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-600 border border-emerald-250" :
                            unit.status === "HOLD" ? "bg-amber-50 text-amber-600 border border-amber-250" :
                            "bg-red-50 text-red-655 border border-red-250"
                          }`}>
                            {unit.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-sm font-bold">
                <button 
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-transparent text-slate-500 hover:text-slate-800 rounded-xl transition"
                >
                  Re-upload
                </button>
                <button 
                  onClick={handleSaveProject}
                  className="px-5 py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold rounded-xl shadow-lg transition"
                >
                  Save Project & Units
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
