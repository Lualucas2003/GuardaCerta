

import React, { useState, useRef, useEffect } from 'react';
import { api } from './api';
import { User } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Occurrences from './Occurrences';
import ManagerialDashboard from './ManagerialDashboard';
import Roteirizacao from './Roteirizacao';
import Monitoramento from './Monitoramento';
import UserSettings from './UserSettings';
import UnitSettings from './UnitSettings';
import ProfileSettings from './ProfileSettings';
import ApoioModal from './ApoioModal';

interface DashboardProps {
    username: string;
    onLogout: () => void;
    showToast: (message: string) => void;
    supportStatus: boolean;
    setSupportStatus: (status: boolean) => void;
    userId: number;
}

type View = 'dashboard' | 'occurrences' | 'roteirizacao' | 'monitoramento' | 'users' | 'units' | 'profiles';

const Dashboard: React.FC<DashboardProps> = ({ username, onLogout, showToast, supportStatus, setSupportStatus, userId }) => {
    const [activeView, setActiveView] = useState<View>('occurrences');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isApoioModalOpen, setIsApoioModalOpen] = useState(false);
    const [fullUser, setFullUser] = useState<User | null>(null);
    const supportTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const users = await api.getAllUsers();
                console.log("Users:", users);
                const user = users.find(u => u.id === userId);
                console.log("User:", user);
                if (user) {
                    setFullUser(user);
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }
        };
        fetchUser();
    }, [userId]);

    useEffect(() => {
        // This cleanup function will run when the component unmounts (e.g., on logout)
        return () => {
            if (supportTimerRef.current) {
                clearTimeout(supportTimerRef.current);
            }
        };
    }, []); // Empty dependency array ensures it runs only on mount and unmount

    const handleConfirmApoio = () => {
        // Always clear any existing timer before changing the status
        if (supportTimerRef.current) {
            clearTimeout(supportTimerRef.current);
            supportTimerRef.current = null;
        }
    
        const newStatus = !supportStatus;
        setSupportStatus(newStatus);
        setIsApoioModalOpen(false);
        showToast(newStatus ? "Sinal de apoio ATIVADO!" : "Sinal de apoio desativado.");
    
        // If we just ACTIVATED the support, set a 5-minute timer to turn it off automatically.
        if (newStatus) {
            supportTimerRef.current = window.setTimeout(() => {
                setSupportStatus(false);
                showToast("Sinal de apoio desativado automaticamente.");
                supportTimerRef.current = null;
            }, 300000); // 5 minutes in milliseconds
        }
    };
    
    const renderContent = () => {
        switch(activeView) {
            case 'dashboard':
                return <ManagerialDashboard />;
            case 'occurrences':
                return <Occurrences username={username} showToast={showToast} />;
            case 'roteirizacao':
                return fullUser ? <Roteirizacao showToast={showToast} user={fullUser} /> : <p>Carregando...</p>;
            case 'monitoramento':
                return <Monitoramento />;
            case 'users':
                return <UserSettings />;
            case 'units':
                return <UnitSettings />;
            case 'profiles':
                 return <ProfileSettings />;
            default:
                return null;
        }
    }
    
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <Sidebar 
                onLogout={onLogout} 
                activeView={activeView} 
                onViewChange={setActiveView}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                <Header 
                    username={username} 
                    onLogout={onLogout}
                    onMenuClick={() => setIsSidebarOpen(true)}
                    showToast={showToast}
                    userId={userId}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto text-gray-800">
                    {/* FIX: Removed px-6 to allow components to control their own full-width layouts if needed. py-8 is kept for vertical spacing. */}
                    <div className="container mx-auto py-8 px-4 lg:px-6">
                       {renderContent()}
                    </div>
                </main>
            </div>
             {/* Floating Action Button for Support - only shown on Occurrences view */}
            {activeView === 'occurrences' && (
                <>
                    <button
                        onClick={() => setIsApoioModalOpen(true)}
                        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full text-white shadow-lg flex items-center justify-center transition-colors duration-300 transform hover:scale-110 z-30 ${supportStatus ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-red-600 hover:bg-red-700'}`}
                        title={supportStatus ? "Desativar Sinal de Apoio" : "Solicitar Apoio"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    
                    {isApoioModalOpen && <ApoioModal onClose={() => setIsApoioModalOpen(false)} onConfirm={handleConfirmApoio} />}
                </>
            )}
        </div>
    );
};

export default Dashboard;