"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, MapPin, Clock, Gift, Award, Sparkles, Send, CheckCircle2, X, PlusCircle, Coins, ShieldCheck } from "lucide-react";
import { maskPhone } from "@/lib/mask";

interface Follower {
  id: string;
  agent_id: string;
  created_at: string;
  profiles: { name: string; phone: string; agency_name: string; location: string };
  followedProjects?: string[];
}

interface IssuedBonus {
  id: string;
  agent_name: string;
  agent_phone: string;
  bonus_title: string;
  bonus_type: "xp" | "voucher" | "commission" | "pass";
  value: string;
  issued_at: string;
  status: "Active" | "Claimed";
}

export default function BuilderFollowersPage() {
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<Follower[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"followers" | "rewards" | "assigned">("followers");
  const [isSubBuilder, setIsSubBuilder] = useState(false);

  // Bonus Modal State
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [selectedAgentForBonus, setSelectedAgentForBonus] = useState<Follower | null>(null);
  const [bonusTarget, setBonusTarget] = useState<"all" | "single">("all");
  const [bonusType, setBonusType] = useState<"xp" | "voucher" | "commission" | "pass">("xp");
  const [customBonusTitle, setCustomBonusTitle] = useState("+500 XP Followers Loyalty Bonus");
  const [sendingBonus, setSendingBonus] = useState(false);
  const [bonusSuccessMsg, setBonusSuccessMsg] = useState("");

  // Local storage history of issued bonuses
  const [issuedBonuses, setIssuedBonuses] = useState<IssuedBonus[]>([
    {
      id: "b-01",
      agent_name: "Sreenivas Rao",
      agent_phone: "+91 98765 43210",
      bonus_title: "+500 XP Followers Loyalty Bonus",
      bonus_type: "xp",
      value: "500 XP",
      issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      status: "Claimed"
    },
    {
      id: "b-02",
      agent_name: "Amit Sharma",
      agent_phone: "+91 99123 45678",
      bonus_title: "₹1,000 Amazon Voucher Sponsor",
      bonus_type: "voucher",
      value: "₹1,000",
      issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      status: "Active"
    }
  ]);

  useEffect(() => {
    loadFollowers();
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (tab === "assigned") {
        setActiveSubTab("assigned");
      } else if (tab === "rewards" || tab === "bonus") {
        setActiveSubTab("rewards");
      }
      
      const stored = localStorage.getItem("builder_issued_follower_bonuses");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIssuedBonuses(parsed);
          }
        } catch (e) {}
      }
    }
  }, []);

  async function loadFollowers() {
    setLoading(true);
    try {
      const [res, profileRes] = await Promise.all([
        fetch("/api/agent-follow"),
        fetch("/api/profile")
      ]);

      if (res.ok) {
        const data = await res.json();
        setFollowers(data.followers || []);
        setAssignedAgents(data.assignedAgents || []);
      }

      if (profileRes.ok) {
        const profData = await profileRes.json();
        setIsSubBuilder(!!profData.profile?.parent_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const handleOpenBonusModal = (follower?: Follower) => {
    if (follower) {
      setSelectedAgentForBonus(follower);
      setBonusTarget("single");
      setCustomBonusTitle(`Exclusive Bonus for ${follower.profiles?.name || "Agent"}`);
    } else {
      setSelectedAgentForBonus(null);
      setBonusTarget("all");
      setCustomBonusTitle("+500 XP Followers Loyalty Bonus");
    }
    setShowBonusModal(true);
  };

  const handleGrantBonus = async () => {
    setSendingBonus(true);
    setBonusSuccessMsg("");

    let targetAgentsCount = 1;
    let targetName = selectedAgentForBonus ? selectedAgentForBonus.profiles?.name || "Agent" : "All Followers";

    if (bonusTarget === "all") {
      targetAgentsCount = Math.max(1, followers.length);
    }

    // Value mapping
    let valueStr = "500 XP";
    if (bonusType === "voucher") valueStr = "₹1,000 Voucher";
    if (bonusType === "commission") valueStr = "+1% Commission";
    if (bonusType === "pass") valueStr = "VIP Launch Pass";

    // Build new issued records
    const newRecords: IssuedBonus[] = [];
    if (bonusTarget === "single" && selectedAgentForBonus) {
      newRecords.push({
        id: `bonus-${Date.now()}`,
        agent_name: selectedAgentForBonus.profiles?.name || "Agent",
        agent_phone: selectedAgentForBonus.profiles?.phone || "",
        bonus_title: customBonusTitle,
        bonus_type: bonusType,
        value: valueStr,
        issued_at: new Date().toISOString(),
        status: "Active"
      });
    } else {
      // All followers
      if (followers.length > 0) {
        followers.forEach((f, idx) => {
          newRecords.push({
            id: `bonus-${Date.now()}-${idx}`,
            agent_name: f.profiles?.name || "Agent",
            agent_phone: f.profiles?.phone || "",
            bonus_title: customBonusTitle,
            bonus_type: bonusType,
            value: valueStr,
            issued_at: new Date().toISOString(),
            status: "Active"
          });
        });
      } else {
        newRecords.push({
          id: `bonus-${Date.now()}`,
          agent_name: "Follower Agents",
          agent_phone: "+91 98765 43210",
          bonus_title: customBonusTitle,
          bonus_type: bonusType,
          value: valueStr,
          issued_at: new Date().toISOString(),
          status: "Active"
        });
      }
    }

    setTimeout(() => {
      const updated = [...newRecords, ...issuedBonuses];
      setIssuedBonuses(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("builder_issued_follower_bonuses", JSON.stringify(updated));

        // Push new reward directly to mock_agent_rewards so Agent Dashboard receives it
        const existingRewards = JSON.parse(localStorage.getItem("mock_agent_rewards") || "[]");
        const newRewards = newRecords.map(rec => ({
          id: rec.id,
          builderName: "Prestige Group",
          title: rec.bonus_title,
          type: rec.bonus_type,
          value: rec.value,
          points: rec.bonus_type === "xp" ? 500 : rec.bonus_type === "voucher" ? 1000 : 250,
          issuedAt: rec.issued_at,
          status: "pending"
        }));
        localStorage.setItem("mock_agent_rewards", JSON.stringify([...newRewards, ...existingRewards]));
      }
      setSendingBonus(false);
      setBonusSuccessMsg(`🎉 Successfully distributed "${customBonusTitle}" to ${targetName} (${targetAgentsCount} agent${targetAgentsCount > 1 ? "s" : ""})!`);
      setTimeout(() => {
        setShowBonusModal(false);
        setBonusSuccessMsg("");
      }, 2500);
    }, 1000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  const listToRender = activeSubTab === "assigned" ? assignedAgents : followers;

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col overflow-hidden text-slate-800 space-y-4">
      
      {/* Fixed Top Controls (No Scroll) */}
      <div className="shrink-0 space-y-4">
        {/* Top Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Followers & Rewards</h1>
            <p className="text-[#64748b] text-xs font-semibold mt-0.5">
              Manage your network of channel partner followers and grant exclusive bonuses.
            </p>
          </div>

          {/* Bonus Action Button */}
          <button
            onClick={() => handleOpenBonusModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center space-x-2 transition"
          >
            <Gift className="w-4 h-4 animate-bounce" />
            <span>Bonus for My Followers</span>
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-bold uppercase tracking-wider w-fit">
          <button
            onClick={() => setActiveSubTab("followers")}
            className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center space-x-1.5 ${
              activeSubTab === "followers" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Direct Followers ({followers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("rewards")}
            className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center space-x-1.5 ${
              activeSubTab === "rewards" ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            <span>Follower Rewards ({issuedBonuses.length})</span>
          </button>

          {isSubBuilder && (
            <button
              onClick={() => setActiveSubTab("assigned")}
              className={`px-4 py-2 rounded-lg transition shrink-0 flex items-center space-x-1.5 ${
                activeSubTab === "assigned" ? "bg-white text-purple-650 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-500" />
              <span>Assigned Agents ({assignedAgents.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content Container (Only this scrolls) */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-6 pr-1 space-y-4">   </div>

      {/* TAB 1 & TAB 3: Followers / Assigned Agents List */}
      {(activeSubTab === "followers" || activeSubTab === "assigned") && (
        <>
          {listToRender.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500">
                {activeSubTab === "assigned"
                  ? "No agents have been assigned to you by your Super Builder yet."
                  : "No agents are following you yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listToRender.map((f) => (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeSubTab === "assigned" ? "bg-purple-100" : "bg-emerald-50"}`}>
                      <Users className={`w-5 h-5 ${activeSubTab === "assigned" ? "text-purple-650" : "text-emerald-600"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-extrabold text-slate-900">{f.profiles?.name || "Agent"}</p>
                        {activeSubTab === "assigned" && (
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-650 border border-purple-200 rounded text-[8px] font-extrabold">
                            Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {f.profiles?.agency_name || "Independent"} · {maskPhone(f.profiles?.phone)}
                        {f.profiles?.location && (
                          <span className="inline-flex items-center ml-2">
                            <MapPin className="w-3 h-3 mr-0.5" />
                            {f.profiles.location}
                          </span>
                        )}
                      </p>
                      {f.followedProjects && f.followedProjects.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Followed:</span>
                          {f.followedProjects.map((p, idx) => (
                            <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleOpenBonusModal(f)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Send Bonus</span>
                    </button>
                    <div className="flex items-center space-x-1 text-[10px] text-slate-400 hidden sm:flex">
                      <Clock className="w-3 h-3" />
                      <span>
                        {activeSubTab === "assigned"
                          ? `Assigned ${timeAgo(f.created_at)}`
                          : `Followed ${timeAgo(f.created_at)}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: Follower Rewards & Bonuses Vault */}
      {activeSubTab === "rewards" && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                <Sparkles className="w-4 h-4" />
                <span>Follower Bonus Program</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">Reward Loyal Channel Partner Agents</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Distribute engagement XP, exclusive launch passes, or gift vouchers to motivate brokers to drive project leads.
              </p>
            </div>
            <button
              onClick={() => handleOpenBonusModal()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-2 shrink-0"
            >
              <Gift className="w-4 h-4" />
              <span>Issue New Bonus</span>
            </button>
          </div>

          {/* Issued Bonuses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Issued Bonuses & Rewards History
              </h3>
              <span className="text-xs font-bold text-slate-400">{issuedBonuses.length} total</span>
            </div>

            <div className="divide-y divide-slate-100">
              {issuedBonuses.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                      {b.bonus_type === "xp" ? "🏆" : b.bonus_type === "voucher" ? "🎁" : b.bonus_type === "commission" ? "🚀" : "🎟️"}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">{b.bonus_title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Recipient: <span className="font-bold text-slate-700">{b.agent_name}</span> ({maskPhone(b.agent_phone)})
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center space-x-4">
                    <div>
                      <div className="font-extrabold text-amber-600 text-xs">{b.value}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{timeAgo(b.issued_at)}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      b.status === "Claimed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DISTRIBUTE BONUS MODAL */}
      {showBonusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-amber-600 font-extrabold text-base">
                <Gift className="w-5 h-5" />
                <span>Bonus for My Followers</span>
              </div>
              <button onClick={() => setShowBonusModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bonusSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p>{bonusSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-bold">
                {/* Target Audience Selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Select Target Followers</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBonusTarget("all")}
                      className={`p-3 rounded-xl border text-left transition ${
                        bonusTarget === "all" ? "bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="font-extrabold text-xs">All Followers</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{followers.length} active agents</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBonusTarget("single")}
                      className={`p-3 rounded-xl border text-left transition ${
                        bonusTarget === "single" ? "bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-400" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <div className="font-extrabold text-xs">Single Agent</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">
                        {selectedAgentForBonus ? selectedAgentForBonus.profiles?.name : "Select from list"}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bonus Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Bonus Reward Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setBonusType("xp"); setCustomBonusTitle("+500 XP Followers Loyalty Bonus"); }}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        bonusType === "xp" ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-base">🏆</span>
                      <div>
                        <div className="font-extrabold text-xs">+500 XP Points</div>
                        <div className="text-[9px] text-slate-400">Boost Agent Rank</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setBonusType("voucher"); setCustomBonusTitle("₹1,000 Gift Voucher Sponsor"); }}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        bonusType === "voucher" ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-base">🎁</span>
                      <div>
                        <div className="font-extrabold text-xs">₹1,000 Gift Voucher</div>
                        <div className="text-[9px] text-slate-400">Shopping Pass</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setBonusType("commission"); setCustomBonusTitle("+1% Commission Boost Reward"); }}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        bonusType === "commission" ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-base">🚀</span>
                      <div>
                        <div className="font-extrabold text-xs">+1% Commission</div>
                        <div className="text-[9px] text-slate-400">Extra Payout</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setBonusType("pass"); setCustomBonusTitle("VIP Project Launch Pass"); }}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition ${
                        bonusType === "pass" ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="text-base">🎟️</span>
                      <div>
                        <div className="font-extrabold text-xs">VIP Launch Pass</div>
                        <div className="text-[9px] text-slate-400">Early Booking</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom Title */}
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Bonus Title / Note</label>
                  <input
                    type="text"
                    value={customBonusTitle}
                    onChange={(e) => setCustomBonusTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 text-slate-800 text-xs font-semibold outline-none transition"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowBonusModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGrantBonus}
                    disabled={sendingBonus}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md transition flex items-center space-x-1.5"
                  >
                    {sendingBonus ? "Distributing..." : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Bonus Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
