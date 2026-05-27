import BuilderSidebar from "@/components/BuilderSidebar";

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#070b13] overflow-hidden">
      <BuilderSidebar />
      <main className="flex-1 overflow-y-auto p-8 text-slate-100">
        {children}
      </main>
    </div>
  );
}
