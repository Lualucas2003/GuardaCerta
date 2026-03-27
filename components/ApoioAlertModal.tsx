import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import { playAlertSound } from '../utils/audio';

interface ApoioAlertModalProps {
  requester: {
    usuario_id: number;
    nome: string;
    unidade: string;
    latitude: number;
    longitude: number;
  };
  onClose: () => void;
}

const ApoioAlertModal: React.FC<ApoioAlertModalProps> = ({ requester, onClose }) => {
  const [address, setAddress] = useState('Buscando endereço...');
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${requester.latitude}&lon=${requester.longitude}&accept-language=pt-BR`);
        const data = await response.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
        } else {
          setAddress('Endereço não encontrado.');
        }
      } catch (error) {
        console.error("Erro no reverse geocoding:", error);
        setAddress('Não foi possível obter o endereço.');
      }
    };
    fetchAddress();

    playAlertSound();
    // Repeat every 3 seconds while modal is open to ensure attention
    const interval = setInterval(playAlertSound, 3000);
    
    return () => clearInterval(interval);
  }, [requester.latitude, requester.longitude]);

  const handleGenerateRoute = () => {
    setIsGeneratingRoute(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://www.google.com/maps/dir/${latitude},${longitude}/${requester.latitude},${requester.longitude}`;
          window.open(url, '_blank');
          setIsGeneratingRoute(false);
          onClose();
        },
        (error) => {
          alert(`Não foi possível obter sua localização para gerar a rota: ${error.message}`);
          setIsGeneratingRoute(false);
        }
      );
    } else {
      alert("Geolocalização não é suportada por este navegador.");
      setIsGeneratingRoute(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[2000] p-4">
      <div className="bg-slate-800 border-4 border-amber-500 shadow-2xl w-full max-w-md rounded-lg transform transition-all animate-scale-in">
        <div className="p-6 border-b border-slate-700 text-center">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-amber-400">ALERTA DE APOIO</h2>
        </div>
        <div className="p-6 space-y-3 text-slate-200">
          <p><span className="font-semibold text-slate-400">Usuário:</span> {requester.nome}</p>
          <p><span className="font-semibold text-slate-400">Unidade:</span> {requester.unidade}</p>
          <p><span className="font-semibold text-slate-400">Localização:</span> {address}</p>
        </div>
        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex flex-col sm:flex-row justify-end gap-3 rounded-b-lg">
          <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">Recusar</Button>
          <Button onClick={handleGenerateRoute} disabled={isGeneratingRoute} className="bg-green-600 hover:bg-green-700 focus:ring-green-500 w-full sm:w-auto">
            {isGeneratingRoute ? 'Aguarde...' : 'Aceitar'}
          </Button>
        </div>
        <style>{`
          @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
        `}</style>
      </div>
    </div>
  );
};

export default ApoioAlertModal;
