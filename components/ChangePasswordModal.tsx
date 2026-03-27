import React, { useState } from 'react';
import Button from './common/Button';
import { User } from '../types';
import { api } from './api';

interface ChangePasswordModalProps {
    user: User;
    onClose: () => void;
    showToast: (message: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ user, onClose, showToast }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 2) {
            setError('A nova senha deve ter pelo menos 2 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);
        try {
            await api.changePassword(user, newPassword);
            showToast('Senha alterada com sucesso!');
            onClose();
        } catch (err) {
            console.error('Erro ao alterar senha:', err);
            setError('Falha ao alterar a senha. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Mudar Senha</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nova Senha
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            minLength={2}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Nova Senha
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            minLength={2}
                            required
                        />
                    </div>
                    <div className="pt-4 flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar Senha'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
