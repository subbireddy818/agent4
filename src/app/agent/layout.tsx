"use client";

import { useEffect, useState } from "react";
import AgentSidebar from "@/components/AgentSidebar";
import AgentBottomNav from "@/components/AgentBottomNav";
import SessionSync from "@/components/SessionSync";
import { Clock, XCircle, Loader2 } from "lucide-react";
import { performLogout } from "@/components/SessionSync";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"loading" | "approved" | "pending" | "rejected">("loading");

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            const s = data.profile.status;
            if (s === "approved") setStatus("approved");
            else if (s === "rejected") setStatus("rejected");
            else setStatus("pending");
          } else {
            setStatus("pending");
          }
        } else {
          setStatus("approved"); // fallback to not block if API fails
        }
      } catch {
        setStatus("approved"); // fallback
      }
    }
    checkStatus();
  }, []);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#25d366]" />
      </div>
    );
  }

  // Pending approval
  if (status === "pending") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc] p-6">
        <SessionSync />
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Approval Pending</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your registration has been submitted successfully. Please wait while our admin team reviews and approves your profile. You will get access to the dashboard once approved.
          </p>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-semibold">
            This usually takes a few hours. You will be able to access the app once your profile is approved by the admin.
          </div>
          <button
            onClick={() => performLogout()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Rejected
  if (status === "rejected") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc] p-6">
        <SessionSync />
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Registration Rejected</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Unfortunately, your agent registration has been rejected by the admin team. If you believe this is a mistake, please contact support.
          </p>
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            You cannot access the agent dashboard. Please contact the admin for more information.
          </div>
          <button
            onClick={() => performLogout()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Approved — show normal layout
  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-slate-800">
      <SessionSync />
      <div className="hidden lg:block shrink-0">
        <AgentSidebar />
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        <AgentBottomNav />
      </div>
    </div>
  );
}
