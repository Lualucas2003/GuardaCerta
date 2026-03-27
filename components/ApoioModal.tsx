import React, { useState } from 'react';
import Button from './common/Button';

interface ApoioModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const ApoioModal: React.FC<ApoioModalProps> = ({ onClose, onConfirm }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      onConfirm();
    }, 1000);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-md rounded-lg transform transition-all duration-300 scale-95 animate-scale-in"
      >
        <div className="p-6 pb-4 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-100">Confirmar Solicitação de Apoio</h2>
            {!isSubmitting && (
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
            )}
          </div>
        </div>

        <div className="p-6">
            <p className="text-slate-300 text-center">
                Você confirma o envio de uma solicitação de apoio para a sua localização atual? Uma viatura será alertada.
            </p>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end space-x-3 rounded-b-lg">
            <Button type="button" onClick={onClose} disabled={isSubmitting} className="bg-slate-600 hover:bg-slate-700">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
                {isSubmitting ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
        </div>
         <style>{`
          @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
        `}</style>
      </form>
    </div>
  );
};

export default ApoioModal;
