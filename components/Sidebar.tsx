

import React, { useState, useEffect } from 'react';
import HomeIcon from './icons/HomeIcon';
import FileTextIcon from './icons/FileTextIcon';
import RouteIcon from './icons/RouteIcon';
import MonitoramentoIcon from './icons/MonitoramentoIcon';
import SettingsIcon from './icons/SettingsIcon';
import ThinChevronDownIcon from './icons/ThinChevronDownIcon';
import { playAlertSound } from '../utils/audio';

const ShieldCheckIcon = () => (
    <svg className="h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const Logo = () => (
    <div className="flex items-center justify-center py-6 px-4">
        <div className="flex items-center">
            <ShieldCheckIcon />
            <span className="text-white text-2xl mx-2 font-bold">GuardaCerta</span>
        </div>
    </div>
);

type View = 'dashboard' | 'occurrences' | 'roteirizacao' | 'monitoramento' | 'users' | 'units' | 'profiles';

interface SidebarProps {
    onLogout: () => void;
    activeView: View;
    onViewChange: (view: View) => void;
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, activeView, onViewChange, isOpen, onClose }) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsViews: View[] = ['users', 'units', 'profiles'];
    const isSettingsActive = settingsViews.includes(activeView);

    useEffect(() => {
        if (isSettingsActive) {
            setIsSettingsOpen(true);
        }
    }, [activeView, isSettingsActive]);
    
    const navItemClasses = "flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200";
    const activeClasses = "text-white bg-slate-800 shadow-inner";
    const inactiveClasses = "text-slate-300 hover:bg-slate-800 hover:text-white";
    
    const subItemClasses = "w-full text-left block px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    const subItemActiveClasses = "bg-slate-800 text-white font-semibold";
    const subItemInactiveClasses = "text-slate-400 hover:bg-slate-800 hover:text-slate-100";


    const handleViewChange = (view: View) => {
        onViewChange(view);
        onClose();
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside className={`flex flex-col w-72 bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Logo />
                <nav className="flex-1 px-4 mt-4 space-y-2">
                     <button onClick={() => handleViewChange('dashboard')} className={`${navItemClasses} ${activeView === 'dashboard' ? activeClasses : inactiveClasses}`}>
                        <HomeIcon />
                        <span className="mx-4 font-medium">Dashboard</span>
                    </button>
                    <button onClick={() => handleViewChange('occurrences')} className={`${navItemClasses} ${activeView === 'occurrences' ? activeClasses : inactiveClasses}`}>
                        <FileTextIcon />
                        <span className="mx-4 font-medium">Ocorrências</span>
                    </button>
                    <button onClick={() => handleViewChange('roteirizacao')} className={`${navItemClasses} ${activeView === 'roteirizacao' ? activeClasses : inactiveClasses}`}>
                        <RouteIcon />
                        <span className="mx-4 font-medium">Roteirização</span>
                    </button>
                    <button onClick={() => handleViewChange('monitoramento')} className={`${navItemClasses} ${activeView === 'monitoramento' ? activeClasses : inactiveClasses}`}>
                        <MonitoramentoIcon />
                        <span className="mx-4 font-medium">Monitoramento</span>
                    </button>
                    
                    {/* Settings Section */}
                    <div>
                        <button 
                            onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                            className={`${navItemClasses} ${isSettingsActive ? 'text-blue-500' : inactiveClasses}`}
                        >
                            <SettingsIcon />
                            <span className="mx-4 font-medium">Configurações</span>
                            <ThinChevronDownIcon className={`w-5 h-5 ml-auto transform transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isSettingsOpen && (
                            <div className="pt-1 pb-2 pl-8 space-y-1">
                                <button onClick={() => handleViewChange('users')} className={`${subItemClasses} ${activeView === 'users' ? subItemActiveClasses : subItemInactiveClasses}`}>
                                    Usuários
                                </button>
                                <button onClick={() => handleViewChange('units')} className={`${subItemClasses} ${activeView === 'units' ? subItemActiveClasses : subItemInactiveClasses}`}>
                                    Unidades
                                </button>
                                <button onClick={() => handleViewChange('profiles')} className={`${subItemClasses} ${activeView === 'profiles' ? subItemActiveClasses : subItemInactiveClasses}`}>
                                    Perfis
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
                
                <div className="p-4 border-t border-slate-800">
                    <button 
                        onClick={() => {
                            playAlertSound();
                            onClose();
                        }} 
                        className="flex items-center w-full px-4 py-3 rounded-lg text-amber-400 hover:bg-slate-800 hover:text-amber-300 transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <span className="font-medium">Testar Alerta</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;