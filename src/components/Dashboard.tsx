import React, { useState } from 'react';
import axios from 'axios';
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Plus, 
  AlertCircle,
  Activity,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';

const CHART_COLORS = ['#0F172A', '#3B82F6', '#10B981', '#F59E0B'];

export default function Dashboard({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient();
  const [selectedMerchantId, setSelectedMerchantId] = useState('merch_01');

  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ['merchant', selectedMerchantId],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/merchants/${selectedMerchantId}`);
      return res.data;
    },
    refetchInterval: 3000,
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['payouts', selectedMerchantId],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/payouts/${selectedMerchantId}`);
      return res.data;
    },
    refetchInterval: 3000,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['ledger', selectedMerchantId],
    queryFn: async () => {
      const res = await axios.get(`/api/v1/ledger/${selectedMerchantId}`);
      return res.data;
    },
    refetchInterval: 3000,
  });

  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(uuidv4());
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const payoutMutation = useMutation({
    mutationFn: (data: any) => axios.post('/api/v1/payouts', data, {
      headers: { 'Idempotency-Key': data.idempotency_key }
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merchant'] });
      qc.invalidateQueries({ queryKey: ['payouts'] });
      setNotification({ type: 'success', message: 'Payout request initiated successfully.' });
      setAmount('');
      setBankId('');
      setIdempotencyKey(uuidv4());
    },
    onError: (error: any) => {
      setNotification({ type: 'error', message: error.response?.data?.error || 'Payout failed' });
    }
  });

  const handlePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !bankId) return;
    payoutMutation.mutate({
      merchant_id: selectedMerchantId,
      amount_paise: Math.round(parseFloat(amount) * 100),
      bank_account_id: bankId,
      idempotency_key: idempotencyKey
    });
  };

  const formatPaise = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(paise / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-500 bg-emerald-50';
      case 'failed': return 'text-rose-500 bg-rose-50';
      case 'processing': return 'text-amber-500 bg-amber-50';
      default: return 'text-slate-400 bg-slate-50';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6">
          <div className="flex items-center gap-4 cursor-pointer" onClick={onBack}>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif italic font-black text-slate-900">Playto Payouts</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Payout Engine v1.0</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select 
              value={selectedMerchantId}
              onChange={(e) => setSelectedMerchantId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            >
              <option value="merch_01">Design Studio X</option>
              <option value="merch_02">Alex Freelance</option>
            </select>
            <button onClick={onBack} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Exit</button>
          </div>
        </nav>

        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-12 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                notification.type === 'success' ? 'bg-white border-emerald-100 text-emerald-900' : 'bg-white border-rose-100 text-rose-900'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
              <span className="font-bold text-sm tracking-tight">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Dashboard Main */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* Balance Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Available for Payout</h2>
                      <p className="text-4xl font-serif italic font-black">
                        {merchantLoading ? '...' : formatPaise(merchant?.available_balance || 0)}
                      </p>
                    </div>
                    <ArrowUpRight className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Live Balance Verified</span>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm"
              >
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Held in Processing</h2>
                    <p className="text-4xl font-serif italic font-black text-slate-900">
                      {merchantLoading ? '...' : formatPaise(merchant?.held_balance || 0)}
                    </p>
                  </div>
                  <Activity className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Atomic state machine active</span>
                </div>
              </motion.div>
            </section>

            {/* Payout History */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout Registry</h3>
                <div className="h-[1px] flex-1 bg-slate-200" />
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4">ID / Bank</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payouts?.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">No payouts requested yet</td></tr>
                      )}
                      {payouts?.map((p: any) => (
                        <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-900 tracking-tight mb-1">{p.bank_account_id}</p>
                            <p className="text-[10px] font-mono text-slate-300">#{p.id.slice(0, 8)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-black text-slate-700">{formatPaise(p.amount_paise)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] text-slate-400 font-medium">
                              {new Date(p.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

             {/* Ledger Info */}
             <section>
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ledger Invariant Audit</h3>
                <div className="h-[1px] flex-1 bg-slate-200" />
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
                {ledger?.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.amount > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {entry.amount > 0 ? <Plus className="w-4 h-4" /> : <RefreshCw className="w-4 h-4 rotate-180" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{entry.description}</p>
                        <p className="text-[9px] text-slate-400 font-mono">ENTRY_{entry.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-black ${entry.amount > 0 ? 'text-emerald-500' : 'text-slate-900'}`}>
                      {entry.amount > 0 ? '+' : ''}{formatPaise(entry.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: Request Payout */}
          <div className="lg:col-span-4 lg:sticky lg:top-12">
            <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <ArrowRightLeft className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Request Payout</h2>
                </div>

                <form onSubmit={handlePayout} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bank Identifier</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. HDFC_9182"
                      value={bankId}
                      onChange={(e) => setBankId(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount (INR)</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black">₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-6 py-4 text-sm font-black focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                      />
                    </div>
                  </div>

                  <button 
                    disabled={payoutMutation.isPending || !amount || !bankId}
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {payoutMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Commit Payout'}
                  </button>

                  <div className="pt-6 border-t border-slate-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Idempotency Hash</span>
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Verified</span>
                    </div>
                    <code className="text-[9px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg block truncate">
                      {idempotencyKey}
                    </code>
                  </div>
                </form>
              </div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-slate-50 rounded-full blur-3xl -z-10" />
            </section>
            
            <div className="mt-8 px-6 text-center">
              <p className="text-[10px] text-slate-400 font-medium italic">
                * All payouts are processed via the Playto Atomic Engine with guaranteed integrity.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
