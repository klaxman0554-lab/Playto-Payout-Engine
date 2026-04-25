import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Lock, 
  RefreshCw
} from 'lucide-react';

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-serif italic font-black tracking-tight">Playto Pay</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#payouts" className="hover:text-slate-900 transition-colors">Payouts</a>
          </div>
          <button 
            onClick={onStart}
            className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest px-6 py-3 rounded-full hover:bg-black transition-all shadow-xl shadow-slate-900/10 active:scale-95"
          >
            Merchant Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8">
              <Zap className="w-3 h-3" />
              Founding Engineer Challenge 2026
            </div>
            <h1 className="text-6xl md:text-8xl font-serif italic font-black text-slate-900 leading-[0.9] tracking-tighter mb-8">
              Payout <br />
              <span className="text-blue-600">Infrastructure.</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed font-medium mb-12 max-w-lg">
              The core engine for Indian agencies and freelancers to collect USD and payout INR with atomic integrity.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={onStart}
                className="w-full sm:w-auto bg-slate-900 text-white font-bold px-10 py-5 rounded-2xl flex items-center justify-center gap-3 group hover:bg-black transition-all shadow-2xl shadow-slate-200"
              >
                Enter Merchant Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
             <div className="bg-slate-900 aspect-video rounded-[3rem] p-10 shadow-3xl flex flex-col justify-between border border-slate-800">
                <div className="flex justify-between items-center">
                   <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Settlement Engine</p>
                      <h3 className="text-white font-serif italic text-2xl">INR 5,00,000.00</h3>
                   </div>
                   <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                   </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '70%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                    className="h-full bg-blue-500"
                   />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                   <span>Processing Payout...</span>
                   <span>70% Confidence Band</span>
                </div>
             </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20 whitespace-normal">
            <h2 className="text-4xl md:text-5xl font-serif italic font-black mb-6 tracking-tight">Money Integrity First.</h2>
            <p className="text-slate-500 font-medium">We don't gamble with decimals. Our payout engine is built for precision, concurrency, and 100% idempotency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Double-Entry Ledger", desc: "Every rupee is tracked. Balance is derived from atomic credits and debits, never stored in a single floating variable." },
              { icon: Lock, title: "Race Condition Guard", desc: "Simultaneous payout requests stay consistent. Our database-level locking prevents overdrawing even in high-concurrency." },
              { icon: RefreshCw, title: "Idempotent APIs", desc: "Retries are safe. Identification keys ensure duplicate requests never create duplicate bank transfers." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-refined hover:border-blue-100 transition-all group"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-2xl mb-8 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-50 transition-all">
                  <feature.icon className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-4 tracking-tight">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-50 bg-white text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">© 2026 Playto Founders Challenge • Built with Integrity</p>
      </footer>

    </div>
  );
}
