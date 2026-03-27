

import React, { useState, useEffect, useCallback } from 'react';
import Button from './common/Button';
import MenuIcon from './icons/MenuIcon';
import CalendarIcon from './icons/CalendarIcon';
import MapPinIcon from './icons/MapPinIcon';
import PencilIcon from './icons/PencilIcon';
import EyeIcon from './icons/EyeIcon';
import BanIcon from './icons/BanIcon';
import TrashIcon from './icons/TrashIcon';
import RefreshIcon from './icons/RefreshIcon';
import HistoryIcon from './icons/HistoryIcon';
import { Rota, User } from '../types';
import CalendarView from './CalendarView';
import MapView from './MapView';
import { api } from './api';
import RouteEditModal from './RouteEditModal';
import RouteDetailsModal from './RouteDetailsModal';
import ExecutionHistoryModal from './ExecutionHistoryModal';

interface RoteirizacaoProps {
    showToast: (message: string) => void;
    user: User;
}

const Roteirizacao: React.FC<RoteirizacaoProps> = ({ showToast, user }) => {
    const [activeView, setActiveView] = useState<'list' | 'calendar' | 'map'>('list');
    const [routes, setRoutes] = useState<Rota[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingRouteId, setUpdatingRouteId] = useState<number | null>(null);

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [routeToEdit, setRouteToEdit] = useState<Rota | undefined>(undefined);

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [routeToView, setRouteToView] = useState<Rota | undefined>(undefined);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [routeForHistory, setRouteForHistory] = useState<Rota | undefined>(undefined);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const rotasData = await api.getRotas(user);
            setRoutes(rotasData);
        } catch (error) {
            console.error("Failed to fetch routes:", error);
            // Here you would set an error state and show a message to the user
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenCreateModal = () => {
        setRouteToEdit(undefined);
        setIsEditModalOpen(true);
    };

    const handleOpenEditModal = (route: Rota) => {
        setRouteToEdit(route);
        setIsEditModalOpen(true);
    };

    const handleOpenDetailsModal = (route: Rota) => {
        setRouteToView(route);
        setIsDetailsModalOpen(true);
    };
    
    const handleOpenHistoryModal = (route: Rota) => {
        setRouteForHistory(route);
        setIsHistoryModalOpen(true);
    };

    const handleSaveRoute = () => {
        setIsEditModalOpen(false);
        fetchData(); // Refresh data after save
    };
    
    const handleDeleteRoute = async (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir esta rota permanentemente?')) {
            await api.deleteRota(id);
            fetchData();
        }
    };

    const handleToggleDisableRoute = async (route: Rota) => {
        const newStatus = route.status === 'Desabilitado' ? 'Ativo' : 'Desabilitado';
        const actionText = newStatus === 'Ativo' ? 'reativar' : 'desabilitar';
        
        setUpdatingRouteId(route.id);
        try {
            await api.updateRota(route.id, { ...route, status: newStatus });
            await fetchData();
        } catch (error) {
            console.error(`Failed to ${actionText} route:`, error);
            alert(`Não foi possível ${actionText} a rota. Por favor, tente novamente.`);
        } finally {
            setUpdatingRouteId(null);
        }
    };


    const activeRoutes = routes.filter(r => r.status === 'Ativo');
    const disabledRoutes = routes.filter(r => r.status === 'Desabilitado');

    const viewButtonClasses = "flex items-center space-x-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors";
    const activeViewClasses = "bg-slate-800 text-white shadow";
    const inactiveViewClasses = "bg-white text-gray-700 hover:bg-gray-100 border";

    const renderView = () => (
        <>
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center space-x-2 self-start">
                    <button onClick={() => setActiveView('list')} className={`${viewButtonClasses} ${activeView === 'list' ? activeViewClasses : inactiveViewClasses}`}>
                        <MenuIcon className="w-5 h-5" />
                        <span>Lista</span>
                    </button>
                    <button onClick={() => setActiveView('calendar')} className={`${viewButtonClasses} ${activeView === 'calendar' ? activeViewClasses : inactiveViewClasses}`}>
                        <CalendarIcon className="w-5 h-5" />
                        <span>Calendário</span>
                    </button>
                    <button onClick={() => setActiveView('map')} className={`${viewButtonClasses} ${activeView === 'map' ? activeViewClasses : inactiveViewClasses}`}>
                        <MapPinIcon className="w-5 h-5" />
                        <span>Mapa</span>
                    </button>
                </div>
                <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">Cadastrar Rota</Button>
            </div>

            {activeView === 'list' && (
                 <>
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Lista de Rotas Cadastradas</h3>
                        <div className="divide-y divide-gray-200">
                            {activeRoutes.map(route => (
                                <RouteListItem key={route.id} route={route} isUpdating={updatingRouteId === route.id} onDetails={handleOpenDetailsModal} onHistory={handleOpenHistoryModal} onEdit={handleOpenEditModal} onToggleDisable={handleToggleDisableRoute} onDelete={handleDeleteRoute} />
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Rotas Desabilitadas</h3>
                        <div className="divide-y divide-gray-200">
                            {disabledRoutes.map(route => (
                                <RouteListItem key={route.id} route={route} isUpdating={updatingRouteId === route.id} onDetails={handleOpenDetailsModal} onHistory={handleOpenHistoryModal} onEdit={handleOpenEditModal} onToggleDisable={handleToggleDisableRoute} onDelete={handleDeleteRoute} />
                            ))}
                        </div>
                    </div>
                </>
            )}
            {activeView === 'calendar' && <CalendarView routes={routes} onRouteClick={handleOpenDetailsModal} />}
            {activeView === 'map' && <MapView routes={routes} />}
        </>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Roteirização</h2>
            {loading ? <p>Carregando rotas...</p> : renderView()}
            {isEditModalOpen && <RouteEditModal onClose={() => setIsEditModalOpen(false)} onSave={handleSaveRoute} routeToEdit={routeToEdit} />}
            {isDetailsModalOpen && routeToView && <RouteDetailsModal route={routeToView} onClose={() => setIsDetailsModalOpen(false)} showToast={showToast} />}
            {isHistoryModalOpen && routeForHistory && <ExecutionHistoryModal route={routeForHistory} onClose={() => setIsHistoryModalOpen(false)} />}
        </div>
    );
};


interface RouteListItemProps {
    route: Rota;
    isUpdating: boolean;
    onDetails: (route: Rota) => void;
    onHistory: (route: Rota) => void;
    onEdit: (route: Rota) => void;
    onToggleDisable: (route: Rota) => void;
    onDelete: (id: number) => void;
}

const RouteListItem: React.FC<RouteListItemProps> = ({ route, isUpdating, onDetails, onHistory, onEdit, onToggleDisable, onDelete }) => {
    const isDesabilitada = route.status === 'Desabilitado';
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-3">
            <div>
                <p className={`font-bold ${isDesabilitada ? 'text-gray-400' : 'text-slate-800'}`}>{route.nome}</p>
                <p className={`text-sm ${isDesabilitada ? 'text-gray-500' : 'text-gray-600'} mt-1`}>
                    Fiscal: {route.fiscalNome} | Pontos: {route.pontos.length} | Periodicidade: {route.periodicidade}
                </p>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 self-end sm:self-auto flex-shrink-0">
                {isDesabilitada ? (
                    <button onClick={() => onToggleDisable(route)} disabled={isUpdating} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-wait">
                        <RefreshIcon className={`w-4 h-4 mr-1.5 ${isUpdating ? 'animate-spin' : ''}`} />
                        {isUpdating ? 'Reativando...' : 'Reativar'}
                    </button>
                ) : (
                    <>
                        <button onClick={() => onDetails(route)} disabled={isUpdating} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-md hover:bg-gray-100 disabled:opacity-50" title="Ver Detalhes e Executar">
                            <EyeIcon className="w-5 h-5" />
                        </button>
                         <button onClick={() => onHistory(route)} disabled={isUpdating} className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-100 disabled:opacity-50" title="Ver Histórico">
                            <HistoryIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onEdit(route)} disabled={isUpdating} className="p-1.5 text-gray-500 hover:text-yellow-600 rounded-md hover:bg-gray-100 disabled:opacity-50" title="Editar">
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => onToggleDisable(route)} disabled={isUpdating} className="p-1.5 text-gray-500 hover:text-orange-600 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-wait" title="Desabilitar">
                                {isUpdating ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <BanIcon className="w-5 h-5" />}
                        </button>
                        <button onClick={() => onDelete(route.id)} disabled={isUpdating} className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100 disabled:opacity-50" title="Excluir">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Roteirizacao;