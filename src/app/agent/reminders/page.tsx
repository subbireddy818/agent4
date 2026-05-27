"use client";

import { useState } from "react";
import { 
  Bell, Clock, Plus, Trash2, 
  CheckSquare, Square, X, AlertCircle 
} from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  leadName: string;
  dateTime: string;
  description: string;
  type: "Follow-Up" | "Site Visit" | "Launch" | "Payment";
  isCompleted: boolean;
}

export default function ReminderCenter() {
  const [activeFilter, setActiveFilter] = useState<"All" | "Follow-Up" | "Site Visit" | "Launch" | "Payment">("All");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form States
  const [newTitle, setNewTitle] = useState("");
  const [newLeadName, setNewLeadName] = useState("");
  const [newDateTime, setNewDateTime] = useState("");
  const [newType, setNewType] = useState<Reminder["type"]>("Follow-Up");
  const [newDesc, setNewDesc] = useState("");

  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", title: "Call about budget details", leadName: "Ramesh Kumar", dateTime: "Today, 5:00 PM", description: "Discuss subvention scheme options for Kokapet.", type: "Follow-Up", isCompleted: false },
    { id: "2", title: "Site visit at Skyline Heights", leadName: "Neha Singh", dateTime: "Tomorrow, 11:30 AM", description: "Meet builder CSM at sample flat site.", type: "Site Visit", isCompleted: false },
    { id: "3", title: "Send floor plan layouts", leadName: "Amit Patel", dateTime: "May 28, 4:00 PM", description: "WhatsApp brochure sheets to client.", type: "Follow-Up", isCompleted: false }
  ]);

  const filteredReminders = reminders.filter(rem => {
    return activeFilter === "All" || rem.type === activeFilter;
  });

  const handleToggleComplete = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDateTime) return;

    const newRem: Reminder = {
      id: Date.now().toString(),
      title: newTitle,
      leadName: newLeadName || "General",
      dateTime: newDateTime.replace("T", " "),
      description: newDesc,
      type: newType,
      isCompleted: false
    };

    setReminders([newRem, ...reminders]);
    setNewTitle("");
    setNewLeadName("");
    setNewDateTime("");
    setNewDesc("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reminder Center</h1>
          <p className="text-[#64748b] text-xs font-semibold mt-0.5">Manage workflow schedules and follow-up alerts.</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="glow-button px-4 py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Reminder</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold overflow-x-auto w-full md:w-auto">
        {[
          { id: "All", label: "All Reminders" },
          { id: "Follow-Up", label: "Follow-Ups" },
          { id: "Site Visit", label: "Site Visits" },
          { id: "Launch", label: "Launches" },
          { id: "Payment", label: "Payments" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as any)}
            className={`px-4 py-2 rounded-lg transition shrink-0 ${
              activeFilter === tab.id 
                ? "bg-[#25d366] text-white" 
                : "text-slate-500 hover:text-slate-850"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {filteredReminders.map((rem) => (
          <div 
            key={rem.id} 
            className={`bg-white p-4 rounded-xl border border-slate-200 hover:border-[#25d366]/30 transition flex items-start justify-between gap-4 shadow-sm ${
              rem.isCompleted ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <button 
                onClick={() => handleToggleComplete(rem.id)}
                className="mt-1 text-slate-400 hover:text-[#25d366] transition shrink-0"
              >
                {rem.isCompleted ? (
                  <CheckSquare className="w-4.5 h-4.5 text-[#25d366]" />
                ) : (
                  <Square className="w-4.5 h-4.5" />
                )}
              </button>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className={`font-bold text-sm text-slate-900 ${rem.isCompleted ? "line-through text-slate-400" : ""}`}>
                    {rem.title}
                  </h4>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    rem.type === "Follow-Up" ? "bg-red-50 text-red-655" :
                    rem.type === "Site Visit" ? "bg-indigo-50 text-indigo-600" :
                    rem.type === "Launch" ? "bg-purple-50 text-purple-600" :
                    "bg-emerald-50 text-emerald-600"
                  }`}>
                    {rem.type}
                  </span>
                </div>
                
                {rem.description && (
                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xl">{rem.description}</p>
                )}

                <div className="text-[10px] text-slate-400 flex items-center space-x-2 pt-1 font-semibold">
                  <span>Lead: <span className="text-slate-600 font-bold">{rem.leadName}</span></span>
                </div>
              </div>
            </div>

            {/* Time and delete */}
            <div className="flex flex-col items-end justify-between self-stretch shrink-0">
              <div className="text-xs font-bold text-[#16c47f] flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{rem.dateTime}</span>
              </div>

              <button 
                onClick={() => handleDeleteReminder(rem.id)}
                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition mt-2"
                title="Delete Reminder"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredReminders.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-500" />
            <div className="font-bold">No reminders scheduled in this category</div>
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-[#25d366]" />
              <span>Create Reminder</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">Schedule follow-ups and notifications for your CRM pipeline.</p>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Reminder Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Call client about layouts"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">Category</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                  >
                    <option>Follow-Up</option>
                    <option>Site Visit</option>
                    <option>Launch</option>
                    <option>Payment</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block uppercase tracking-wider text-[10px]">Client / Project</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramesh"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 outline-none text-sm font-medium transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Date & Time</label>
                <input 
                  type="datetime-local" 
                  required
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Description Note</label>
                <textarea 
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-sm font-bold">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-transparent text-slate-500 hover:text-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white rounded-xl shadow-lg transition"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
