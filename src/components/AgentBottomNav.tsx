"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WhatsAppSimulationWidget from "./WhatsAppSimulationWidget";
import { 
  Home, Users, Briefcase, Calendar, 
  Award, User 
} from "lucide-react";

export default function AgentBottomNav() {
  const pathname = usePathname();
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Load agent name from localStorage
  useEffect(() => {
    const name = localStorage.getItem("agentsapp_logged_in_user") || "Agent";
    setAgentName(name.split(" ")[0]); // First name only
    setChatHistory([`🤖 Bot: Welcome ${name.split(" ")[0]}! How can I help you today? You can write in natural English or Hinglish.`]);
  }, []);

  // Auto-scroll chat to bottom whenever history changes or modal opens
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatHistory, showBotModal]);

  // Poll for simulated outbound broadcasts (builder campaigns) directed to this agent
  useEffect(() => {
    // Record the mount time to poll for new messages
    const startTime = new Date().toISOString();
    const seenIds = new Set<string>();
    const rawPhone = localStorage.getItem("agentsapp_logged_in_phone") || "+91 98765 43210";

    // 1. Load historical messages (lifetime)
    const loadHistory = async () => {
      try {
        const beginningOfTime = "2000-01-01T00:00:00.000Z";
        const res = await getNewSimulatedMessages(rawPhone, beginningOfTime);
        if (res.ok && res.messages && res.messages.length > 0) {
          const historyMsgs: string[] = [];
          res.messages.forEach((msg: any) => {
            if (!seenIds.has(msg.id)) {
              seenIds.add(msg.id);
              if (msg.direction === "inbound") {
                historyMsgs.push(`👤 You: ${msg.content}`);
              } else {
                historyMsgs.push(`🤖 Bot:\n${msg.content}`);
              }
            }
          });
          if (historyMsgs.length > 0) {
            setChatHistory(prev => [...prev, ...historyMsgs]);
          }
        }
      } catch (err) {
        console.error("Error loading historical broadcasts:", err);
      }
    };
    
    loadHistory();

    // 2. Poll for new messages
    const interval = setInterval(async () => {
      try {
        const res = await getNewSimulatedMessages(rawPhone, startTime, "outbound");
        if (res.ok && res.messages && res.messages.length > 0) {
          const newMsgs: string[] = [];
          res.messages.forEach((msg: any) => {
            if (!seenIds.has(msg.id)) {
              seenIds.add(msg.id);
              if (msg.direction === "inbound") {
                newMsgs.push(`👤 You: ${msg.content}`);
              } else {
                newMsgs.push(`🤖 Bot:\n${msg.content}`);
              }
            }
          });
          if (newMsgs.length > 0) {
            setChatHistory(prev => [...prev, ...newMsgs]);
            // Automatically open the bot modal when a new campaign broadcast arrives so the agent sees it instantly
            setShowBotModal(true);
          }
        }
      } catch (err) {
        console.error("Error polling simulated broadcasts:", err);
      }
    }, 4000); // Check every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { name: "Home", href: "/agent/dashboard", icon: Home },
    { name: "Leads", href: "/agent/pipeline", icon: Users },
    { name: "Inventory", href: "/agent/inventory", icon: Briefcase },
    { name: "Events", href: "/agent/invitations", icon: Calendar },
    { name: "Rewards", href: "/agent/rewards", icon: Award },
    { name: "Profile", href: "/agent/profile", icon: User },
  ];

  return (
    <>
      {/* Bottom Nav Bar - Mobile Only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 py-2 px-3 flex justify-around items-center shadow-lg">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center space-y-1 text-[#64748b] hover:text-[#16c47f] transition ${
                isActive ? "text-[#25d366]" : ""
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-bold tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>

      <WhatsAppSimulationWidget />
    </>
  );
}
