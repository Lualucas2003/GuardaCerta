

import React, { useState } from 'react';
import { Credentials } from '../types';
import Input from './common/Input';
import Button from './common/Button';
import { api } from './api';

// New logo component defined within this file
const BioFarolLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="100" cy="100" r="95" fill="#2E6031"/>
        
        {/* Leaves */}
        <g transform="translate(0, -10)">
            <path d="M100 50 C 90 70, 90 90, 100 100 C 110 90, 110 70, 100 50 Z" fill="#90C393" />
            <path d="M85 55 C 75 75, 75 95, 85 105 C 95 95, 95 75, 85 55 Z" fill="#A8D5A0" />
            <path d="M115 55 C 125 75, 125 95, 115 105 C 105 95, 105 75, 115 55 Z" fill="#A8D5A0" />
        </g>
        
        {/* Field Lines */}
        <g stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" transform="translate(0, -10)">
            <path d="M60 120 C 80 110, 120 110, 140 120" />
            <path d="M65 132 C 85 122, 115 122, 135 132" />
        </g>
        
        {/* Text */}
        <defs>
             <path id="textArcBottom" d="M 50,150 A 60,40 0 0,1 150,150" transform="translate(0, -20)" />
        </defs>

        <text fill="white" style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '2px' }}>
            <textPath href="#textArcBottom" startOffset="50%" textAnchor="middle">
                NENHUM VERDE A MENOS
            </textPath>
        </text>
    </svg>
);


interface LoginScreenProps {
  onLogin: (user: { id: number; username: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, '');

    let maskedValue = digitsOnly;
    // The user can type up to 11 digits for a CPF. Based on length, we format.
    if (digitsOnly.length > 6) { // CPF format ###.###.###-##
        maskedValue = digitsOnly.slice(0, 11); // Limit to 11 digits
        if (maskedValue.length > 9) {
            maskedValue = `${maskedValue.slice(0, 3)}.${maskedValue.slice(3, 6)}.${maskedValue.slice(6, 9)}-${maskedValue.slice(9)}`;
        } else if (maskedValue.length > 6) {
            maskedValue = `${maskedValue.slice(0, 3)}.${maskedValue.slice(3, 6)}.${maskedValue.slice(6)}`;
        } else if (maskedValue.length > 3) {
            maskedValue = `${maskedValue.slice(0, 3)}.${maskedValue.slice(3)}`;
        }
    } else { // Matrícula format ##.###-#
        maskedValue = digitsOnly.slice(0, 6); // Limit to 6 digits
        if (maskedValue.length > 5) {
            maskedValue = `${maskedValue.slice(0, 2)}.${maskedValue.slice(2, 5)}-${maskedValue.slice(5)}`;
        } else if (maskedValue.length > 2) {
            maskedValue = `${maskedValue.slice(0, 2)}.${maskedValue.slice(2)}`;
        }
    }
    setUsername(maskedValue);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, insira o CPF/Matrícula e a Senha.');
      return;
    }
    
    const unmaskedUsername = username.replace(/\D/g, '');
    
    // Validação de formato
    if (unmaskedUsername.length !== 6 && unmaskedUsername.length !== 11) {
        setError('CPF/Matrícula inválido. Deve ter 6 ou 11 dígitos.');
        return;
    }

    // Validação de senha
    if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return;
    }
    
    setIsLoading(true);
    setError('');

    try {
        const user = await api.login({ username: unmaskedUsername, password });
        if (user) {
            onLogin(user);
        } else {
            setError('CPF/Matrícula ou senha inválidos, ou o usuário pode estar inativo.');
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha na comunicação. Tente novamente mais tarde.');
        console.error("Login failed:", err);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all duration-500 hover:shadow-blue-500/50">
        <div className="text-center">
            <BioFarolLogo className="w-40 h-40 mx-auto mb-4" />
        </div>
        
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <Input
          id="username"
          label="CPF ou Matrícula"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder="000.000.000-00 ou 00.000-0"
          required
          disabled={isLoading}
          maxLength={14}
        />
        <Input
          id="password"
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          disabled={isLoading}
        />
        <Button type="submit" fullWidth disabled={isLoading}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
};

export default LoginScreen;
