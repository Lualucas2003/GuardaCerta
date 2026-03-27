
import React from 'react';

interface InstallBannerProps {
  onDismiss: () => void;
}

const InstallIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CloseIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const InstallBanner: React.FC<InstallBannerProps> = ({ onDismiss }) => {
  const handleInstallClick = () => {
    // In a real PWA, you would trigger the install prompt here
    // using the stored 'beforeinstallprompt' event.
    alert("Para instalar, use a opção 'Adicionar à tela inicial' no seu navegador.");
    onDismiss();
  };

  return (
    <div className="bg-blue-600 text-white p-4 rounded-lg flex items-center justify-between mb-6 shadow-lg">
      <div className="flex items-center">
        <InstallIcon />
        <div>
            <p className="font-bold">Instale o GuardaCerta!</p>
            <p className="text-sm">Tenha acesso rápido e fácil adicionando à sua tela inicial.</p>
        </div>
      </div>
      <div className="flex items-center">
        <button 
            onClick={handleInstallClick} 
            className="bg-white text-blue-600 font-bold py-2 px-4 rounded-md mr-4 hover:bg-blue-100 transition-colors"
        >
            Instalar
        </button>
        <button onClick={onDismiss} className="text-white hover:bg-blue-700 p-1 rounded-full">
            <CloseIcon />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
