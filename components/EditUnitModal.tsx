
import React, { useState } from 'react';
import { Unit } from '../types';
import { api } from './api';
import Button from './common/Button';
import Input from './common/Input';

interface EditUnitModalProps {
    unit: Unit;
    onClose: () => void;
    onSave: () => void;
}

const EditUnitModal: React.FC<EditUnitModalProps> = ({ unit, onClose, onSave }) => {
    const [name, setName] = useState(unit.name);
    const [sigla, setSigla] = useState(unit.sigla || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.updateUnit(unit.id, name, sigla);
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to update unit", error);
            alert(`Falha ao atualizar a unidade: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-lg rounded-lg transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-slate-100">Editar Unidade</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <Input 
                            // FIX: Added id prop to Input component.
                            id="name"
                            name="name" 
                            label="Nome da Unidade" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                        />
                        <Input 
                            // FIX: Added id prop to Input component.
                            id="sigla"
                            name="sigla" 
                            label="Sigla" 
                            value={sigla} 
                            onChange={(e) => setSigla(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end space-x-3 rounded-b-lg">
                        <Button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700">Cancelar</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUnitModal;