
import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { api } from './api';
import Button from './common/Button';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import AddProfileModal from './AddProfileModal';
import EditProfileModal from './EditProfileModal';

const ProfileSettings: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [profileToEdit, setProfileToEdit] = useState<Profile | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const profilesData = await api.getProfiles();
            setProfiles(profilesData);
        } catch (error) {
            console.error("Failed to fetch profiles data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddProfile = () => {
        setIsAddModalOpen(true);
    };
    
    const handleEditProfile = (profile: Profile) => {
        setProfileToEdit(profile);
        setIsEditModalOpen(true);
    };

    const handleDeleteProfile = async (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este perfil?')) {
            try {
                await api.deleteProfile(id);
                fetchData();
            } catch (error) {
                console.error("Failed to delete profile:", error);
                alert(`Falha ao excluir o perfil: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-slate-800">Gerenciar Perfis</h1>
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Todos os Perfis</h2>
                    <Button onClick={handleAddProfile} className="w-full sm:w-auto">Adicionar Novo</Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full bg-white responsive-table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome do Perfil</th>
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={2} className="p-4 text-center text-gray-500">Carregando...</td></tr>
                            ) : profiles.map(profile => (
                                <tr key={profile.id} className="hover:bg-gray-50">
                                    <td data-label="Nome do Perfil" className="p-3 text-sm text-gray-800">{profile.name}</td>
                                    <td data-label="Ações" className="p-3">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleEditProfile(profile)} className="text-blue-600 hover:text-blue-800 p-1"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteProfile(profile.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
             {isAddModalOpen && <AddProfileModal onClose={() => setIsAddModalOpen(false)} onSave={fetchData} />}
             {isEditModalOpen && profileToEdit && <EditProfileModal profile={profileToEdit} onClose={() => setIsEditModalOpen(false)} onSave={fetchData} />}
        </div>
    );
};

export default ProfileSettings;