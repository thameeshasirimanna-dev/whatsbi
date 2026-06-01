import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <style>{`@keyframes ld-spin { to { transform: rotate(360deg); } }`}</style>
      <div className="flex flex-col items-center" style={{ gap: 12 }}>
        <div style={{ width: 40, height: 40, border: '3px solid #ebebeb', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'ld-spin 0.8s linear infinite' }} />
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#71717a' }}>Loading...</div>
      </div>
    </div>
  );
};

export default Loader;
