
import React from 'react';
import Button from './common/Button';
import LogoIcon from './icons/LogoIcon';

interface HomeScreenProps {
  username: string;
  onLogout: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ username, onLogout }) => {
  return (
    <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-10 transform transition-all duration-500">
            <LogoIcon className="w-20 h-20 mx-auto mb-6 text-blue-500" />
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Login Successful!</h1>
            <p className="text-lg text-slate-300 mb-8">
                Welcome, <span className="font-semibold text-blue-400">{username}</span>!
            </p>
            <Button onClick={onLogout} fullWidth>
                Logout
            </Button>
        </div>
    </div>
  );
};

export default HomeScreen;