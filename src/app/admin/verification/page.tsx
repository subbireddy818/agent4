"use client";

import { useState, useEffect } from "react";
import { 
  Check, X, FileText, ShieldAlert, 
  ArrowRight, ShieldCheck, Eye, Loader2, Award 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getVerificationRequests, approveBrokerAction, rejectBrokerAction } from "./actions";

interface BrokerRequest {
  id: string;
  name: string;
  agency: string;
  phone: string;
  email: string;
  rera: string;
  docs: { name: string; type: string; url: string }[];
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
  assignedCpId?: string;
  referredBy?: string | null;
}

export default function VerificationQueue() {
  const [requests, setRequests] = useState<BrokerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [selectedRequest, setSelectedRequest] = useState<BrokerRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveSuccessId, setApproveSuccessId] = useState<string | null>(null);

  // Load requests dynamically from Supabase
  async function loadRequests() {
    setLoading(true);
    try {
      const res = await getVerificationRequests();
      if (res.success && res.profiles) {
        const mapped: BrokerRequest[] = res.profiles.map((p: any) => {
          // Find referral match
          const matchingRef = res.referrals?.find(r => r.referred_phone === p.phone);
          const referredBy = matchingRef?.profiles ? (matchingRef.profiles as any).cp_id : null;

          // Default mock docs since files aren't stored in base tables
          const mockDocs = [
            { name: "RERA Certificate.pdf", type: "RERA Copy", url: "#" },
            { name: "PAN Card Copy.jpg", type: "PAN Card", url: "#" },
            { name: "Aadhaar Card.pdf", type: "Identity Proof", url: "#" }
          ];

          // Map enum value to display string casing
          let statusStr: "Pending" | "Approved" | "Rejected" = "Pending";
          if (p.status === "approved") statusStr = "Approved";
          if (p.status === "rejected") statusStr = "Rejected";

          return {
            id: p.id,
            name: p.name,
            agency: p.agency_name || "Independent Broker",
            phone: p.phone,
            email: p.email || "No Email",
            rera: p.rera_number || "No RERA Registered",
            docs: mockDocs,
            status: statusStr,
            rejectionReason: p.rejection_reason,
            assignedCpId: p.cp_id,
            referredBy: referredBy
          };
        });
        setRequests(mapped);
      }
    } catch (err) {
      console.error("Error loading verification requests from database:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter(r => r.status === activeTab);

  const handleApprove = async (id: string, name: string) => {
    setLoading(true);
    try {
      const currentReq = requests.find(r => r.id === id);
      if (!currentReq) throw new Error("Request not found");

      const res = await approveBrokerAction(id, currentReq.phone, name);
      if (!res.success) {
        throw new Error(res.error || "Approval failed on server");
      }

      const generatedId = res.generatedId || "";

      // 4. Send live WhatsApp approval message using GallaBox API
      if (currentReq?.phone) {
        try {
          await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              phone: currentReq.phone,
              text: `🎉 *Congratulations ${name}!* Your agentsapp Channel Partner verification has been approved. Your new CP ID is *${generatedId}*. Welcome aboard!`
            })
          });
        } catch (err) {
          console.error("Failed to send outbound GallaBox welcome notification:", err);
        }
      }

      setApproveSuccessId(generatedId);
      setSelectedRequest(null);
      
      // Reload queue data
      await loadRequests();

      setTimeout(() => {
        setApproveSuccessId(null);
      }, 4500);
    } catch (err: any) {
      alert("Error approving Broker: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReject = (req: BrokerRequest) => {
    setSelectedRequest(req);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !rejectReason) return;
    setLoading(true);

    try {
      const res = await rejectBrokerAction(selectedRequest.id, selectedRequest.phone, rejectReason);
      if (!res.success) {
        throw new Error(res.error || "Rejection failed on server");
      }

      // 3. Send WhatsApp rejection notification using GallaBox API
      if (selectedRequest?.phone) {
        try {
          await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              phone: selectedRequest.phone,
              text: `❌ *Verification Update:* Your agentsapp broker verification was rejected.\n\n📝 Reason: *${rejectReason}*\n\nPlease log back in and upload the correct documents.`
            })
          });
        } catch (err) {
          console.error("Failed to send outbound GallaBox rejection notification:", err);
        }
      }

      setShowRejectModal(false);
      setRejectReason("");
      setSelectedRequest(null);
      
      // Reload queue
      await loadRequests();
    } catch (err: any) {
      alert("Error rejecting broker: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">CP Verification Portal</h1>
        <p className="text-[#64748b] text-xs font-semibold mt-0.5">Approve broker registrations and assign CP ID credentials.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-xl text-xs font-bold overflow-x-auto w-full md:w-auto">
        {["Pending", "Approved", "Rejected"].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab as any);
              setSelectedRequest(null);
            }}
            className={`px-4 py-2 rounded-lg transition shrink-0 ${
              activeTab === tab 
                ? "bg-[#25d366] text-white" 
                : "text-slate-500 hover:text-slate-850"
            }`}
          >
            {tab} Queue ({requests.filter(r => r.status === tab).length})
          </button>
        ))}
      </div>

      {/* Loader indicator */}
      {loading && (
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-[#25d366]" />
          <span>Syncing with database...</span>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left - Broker request cards */}
        <div className="lg:col-span-6 space-y-4">
          {filteredRequests.map(req => (
            <div 
              key={req.id} 
              onClick={() => setSelectedRequest(req)}
              className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                selectedRequest?.id === req.id 
                  ? "border-[#25d366] ring-1 ring-[#25d366]/40" 
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-base text-slate-900">{req.name}</h4>
                  <div className="text-xs text-slate-550 mt-1 font-semibold text-slate-500">{req.agency}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{req.phone} · {req.email}</div>
                  {req.referredBy && (
                    <div className="mt-1.5 inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#25d366]/10 text-[9px] text-[#16c47f] font-bold">
                      <span>Attributed to Referrer: {req.referredBy}</span>
                    </div>
                  )}
                </div>

                {req.status === "Approved" && (
                  <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-2.5 py-0.5 rounded font-extrabold tracking-wider">
                    {req.assignedCpId}
                  </span>
                )}
                {req.status === "Rejected" && (
                  <span className="text-[9px] bg-red-50 border border-red-200 text-red-600 px-2.5 py-0.5 rounded font-extrabold tracking-wider">
                    Rejected
                  </span>
                )}
              </div>

              {/* Action tags */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                <span className="text-slate-400 font-semibold">{req.docs.length} Documents uploaded</span>
                <span className="text-[#16c47f] hover:underline flex items-center">
                  <span>Open Review</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </div>
          ))}

          {!loading && filteredRequests.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 shadow-sm">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <div className="font-bold">Queue is completely empty!</div>
            </div>
          )}
        </div>

        {/* Right - Documents Review Pane */}
        <div className="lg:col-span-6">
          {selectedRequest ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedRequest.name}</h3>
                <p className="text-xs text-slate-550 font-semibold mt-0.5 text-slate-550">Agency: {selectedRequest.agency}</p>
                <p className="text-xs text-[#16c47f] font-bold mt-1.5 uppercase">RERA ID: {selectedRequest.rera}</p>
              </div>

              {/* Document list */}
              <div className="space-y-3">
                <div className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Submitted Document Files</div>
                <div className="space-y-2">
                  {selectedRequest.docs.map((doc, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold">
                      <div className="flex items-center space-x-2 text-slate-700">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate max-w-[180px]">{doc.name}</span>
                      </div>
                      <button 
                        onClick={() => alert(`Opening preview for ${doc.name}`)}
                        className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-250 text-slate-655 rounded-lg text-[10px] flex items-center space-x-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection reason if rejected */}
              {selectedRequest.status === "Rejected" && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-655 space-y-1 font-semibold">
                  <div className="font-bold text-red-700">Rejection Reason:</div>
                  <p>{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {/* Actions if Pending */}
              {selectedRequest.status === "Pending" && (
                <div className="pt-2 grid grid-cols-2 gap-3 font-bold text-sm">
                  <button 
                    onClick={() => handleOpenReject(selectedRequest)}
                    className="py-3 bg-red-50 hover:bg-red-100 text-red-655 border border-red-200 rounded-xl transition"
                  >
                    Reject Application
                  </button>

                  <button 
                    onClick={() => handleApprove(selectedRequest.id, selectedRequest.name)}
                    className="py-3 bg-[#25d366] hover:bg-[#16c47f] text-white rounded-xl shadow-md transition"
                  >
                    Approve & Issue CP ID
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-250 text-center text-slate-400 shadow-sm">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-bounce" />
              <div className="font-bold text-slate-700">Select a Broker Request</div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Select a broker card on the left to verify credentials and documents.</p>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {approveSuccessId && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white border-2 border-[#25d366] text-[#16c47f] rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-10">
          <Award className="w-5 h-5 text-[#25d366] animate-pulse" />
          <span>Broker verified successfully! Assigned CP ID: {approveSuccessId}</span>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button 
              onClick={() => setShowRejectModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 p-1 rounded-lg hover:bg-slate-50 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              <span>Reject Broker Application</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">Explain why the documents were rejected. They will receive this feedback via WhatsApp.</p>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs font-semibold text-slate-400">
              <div className="space-y-1.5">
                <label className="block uppercase tracking-wider text-[10px]">Rejection Reason Note</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="e.g. Uploaded RERA certificate is illegible. Please upload a clear digital PDF copy."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3 text-slate-800 placeholder-slate-400 outline-none text-sm font-medium transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-sm font-bold">
                <button 
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2.5 bg-transparent text-slate-500 hover:text-slate-850 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg transition"
                >
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
