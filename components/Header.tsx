
import React, { useState, useEffect } from 'react';
import MenuIcon from './icons/MenuIcon';
import ChangePasswordModal from './ChangePasswordModal';
import { User } from '../types';
import { api } from './api';

interface HeaderProps {
    username: string;
    onLogout: () => void;
    onMenuClick: () => void;
    showToast: (message: string) => void;
    userId: number;
}

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const DotsVerticalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
);


const Header: React.FC<HeaderProps> = ({ username, onLogout, onMenuClick, showToast, userId }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const users = await api.getAllUsers();
                const user = users.find(u => u.id === userId);
                if (user) {
                    setCurrentUser(user);
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }
        };
        fetchUser();
    }, [userId]);

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 relative z-20">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="text-gray-500 hover:text-gray-700 mr-4"
                    aria-label="Open sidebar"
                >
                    <MenuIcon className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">GuardaCerta</h1>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
                <button className="text-gray-500 hover:text-gray-700">
                    <BellIcon />
                </button>
                <div className="flex items-center space-x-2 relative">
                    <div 
                        className="text-right cursor-pointer" 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <p className="text-sm font-semibold text-gray-800">{username}</p>
                        <p className="text-xs text-gray-500">Fiscal</p>
                    </div>
                     {/* Hiding on medium screens+, as sidebar has a logout button */}
                     <button className="text-gray-500 hover:text-gray-700 md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} title="Menu">
                        <DotsVerticalIcon />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                            <button 
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    if (currentUser) {
                                        setIsChangePasswordModalOpen(true);
                                    } else {
                                        showToast("Não foi possível carregar os dados do usuário.");
                                    }
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Mudar Senha
                            </button>
                            <button 
                                onClick={() => {
                                    setIsMenuOpen(false);
                                    onLogout();
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Sair do sistema
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {isChangePasswordModalOpen && currentUser && (
                <ChangePasswordModal 
                    user={currentUser} 
                    onClose={() => setIsChangePasswordModalOpen(false)} 
                    showToast={showToast} 
                />
            )}
        </header>
    );
};

export default Header;
