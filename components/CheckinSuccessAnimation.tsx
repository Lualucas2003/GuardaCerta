import React from 'react';

const CheckinSuccessAnimation: React.FC = () => {
  return (
    <>
      <div className="fixed top-5 right-5 w-24 h-24 z-[9999] pointer-events-none animate-fade-in-out">
        <svg viewBox="0 0 52 52">
          <circle 
            className="animate-circle-draw" 
            cx="26" 
            cy="26" 
            r="25" 
            fill="none" 
            stroke="#10B981" 
            strokeWidth="3" 
          />
          <path 
            className="animate-checkmark-draw" 
            fill="none" 
            stroke="#10B981" 
            strokeWidth="4" 
            strokeLinecap="round"
            d="M14 27l5 5 16-16" 
          />
        </svg>
      </div>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: scale(0.8); }
          15% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 3s ease-in-out forwards;
        }

        .animate-circle-draw {
          stroke-dasharray: 157; /* circumference */
          stroke-dashoffset: 157;
          animation: draw 0.8s ease-out forwards;
          animation-delay: 0.2s;
        }

        .animate-checkmark-draw {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: draw 0.5s ease-out forwards;
          animation-delay: 0.8s;
        }

        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  );
};

export default CheckinSuccessAnimation;
