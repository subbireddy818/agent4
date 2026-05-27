"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Smartphone, ShieldAlert, ArrowLeft, 
  CheckCircle2, Loader2, KeyRound, Sparkles,
  MessageSquare, FileText, Upload, Clock, UserCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Capture URL parameters
  const initialRole = searchParams.get("role") || "agent";
  const refCode = searchParams.get("ref"); // Capture referral code
  
  const [role, setRole] = useState(initialRole);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  
  // Steps: 1: Phone, 2: OTP, 3: WhatsApp Verification, 4: KYC Upload, 5: Pending Approval
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // KYC Fields
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [reraNumber, setReraNumber] = useState("");
  const [reraUploaded, setReraUploaded] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);

  // WhatsApp verification state
  const [waVerified, setWaVerified] = useState(false);
  const [waVerifying, setWaVerifying] = useState(false);

  // Sync role changes from state to search params role
  useEffect(() => {
    const queryRole = searchParams.get("role");
    if (queryRole && queryRole !== role) {
      setRole(queryRole);
    }
  }, [searchParams]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setMessage("Please enter a valid phone number.");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    // Simulate sending OTP via SMS
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setMessage("OTP sent successfully to " + phone + ". (Use code: 123456)");
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== "" && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otp.join("");
    if (enteredCode.length < 6) {
      setMessage("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    setMessage("");

    if (enteredCode !== "123456") {
      setLoading(false);
      setMessage("Invalid OTP. Please enter the correct code (123456).");
      return;
    }

    try {
      // Format phone number
      const cleanPhone = phone.replace(/\s+/g, "");
      const formattedPhone = `+91 ${cleanPhone.slice(-10)}`;
      
      // Query profiles table in Supabase
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", formattedPhone)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Supabase query error:", error);
      }

      setLoading(false);

      if (profile) {
        // User exists -> Log them in and store their session profile in localStorage
        localStorage.setItem("agentsapp_logged_in_user", profile.name);
        localStorage.setItem("agentsapp_logged_in_phone", profile.phone);
        localStorage.setItem("agentsapp_logged_in_role", profile.role);
        
        // Route based on role
        if (profile.role === "builder") {
          router.push("/builder/dashboard");
        } else if (profile.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/agent/dashboard");
        }
      } else {
        // User does not exist
        if (role === "agent") {
          // Start broker onboarding wizard
          setStep(3);
        } else {
          // For builders or admins, create a default profile on the fly so the demo is smooth
          setLoading(true);
          const name = role === "builder" ? "Prestige Group" : "Ops Admin";
          
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert([{
              phone: formattedPhone,
              role: role,
              name: name,
              status: "approved",
              points: 0,
              referrals_count: 0
            }])
            .select()
            .single();

          setLoading(false);

          if (insertError) {
            setMessage("Failed to create profile in database. " + insertError.message);
          } else if (newProfile) {
            localStorage.setItem("agentsapp_logged_in_user", newProfile.name);
            localStorage.setItem("agentsapp_logged_in_phone", newProfile.phone);
            localStorage.setItem("agentsapp_logged_in_role", newProfile.role);
            router.push(role === "builder" ? "/builder/dashboard" : "/admin/dashboard");
          }
        }
      }
    } catch (err: any) {
      setLoading(false);
      setMessage("Connection error. Please try again.");
      console.error(err);
    }
  };

  const handleVerifyWhatsApp = () => {
    setWaVerifying(true);
    setTimeout(() => {
      setWaVerifying(false);
      setWaVerified(true);
    }, 1500);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !agencyName || !email || !reraNumber || !reraUploaded || !idUploaded) {
      setMessage("Please fill in all details and upload files.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const cleanPhone = phone.replace(/\s+/g, "");
      const formattedPhone = `+91 ${cleanPhone.slice(-10)}`;

      // 1. Insert new pending Broker profile in Supabase
      const { data: newProfile, error: profileError } = await supabase
        .from("profiles")
        .insert([{
          phone: formattedPhone,
          role: "agent",
          name: fullName,
          agency_name: agencyName,
          email: email,
          rera_number: reraNumber,
          status: "pending",
          points: 0,
          referrals_count: 0,
          location: "Hyderabad"
        }])
        .select()
        .single();

      if (profileError) {
        setLoading(false);
        setMessage("Database error: " + profileError.message);
        return;
      }

      // 2. If referred, attribute registration to the referrer
      if (refCode && newProfile) {
        // Query referrer profile
        const { data: referrer, error: refError } = await supabase
          .from("profiles")
          .select("*")
          .eq("cp_id", refCode)
          .single();

        if (referrer) {
          // Insert row in referrals table
          await supabase
            .from("referrals")
            .insert([{
              referrer_id: referrer.id,
              referred_name: fullName,
              referred_phone: formattedPhone,
              status: "pending",
              points_awarded: 0,
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            }]);

          // Increment referrer's count
          await supabase
            .from("profiles")
            .update({ referrals_count: (referrer.referrals_count || 0) + 1 })
            .eq("id", referrer.id);
        }
      }

      setLoading(false);
      setStep(5); // Show pending review page
    } catch (err: any) {
      setLoading(false);
      setMessage("Failed to register. Please check database connection.");
      console.error(err);
    }
  };

  const handleEnterDemo = () => {
    localStorage.setItem("agentsapp_logged_in_user", fullName || "New Partner");
    localStorage.setItem("agentsapp_logged_in_phone", `+91 ${phone}`);
    localStorage.setItem("agentsapp_logged_in_role", "agent");
    router.push("/agent/dashboard");
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative text-slate-800">
      {/* Back Link - only on initial step */}
      {step === 1 && (
        <Link href="/" className="inline-flex items-center space-x-2 text-slate-400 hover:text-slate-700 transition text-xs mb-6 font-bold uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      )}

      {/* Referral welcome banner */}
      {refCode && step < 5 && (
        <div className="mb-6 p-3 bg-[#25d366]/10 border border-[#25d366]/30 rounded-2xl flex items-center space-x-2.5 text-xs text-[#16c47f] font-bold">
          <Sparkles className="w-4 h-4 text-[#25d366] shrink-0" />
          <span>Referred by: {refCode}! Complete onboarding to unlock 500 bonus points.</span>
        </div>
      )}

      {/* Logo */}
      <div className="flex items-center space-x-2 mb-8 justify-center">
        <div className="w-8 h-8 rounded-lg bg-[#25d366] flex items-center justify-center font-bold text-white shadow-md">
          a
        </div>
        <span className="text-xl font-bold tracking-tight text-[#0f172a]">
          agents<span className="text-[#16c47f]">app</span>
        </span>
      </div>

      {/* STEP 1: Phone Entry */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 text-center mb-1">Verify Mobile</h2>
          <p className="text-slate-500 text-xs text-center mb-6 font-semibold">
            Enter your mobile number to receive verification code.
          </p>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-6 text-[10px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => { setRole("agent"); setMessage(""); }}
              className={`py-2 rounded-lg transition ${
                role === "agent" 
                  ? "bg-[#25d366] text-white" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Broker / CP
            </button>
            <button
              type="button"
              onClick={() => { setRole("builder"); setMessage(""); }}
              className={`py-2 rounded-lg transition ${
                role === "builder" 
                  ? "bg-slate-900 text-white" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Builder
            </button>
            <button
              type="button"
              onClick={() => { setRole("admin"); setMessage(""); }}
              className={`py-2 rounded-lg transition ${
                role === "admin" 
                  ? "bg-slate-900 text-white" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Admin Ops
            </button>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 text-xs font-extrabold">
                  +91
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-3 pl-12 pr-4 text-slate-850 placeholder-slate-400 outline-none text-xs font-semibold transition"
                />
              </div>
              {role === "agent" && (
                <div className="mt-2 text-[10px] text-slate-400 font-semibold italic text-center">
                  💡 Sandbox: Use number <span className="font-extrabold text-slate-600">98765 43210</span> to bypass KYC wizard. Enter any other number to test the referral/KYC flow.
                </div>
              )}
            </div>

            {message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Requesting OTP...</span>
                </>
              ) : (
                <span>Request Verification Code</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: OTP Verification */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 text-center mb-1">Verify OTP</h2>
          <p className="text-slate-500 text-xs text-center mb-6 font-semibold">
            Type code sent to <span className="text-slate-800 font-bold">{phone}</span>
          </p>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-12 h-12 bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl text-center text-slate-900 text-lg font-bold outline-none transition"
                />
              ))}
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                message.includes("successfully") 
                  ? "bg-[#25d366]/10 border border-[#25d366]/25 text-[#16c47f]" 
                  : "bg-red-50 border border-red-200 text-red-600"
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 shrink-0" />
                    <span>Verify Code</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp(["", "", "", "", "", ""]);
                  setMessage("");
                }}
                className="w-full py-2.5 bg-transparent text-slate-400 hover:text-slate-600 transition text-xs font-bold uppercase tracking-wider"
              >
                Change Phone Number
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 3: WhatsApp Click-to-Verify */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Step 3 of 5</span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-3 mb-1">WhatsApp Verification</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
              To verify WhatsApp access and active delivery channel notifications, click below.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-start space-x-3 text-xs">
              <MessageSquare className="w-5 h-5 text-[#25d366] shrink-0 mt-0.5 fill-[#25d366]/20" />
              <div>
                <div className="font-extrabold text-slate-800">WhatsApp-Native Delivery</div>
                <p className="text-slate-500 text-[10.5px] mt-0.5 leading-normal font-semibold">
                  Once verified, our bot will automatically push inventory matches, price lists, and follow-up reminds directly into your WhatsApp chats.
                </p>
              </div>
            </div>

            {waVerified ? (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center space-x-2 text-xs text-[#16c47f] font-extrabold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#25d366]" />
                <span>WhatsApp Account Verified Successfully!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleVerifyWhatsApp}
                disabled={waVerifying}
                className="w-full py-3 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition"
              >
                {waVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending webhook ping...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 shrink-0 fill-white" />
                    <span>Verify WhatsApp Number</span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!waVerified}
            onClick={() => setStep(4)}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-1 shadow-md transition"
          >
            <span>Proceed to KYC Document Upload</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* STEP 4: KYC Documents Upload Form */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center">
            <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Step 4 of 5</span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-3 mb-1">KYC Credentials Upload</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Verify your agent status and license details to unlock builder pricing listings.
            </p>
          </div>

          <form onSubmit={handleKycSubmit} className="space-y-4 text-xs font-semibold text-slate-400">
            <div className="space-y-1">
              <label className="block uppercase text-[9px] font-bold tracking-wider">Full Name</label>
              <input 
                type="text"
                required
                placeholder="e.g. Sreenivas Rao"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3.5 text-slate-800 outline-none text-xs font-semibold transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block uppercase text-[9px] font-bold tracking-wider">Agency Business Name</label>
              <input 
                type="text"
                required
                placeholder="e.g. Rao Real Estate Services"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3.5 text-slate-800 outline-none text-xs font-semibold transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block uppercase text-[9px] font-bold tracking-wider">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="name@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3.5 text-slate-800 outline-none text-xs font-semibold transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block uppercase text-[9px] font-bold tracking-wider">RERA Registration No</label>
                <input 
                  type="text"
                  required
                  placeholder="RERA-HYD-XXXXXX"
                  value={reraNumber}
                  onChange={(e) => setReraNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#25d366] rounded-xl py-2.5 px-3.5 text-slate-800 outline-none text-xs font-semibold transition"
                />
              </div>
            </div>

            {/* Mock Uploader slots */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="block uppercase text-[9px] font-bold tracking-wider">RERA License Copy</label>
                <div 
                  onClick={() => setReraUploaded(true)}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer hover:bg-slate-50/50 flex flex-col items-center justify-center h-20 transition ${
                    reraUploaded ? "border-[#25d366]/40 bg-emerald-50/20 text-[#16c47f]" : "border-slate-200 text-slate-400"
                  }`}
                >
                  {reraUploaded ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-[#25d366] mb-1" />
                      <span className="text-[9px] font-bold uppercase truncate max-w-full px-1">rera_cert.pdf</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[9px] font-extrabold">Upload PDF</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block uppercase text-[9px] font-bold tracking-wider">Aadhaar/PAN Proof</label>
                <div 
                  onClick={() => setIdUploaded(true)}
                  className={`border border-dashed rounded-xl p-3 text-center cursor-pointer hover:bg-slate-50/50 flex flex-col items-center justify-center h-20 transition ${
                    idUploaded ? "border-[#25d366]/40 bg-emerald-50/20 text-[#16c47f]" : "border-slate-200 text-slate-400"
                  }`}
                >
                  {idUploaded ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-[#25d366] mb-1" />
                      <span className="text-[9px] font-bold uppercase truncate max-w-full px-1">aadhaar_copy.pdf</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-slate-400 mb-1" />
                      <span className="text-[9px] font-extrabold">Upload Copy</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center space-x-2 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#25d366] hover:bg-[#16c47f] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2 pt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting files...</span>
                </>
              ) : (
                <span>Submit KYC for Ops Review</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 5: Verification Pending Confirmation */}
      {step === 5 && (
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-[#25d366]/10 text-[#16c47f] rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse text-[#25d366]" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Step 5 of 5</span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-3">Under Ops Review</h2>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed px-2">
              Your broker registration documents have been uploaded successfully.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3 text-[11px] font-semibold leading-relaxed">
            <div className="font-extrabold text-slate-800 text-xs border-b border-slate-100 pb-1.5 flex items-center justify-between">
              <span>Onboarding Summary</span>
              <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200">Pending Review</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Channel Partner:</span> {fullName} ({agencyName})
            </div>
            <div>
              <span className="text-slate-400 font-medium">Verified Phone:</span> +91 {phone}
            </div>
            <div>
              <span className="text-slate-400 font-medium">Assigned Referrer:</span> {refCode || "None (Direct Sign Up)"}
            </div>
            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic">
              📢 <span className="font-bold text-slate-600">Demo Simulation Alert:</span> To complete the funnel, switch to the <span className="font-bold text-slate-600">Verification / Admin</span> portal at the bottom of the sidebar, select this application, and click Approve!
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnterDemo}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-1.5"
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>Enter App Dashboard (Demo Mode)</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-center items-center px-6 relative">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#25d366]/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
      
      <Suspense fallback={
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl w-full max-w-md flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#25d366] mb-4" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider animate-pulse">Loading secure login portal...</span>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </div>
  );
}
