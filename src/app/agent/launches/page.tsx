"use client";

import { useState } from "react";
import { 
  Calendar, MapPin, Sparkles, Check, 
  QrCode, X, Trophy 
} from "lucide-react";

interface LaunchEvent {
  id: string;
  project: string;
  location: string;
  dateTime: string;
  type: string;
  commission: string;
  perks: string[];
  rsvpCount: number;
  isRsvped: boolean;
}

export default function UpcomingLaunches() {
  const [events, setEvents] = useState<LaunchEvent[]>([
    {
      id: "1",
      project: "Prestige Urban Ore",
      location: "Kokapet, Hyderabad",
      dateTime: "May 30, 2026 · 11:00 AM",
      type: "CP Launch Meet",
      commission: "2.5% Payout",
      perks: ["Commission payout in 30 days", "Free marketing kit", "Lunch included"],
      rsvpCount: 142,
      isRsvped: false,
    },
    {
      id: "2",
      project: "Lodha Evermore",
      location: "Gachibowli, Hyderabad",
      dateTime: "June 15, 2026 · 4:00 PM",
      type: "Agent Launch Gathering",
      commission: "3.0% Payout (Launch week)",
      perks: ["First-tier unit lockings", "Spot booking gift vouchers", "High-tea reception"],
      rsvpCount: 89,
      isRsvped: false,
    }
  ]);

  const [activePassEvent, setActivePassEvent] = useState<LaunchEvent | null>(null);

  const handleRsvpToggle = (id: string) => {
    setEvents(events.map(ev => {
      if (ev.id === id) {
        const nextState = !ev.isRsvped;
        if (nextState) {
          setTimeout(() => {
            setActivePassEvent({ ...ev, isRsvped: true, rsvpCount: ev.rsvpCount + 1 });
          }, 300);
        }
        return { ...ev, isRsvped: nextState, rsvpCount: nextState ? ev.rsvpCount + 1 : ev.rsvpCount - 1 };
      }
      return ev;
    }));
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Launches & Events</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">Pre-launch events, builder meets, and commission launch updates.</p>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => (
          <div 
            key={ev.id} 
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#25d366]/40 transition-all flex flex-col justify-between"
          >
            {/* Header info */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#25d366]/10 text-[#16c47f]">
                  {ev.type}
                </span>
                
                {ev.isRsvped && (
                  <button 
                    onClick={() => setActivePassEvent(ev)}
                    className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center transition"
                    title="View QR Code Entry Pass"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{ev.project}</h3>
                <div className="text-xs text-slate-500 flex items-center mt-1 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                  <span>{ev.location}</span>
                </div>
              </div>

              {/* Commission and timing */}
              <div className="p-3.5 bg-slate-55/60 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs font-bold">
                <div className="text-slate-655 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-[#25d366] mr-1.5 shrink-0" />
                  <span>{ev.dateTime}</span>
                </div>
                
                <div className="text-[#16c47f] flex items-center">
                  <Trophy className="w-3.5 h-3.5 text-[#25d366] mr-1.5 shrink-0" />
                  <span>Commission: {ev.commission}</span>
                </div>
              </div>

              {/* Perks */}
              <div className="space-y-1.5">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Event Perks</div>
                <div className="space-y-1 text-xs font-semibold">
                  {ev.perks.map((p, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5 text-slate-500">
                      <span className="text-[#25d366]">•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RSVP Footer */}
            <div className="border-t border-slate-200/80 mt-6 pt-4 flex items-center justify-between">
              <div className="text-[10px] text-slate-500 font-bold">
                <span className="text-[#0f172a] font-extrabold">{ev.rsvpCount}</span> brokers attending
              </div>

              <button
                onClick={() => handleRsvpToggle(ev.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  ev.isRsvped 
                    ? "bg-slate-50 border border-[#25d366] text-[#16c47f] flex items-center space-x-1" 
                    : "bg-[#25d366] hover:bg-[#16c47f] text-white shadow-sm"
                }`}
              >
                {ev.isRsvped ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>RSVP Confirmed</span>
                  </>
                ) : (
                  <span>RSVP Now</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Entry Pass Modal Dialog */}
      {activePassEvent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl relative text-center animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button 
              onClick={() => setActivePassEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-full bg-[#25d366]/10 text-[#16c47f] flex items-center justify-center mx-auto mb-3 text-lg">
              🏆
            </div>

            <h2 className="text-base font-extrabold text-slate-900 mb-1">CP Meet Entry Pass</h2>
            <p className="text-xs text-[#16c47f] font-bold uppercase tracking-wider">{activePassEvent.project}</p>
            
            <p className="text-slate-500 text-[10px] mt-2 font-semibold leading-relaxed">
              Show this QR code at the reception desk for instant check-in.
            </p>

            {/* QR Code Graphic */}
            <div className="my-6 w-36 h-36 bg-slate-950 p-2.5 rounded-xl mx-auto flex items-center justify-center border border-slate-200 shadow-inner">
              <div className="w-full h-full border-4 border-slate-950 flex flex-col justify-between p-1 bg-white">
                <div className="flex justify-between">
                  <div className="w-6 h-6 bg-slate-950"></div>
                  <div className="w-6 h-6 bg-slate-950"></div>
                </div>
                <div className="w-12 h-3 bg-slate-950 self-center"></div>
                <div className="flex justify-between items-end">
                  <div className="w-6 h-6 bg-slate-950"></div>
                  <div className="w-3 h-3 bg-slate-950"></div>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-semibold p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-left space-y-1">
              <div>📍 <span className="text-slate-900 font-bold">{activePassEvent.location}</span></div>
              <div>📅 <span className="text-slate-900 font-bold">{activePassEvent.dateTime}</span></div>
              <div>👤 Guest: <span className="text-[#16c47f] font-bold">Sreenivas Rao (CP-8402)</span></div>
            </div>

            <div className="mt-5">
              <button 
                onClick={() => setActivePassEvent(null)}
                className="w-full py-2.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
