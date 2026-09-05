import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-20 px-6">
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-3xl shadow-xl border border-slate-100">
        <Link href="/" className="inline-flex items-center space-x-2 text-sm font-bold text-[#16c47f] hover:text-[#0f172a] transition mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#0f172a] tracking-tight mb-8">Contact Us</h1>
        
        <p className="text-slate-600 leading-relaxed text-lg mb-10">
          Have questions, facing an issue, or want to explore enterprise partnerships? Our support team is here to help you succeed. Please reach out to us using the contact details below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-start space-x-4">
            <div className="w-12 h-12 bg-[#25d366]/10 text-[#25d366] rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">Email Support</h3>
              <p className="text-slate-500 text-sm mb-2">For general inquiries and technical assistance.</p>
              <a href="mailto:hello@agentsapp.in" className="text-[#16c47f] font-semibold hover:underline">hello@agentsapp.in</a>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-start space-x-4">
            <div className="w-12 h-12 bg-[#25d366]/10 text-[#25d366] rounded-xl flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">Phone / WhatsApp</h3>
              <p className="text-slate-500 text-sm mb-2">Mon - Sat, 10:00 AM to 6:00 PM IST</p>
              <a href="tel:+919876543210" className="text-[#16c47f] font-semibold hover:underline">+91 98765 43210</a>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex items-start space-x-4 md:col-span-2">
            <div className="w-12 h-12 bg-[#25d366]/10 text-[#25d366] rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">Registered Office</h3>
              <p className="text-slate-500 text-sm">
                <strong>M/S. CHENNAMANENI SREENIVAS RAO</strong><br />
                Opposite Municipal Office, first floor, 5-7-26, Gandhi Road,<br />
                Sircilla, Rajanna Sircilla, Telangana, 505301, India
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
