"use client";

import { useEffect } from "react";
import AgentSidebar from "@/components/AgentSidebar";
import AgentBottomNav from "@/components/AgentBottomNav";
import SessionSync from "@/components/SessionSync";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Seed initial data if not present
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("agentsapp_agent_profile")) {
        localStorage.setItem("agentsapp_agent_profile", JSON.stringify({
          name: "Sreenivas Rao",
          agency: "Rao Real Estate Services",
          phone: "+91 98765 43210",
          email: "sreenivas@raorealty.in",
          rera: "RERA-HYD-551029",
          status: "Approved",
          cpId: "CP-8402",
          points: 1240,
          referralsCount: 2,
          quotaUsage: "12 / 50 Leads",
          quotaPercent: 24
        }));
      }

      if (!localStorage.getItem("agentsapp_referral_list")) {
        localStorage.setItem("agentsapp_referral_list", JSON.stringify([
          { id: "ref-1", name: "Prasad Goud", phone: "+91 99011 22334", status: "Approved", pointsAwarded: 500, date: "May 10, 2026" },
          { id: "ref-2", name: "Anil Kumar", phone: "+91 98480 22334", status: "Pending KYC", pointsAwarded: 0, date: "May 24, 2026" }
        ]));
      }

      if (!localStorage.getItem("agentsapp_leaderboard")) {
        localStorage.setItem("agentsapp_leaderboard", JSON.stringify([
          { rank: 1, name: "Prasad Goud", points: 4200, location: "Gachibowli" },
          { rank: 2, name: "Sreenivas Rao", points: 1240, location: "Kokapet" },
          { rank: 3, name: "Vikas Sharma", points: 890, location: "Ameerpet" },
        ]));
      }

      if (!localStorage.getItem("agentsapp_verification_requests")) {
        localStorage.setItem("agentsapp_verification_requests", JSON.stringify([
          {
            id: "req-1",
            name: "Rajesh Sekhar",
            agency: "Rajesh Estates & Realty",
            phone: "+91 99122 33445",
            email: "rajesh@rajeshestates.com",
            rera: "RERA-HYD-882103",
            docs: [
              { name: "RERA Certificate.pdf", type: "RERA Copy", url: "rera_cert.pdf" },
              { name: "PAN Card Copy.jpg", type: "PAN Card", url: "pan_card.jpg" },
              { name: "Aadhaar Card Copy.pdf", type: "Aadhaar", url: "aadhaar.pdf" }
            ],
            status: "Pending"
          },
          {
            id: "req-2",
            name: "Kiran Goud",
            agency: "Kiran Realty Services",
            phone: "+91 98450 12345",
            email: "kiran@kiranrealty.in",
            rera: "RERA-HYD-551029",
            docs: [
              { name: "RERA Certificate.pdf", type: "RERA Copy", url: "rera_cert.pdf" },
              { name: "GST registration.pdf", type: "GST copy", url: "gst.pdf" },
              { name: "Aadhaar Card.jpg", type: "Aadhaar", url: "aadhaar.jpg" }
            ],
            status: "Pending"
          }
        ]));
      }
    }
  }, []);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden text-slate-800">
      <SessionSync />
      {/* Desktop Sidebar navigation - hidden on mobile view */}
      <div className="hidden lg:block shrink-0">
        <AgentSidebar />
      </div>

      {/* Main app body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 lg:pb-8">
          {children}
        </main>
        
        {/* PWA Mobile Bottom Navigation */}
        <AgentBottomNav />
      </div>
    </div>
  );
}
