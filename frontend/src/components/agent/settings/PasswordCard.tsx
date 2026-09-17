import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface PasswordCardProps {
  onUpdatePassword: (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ) => Promise<void>;
  changingPassword: boolean;
  passwordMessage: string;
}

const PasswordCard: React.FC<PasswordCardProps> = ({
  onUpdatePassword,
  changingPassword,
  passwordMessage,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePassword(currentPassword, newPassword, confirmPassword);
    if (passwordMessage.toLowerCase().includes('success')) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-6 md:p-8 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#EAEAEA] mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/15 text-[#2563EB] flex items-center justify-center font-bold">
              <Lock size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">
                Authentication
              </span>
              <h3 className="text-base font-bold text-[#16281D]">Security & Password</h3>
            </div>
          </div>
          <ShieldCheck size={18} className="text-[#22C55E]" />
        </div>

        {passwordMessage && (
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs border ${
              passwordMessage.toLowerCase().includes('success')
                ? 'bg-[#22C55E]/10 text-[#15803D] border-[#22C55E]/20'
                : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
            }`}
          >
            {passwordMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#16281D]"
              >
                {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#16281D]"
              >
                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-[#71717A] mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="w-full pl-3.5 pr-10 py-2.5 bg-[#F4F7F4] border border-transparent rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#16281D]"
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.3)] transition-all disabled:opacity-50"
            >
              {changingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordCard;
