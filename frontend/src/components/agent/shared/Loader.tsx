import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-[#16281D]/10 border-t-[#16281D] animate-spin" />
        <span className="text-xs font-semibold text-[#71717A] tracking-wider uppercase">
          Loading...
        </span>
      </div>
    </div>
  );
};

export default Loader;
