
import React, { useState, useEffect } from 'react';
import { Unit } from '../types';
import { api } from './api';
import Button from './common/Button';
import PencilIcon from './icons/PencilIcon';
import TrashIcon from './icons/TrashIcon';
import AddUnitModal from './AddUnitModal';
import EditUnitModal from './EditUnitModal';

const UnitSettings: React.FC = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const unitsData = await api.getUnits();
            setUnits(unitsData);
        } catch (error) {
            console.error("Failed to fetch units data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteUnit = async (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir esta unidade?')) {
            await api.deleteUnit(id);
            fetchData();
        }
    };
    
    const handleOpenEditModal = (unit: Unit) => {
        setUnitToEdit(unit);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-slate-800">Gerenciar Unidades</h1>
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-slate-800">Todas as Unidades</h2>
                    <Button onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">Adicionar Nova</Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full bg-white responsive-table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome da Unidade</th>
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sigla</th>
                                <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={3} className="p-4 text-center text-gray-500">Carregando...</td></tr>
                            ) : units.map(unit => (
                                <tr key={unit.id} className="hover:bg-gray-50">
                                    <td data-label="Nome" className="p-3 text-sm text-gray-800">{unit.name}</td>
                                    <td data-label="Sigla" className="p-3 text-sm text-gray-600">{unit.sigla}</td>
                                    <td data-label="Ações" className="p-3">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleOpenEditModal(unit)} className="text-blue-600 hover:text-blue-800 p-1"><PencilIcon className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-600 hover:text-red-800 p-1"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
             {isAddModalOpen && <AddUnitModal onClose={() => setIsAddModalOpen(false)} onSave={fetchData} />}
             {isEditModalOpen && unitToEdit && <EditUnitModal unit={unitToEdit} onClose={() => setIsEditModalOpen(false)} onSave={fetchData} />}
        </div>
    );
};

export default UnitSettings;