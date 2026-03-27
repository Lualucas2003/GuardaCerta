
import React, { useState } from 'react';
import { api } from './api';
import Button from './common/Button';
import Input from './common/Input';

interface AddProfileModalProps {
    onClose: () => void;
    onSave: () => void;
}

const AddProfileModal: React.FC<AddProfileModalProps> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.createProfile(name);
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to create profile", error);
            alert(`Falha ao criar o perfil: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-lg rounded-lg transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-slate-100">Adicionar Novo Perfil</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <Input 
                            // FIX: Added id prop to Input component.
                            id="name"
                            name="name" 
                            label="Nome do Perfil" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end space-x-3 rounded-b-lg">
                        <Button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700">Cancelar</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProfileModal;