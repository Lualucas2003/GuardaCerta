
import React, { useState } from 'react';
import { User, Profile, Unit } from '../types';
import { api } from './api';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSave: () => void;
    profiles: Profile[];
    units: Unit[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSave, profiles, units }) => {
    const [formData, setFormData] = useState({
        nome: user.nome,
        cpf: user.cpf,
        matricula: user.matricula,
        email: user.email,
        celular: user.celular || '',
        perfilId: user.perfilId,
        unidadeId: user.unidadeId,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const perfilName = profiles.find(p => p.id === Number(formData.perfilId))?.name || '';
        const unidadeName = units.find(u => u.id === Number(formData.unidadeId))?.name || '';

        const updatedUserData: Partial<User> = {
            ...formData,
            perfilId: Number(formData.perfilId),
            unidadeId: Number(formData.unidadeId),
            perfil: perfilName,
            unidade: unidadeName
        };

        try {
            await api.updateUser(user.id, updatedUserData);
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to update user", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const profileOptions = profiles.map(p => ({ value: String(p.id), label: p.name }));
    const unitOptions = units.map(u => ({ value: String(u.id), label: u.name }));

    return (
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-lg rounded-lg transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-700">
                        <h2 className="text-xl font-bold text-slate-100">Editar Usuário</h2>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* FIX: Added id prop to Input component. */}
                        <Input id="nome" name="nome" label="Nome Completo" value={formData.nome} onChange={handleChange} required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* FIX: Added id prop to Input component. */}
                           <Input id="cpf" name="cpf" label="CPF" value={formData.cpf} onChange={handleChange} required />
                           {/* FIX: Added id prop to Input component. */}
                           <Input id="matricula" name="matricula" label="Matrícula" value={formData.matricula} onChange={handleChange} required />
                        </div>
                        {/* FIX: Added id prop to Input component. */}
                        <Input id="email" name="email" label="Email" type="email" value={formData.email} onChange={handleChange} required />
                        {/* FIX: Added id prop to Input component. */}
                        <Input id="celular" name="celular" label="Celular" value={formData.celular} onChange={handleChange} placeholder="5581999999999" required />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* FIX: Added id prop to Select component. */}
                            <Select id="perfilId" name="perfilId" label="Perfil" value={String(formData.perfilId)} onChange={handleChange} options={profileOptions} required />
                            {/* FIX: Added id prop to Select component. */}
                            <Select id="unidadeId" name="unidadeId" label="Unidade" value={String(formData.unidadeId)} onChange={handleChange} options={unitOptions} required />
                        </div>
                        {/* FIX: Added id prop to Input component. */}
                        <Input id="senha" name="senha" label="Nova Senha" type="password" placeholder="Deixe em branco para não alterar" onChange={handleChange} minLength={2} />
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

export default EditUserModal;