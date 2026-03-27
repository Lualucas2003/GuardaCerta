import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

const CheckIcon = () => (
    <svg className="w-6 h-6 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto-close after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      <div className="fixed top-5 right-5 bg-slate-800 text-white p-4 rounded-lg shadow-2xl flex items-center space-x-3 z-[100] animate-toast-in">
        <CheckIcon />
        <span className="font-semibold">{message}</span>
      </div>
      <style>{`
        @keyframes toast-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-toast-in {
          animation: toast-in 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default Toast;
