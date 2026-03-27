
import React, { useState, useEffect, useMemo } from 'react';
import { User, Profile, Unit } from '../types';
import { api } from './api';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import FilterIcon from './icons/FilterIcon';
import ThinChevronDownIcon from './icons/ThinChevronDownIcon';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import AddUserModal from './AddUserModal';
import EditUserModal from './EditUserModal';

type SortKey = keyof User;

const UserSettings: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ name: '', cpf: '', profile: 'all', unit: 'all' });
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    
    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, profilesData, unitsData] = await Promise.all([
                api.getAllUsers(),
                api.getProfiles(),
                api.getUnits()
            ]);
            setUsers(usersData);
            setProfiles(profilesData);
            setUnits(unitsData);
        } catch (error) {
            console.error("Failed to fetch user settings data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredAndSortedUsers = useMemo(() => {
        let filtered = [...users];

        if (filters.name) {
            filtered = filtered.filter(u => (u?.nome || '').toLowerCase().includes(filters.name.toLowerCase()));
        }
        if (filters.cpf) {
            filtered = filtered.filter(u => u.cpf.replace(/[.-]/g, '').includes(filters.cpf.replace(/[.-]/g, '')));
        }
        if (filters.profile !== 'all') {
            filtered = filtered.filter(u => String(u.perfilId) === filters.profile);
        }
        if (filters.unit !== 'all') {
            filtered = filtered.filter(u => String(u.unidadeId) === filters.unit);
        }

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [users, filters, sortConfig]);
    
    const profileOptions = [{ value: 'all', label: 'Todos os Perfis' }, ...profiles.map(p => ({ value: String(p.id), label: p.name }))];
    const unitOptions = [{ value: 'all', label: 'Todas as Unidades' }, ...units.map(u => ({ value: String(u.id), label: u.name }))];
    
    const handleDeleteUser = async (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
            await api.deleteUser(id);
            fetchData();
        }
    };
    
    const handleOpenEditModal = (user: User) => {
        setUserToEdit(user);
        setIsEditModalOpen(true);
    };

    const SortArrow = ({ direction }: { direction: 'asc' | 'desc' | 'none' }) => {
        if (direction === 'none') return <span className="text-gray-400">↑↓</span>;
        return <span>{direction === 'asc' ? '↑' : '↓'}</span>;
    };
    
    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-slate-800">Gerenciar Usuários</h1>
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Todos os Usuários</h2>
                    <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">Adicionar Novo</Button>
                </div>

                {/* Filters */}
                <div className="border border-gray-200 rounded-lg">
                    <button onClick={() => setIsFiltersExpanded(!isFiltersExpanded)} className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-t-lg">
                        <div className="flex items-center space-x-2">
                            <FilterIcon className="w-5 h-5 text-gray-600" />
                            <h3 className="font-semibold text-gray-700">Filtros</h3>
                        </div>
                        <ThinChevronDownIcon className={`w-5 h-5 text-gray-600 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isFiltersExpanded && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input id="nameFilter" label="Nome" variant="light" value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})} />
                            <Input id="cpfFilter" label="CPF" variant="light" value={filters.cpf} onChange={e => setFilters({...filters, cpf: e.target.value})} />
                            <Select id="profileFilter" label="Perfil" variant="light" options={profileOptions} value={filters.profile} onChange={e => setFilters({...filters, profile: e.target.value})} />
                            <Select id="unitFilter" label="Unidade" variant="light" options={unitOptions} value={filters.unit} onChange={e => setFilters({...filters, unit: e.target.value})} />
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full bg-white responsive-table">
                        <thead className="bg-gray-50">
                            <tr>
                                {([
                                    { key: 'nome', label: 'Nome' }, { key: 'cpf', label: 'CPF' },
                                    { key: 'matricula', label: 'Matrícula' }, { key: 'email', label: 'Email' },
                                    { key: 'perfil', label: 'Perfil' }, { key: 'unidade', label: 'Unidade' }
                                ] as { key: SortKey, label: string }[]).map(({ key, label }) => (
                                    <th key={key} onClick={() => handleSort(key)} className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer">
                                        <div className="flex items-center space-x-1">
                                            <span>{label}</span>
                                            <SortArrow direction={sortConfig?.key === key ? sortConfig.direction : 'none'} />
                                        </div>
                                    </th>
                                ))}
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Carregando...</td></tr>
                            ) : filteredAndSortedUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td data-label="Nome" className="p-3 text-sm text-gray-800">{user.nome}</td>
                                    <td data-label="CPF" className="p-3 text-sm text-gray-600">{user.cpf}</td>
                                    <td data-label="Matrícula" className="p-3 text-sm text-gray-600">{user.matricula}</td>
                                    <td data-label="Email" className="p-3 text-sm text-gray-600">{user.email}</td>
                                    <td data-label="Perfil" className="p-3 text-sm text-gray-600">{user.perfil}</td>
                                    <td data-label="Unidade" className="p-3 text-sm text-gray-600">{user.unidade}</td>
                                    <td data-label="Ações" className="p-3">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleOpenEditModal(user)} className="text-blue-600 hover:text-blue-800 p-1"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
             {isAddModalOpen && <AddUserModal onClose={() => setIsAddModalOpen(false)} onSave={fetchData} profiles={profiles} units={units} />}
             {isEditModalOpen && userToEdit && <EditUserModal user={userToEdit} onClose={() => setIsEditModalOpen(false)} onSave={fetchData} profiles={profiles} units={units} />}
        </div>
    );
};

export default UserSettings;