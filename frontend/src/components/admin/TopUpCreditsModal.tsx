import React, { useState } from 'react';
import { X, Coins, CheckCircle2, AlertCircle, Sparkles, Smartphone } from 'lucide-react';
import { getToken } from '../../lib/auth';

interface TopUpCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: {
    id: string;
    user_name: string;
    ai_balance?: number;
    credits?: number;
    sms_credits?: number;
  } | null;
  onSuccess: () => void;
}

export const TopUpCreditsModal: React.FC<TopUpCreditsModalProps> = ({
  isOpen,
  onClose,
  agent,
  onSuccess,
}) => {
  const [balanceType, setBalanceType] = useState<'ai' | 'template' | 'sms'>('ai');
  const [amount, setAmount] = useState<string>('5.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !agent) return null;

  const handleQuickAdd = (val: string) => {
    setAmount(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      const token = getToken();
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

      const res = await fetch(`${backendUrl}/add-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          amount: numAmount,
          balance_type: balanceType,
          description: `Super Admin top-up for ${agent.user_name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || 'Top-up request failed');
      }

      const formattedLabel =
        balanceType === 'ai'
          ? `$${numAmount.toFixed(2)} USD`
          : balanceType === 'sms'
          ? `Rs. ${numAmount.toFixed(2)} SMS credits`
          : `Rs. ${numAmount.toFixed(2)} WhatsApp credits`;

      setSuccessMsg(`Successfully added ${formattedLabel} to ${agent.user_name}.`);
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'An error occurred while topping up');
    } finally {
      setLoading(false);
    }
  };

  const presets =
    balanceType === 'ai'
      ? ['2.00', '5.00', '10.00', '20.00']
      : balanceType === 'template'
      ? ['150.00', '300.00', '600.00', '1500.00']
      : ['50.00', '100.00', '250.00', '500.00'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 font-sans animate-modal-backdrop">
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_24px_72px_rgba(20,40,24,0.18)] max-w-lg w-full p-6 md:p-7 overflow-hidden flex flex-col gap-5 animate-modal-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F4F4F5] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0">
              <Coins size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#16281D] m-0 tracking-tight leading-snug">
                Top Up Agent Balance
              </h3>
              <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
                Allocating funding for <strong className="text-[#16281D]">{agent.user_name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#71717A] hover:text-[#16281D] flex items-center justify-center border-0 cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl text-xs font-medium text-[#E11D48] flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-xs font-bold text-[#15803D] flex items-center gap-2">
            <CheckCircle2 size={15} strokeWidth={2.4} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Current Balance Snapshot Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 bg-[#F4F7F4] rounded-2xl border border-black/5">
            <div>
              <span className="text-[10px] font-bold text-[#8FA89B] uppercase tracking-wider block truncate">
                DeepSeek AI
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#15803D] mt-0.5 block truncate">
                ${(agent.ai_balance ?? 0.0).toFixed(2)} USD
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8FA89B] uppercase tracking-wider block truncate">
                WhatsApp (Rs. 30)
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#0F766E] mt-0.5 block truncate">
                Rs. {(agent.credits ?? 0.0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8FA89B] uppercase tracking-wider block truncate">
                SMS (Rs. 1)
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#2563EB] mt-0.5 block truncate">
                Rs. {(agent.sms_credits ?? 0.0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Select Balance Type */}
          <div>
            <label className="text-xs font-bold text-[#52525B] block mb-1.5">
              Target Balance Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBalanceType('ai');
                  setAmount('5.00');
                }}
                className={`py-2 px-2 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  balanceType === 'ai'
                    ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] shadow-sm'
                    : 'bg-[#F4F7F4] text-[#71717A] border-transparent hover:bg-[#EAEAEA]'
                }`}
              >
                <Sparkles size={14} strokeWidth={2.4} />
                <span className="truncate">AI ($ USD)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBalanceType('template');
                  setAmount('300.00');
                }}
                className={`py-2 px-2 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  balanceType === 'template'
                    ? 'bg-[#F0FDF4] text-[#0F766E] border-[#CCFBF1] shadow-sm'
                    : 'bg-[#F4F7F4] text-[#71717A] border-transparent hover:bg-[#EAEAEA]'
                }`}
              >
                <Coins size={14} strokeWidth={2.4} />
                <span className="truncate">WhatsApp (Rs. 30)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBalanceType('sms');
                  setAmount('100.00');
                }}
                className={`py-2 px-2 rounded-2xl border text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  balanceType === 'sms'
                    ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE] shadow-sm'
                    : 'bg-[#F4F7F4] text-[#71717A] border-transparent hover:bg-[#EAEAEA]'
                }`}
              >
                <Smartphone size={14} strokeWidth={2.4} />
                <span className="truncate">SMS (Rs. 1)</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-bold text-[#52525B] block mb-1.5">
              Amount to Add ({balanceType === 'ai' ? 'USD' : 'LKR / Rs.'})
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5.00"
              required
              className="w-full px-4 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-2xl text-xs font-medium text-[#16281D] placeholder-[#A1A1AA] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20"
            />
          </div>

          {/* Quick Amount Presets */}
          <div className="flex gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuickAdd(preset)}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  amount === preset
                    ? 'bg-[#16281D] text-white border-[#16281D]'
                    : 'bg-[#F4F7F4] text-[#52525B] border-[#EAEAEA] hover:bg-[#EAEAEA]'
                }`}
              >
                +{balanceType === 'ai' ? `$${preset}` : `Rs. ${preset}`}
              </button>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#F4F4F5]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-[#52525B] hover:text-[#16281D] hover:bg-[#F4F7F4] border border-[#E4E4E7] cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer border-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding…' : 'Confirm Top Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
