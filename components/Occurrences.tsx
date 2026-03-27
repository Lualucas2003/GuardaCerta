
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Occurrence } from '../types';
import Button from './common/Button';
import { CreateOccurrenceModal } from './CreateOccurrenceModal';
import { ViewOccurrenceModal } from './ViewOccurrenceModal';
import { EditOccurrenceModal } from './EditOccurrenceModal'; // Import the new Edit modal
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import OccurrencesByType from './OccurrencesByType';
import Filters from './Filters';
import LocationMarkerIcon from './icons/LocationMarkerIcon';
import CalendarIcon from './icons/CalendarIcon';
import UserIcon from './icons/UserIcon';

interface OccurrencesProps {
  username: string;
  showToast: (message: string) => void;
}

const Occurrences: React.FC<OccurrencesProps> = ({ username, showToast }) => {
    const [allOccurrences, setAllOccurrences] = useState<Occurrence[]>([]);
    const [filteredOccurrences, setFilteredOccurrences] = useState<Occurrence[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingOccurrence, setViewingOccurrence] = useState<Occurrence | null>(null);
    const [editingOccurrence, setEditingOccurrence] = useState<Occurrence | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const [filters, setFilters] = useState({
        protocolo: '',
        responsavel: 'all',
        bairro: 'all',
        startDate: null as Date | null,
        endDate: null as Date | null,
    });
    
    const fetchOccurrences = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getocorrencia');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let data = await response.json();
            
            // Ensure data is an array
            if (!Array.isArray(data)) {
                data = [data];
            }

            // Helper to parse DD/MM/YYYY HH:mm format
            const parseTimestamp = (dateString: string): string => {
                const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4}|\d{2}) (\d{2}):(\d{2})/);
                if (!parts) return new Date().toISOString();
                // Handle 2 or 4 digit year
                let year = parseInt(parts[3]);
                if (year < 100) {
                    year += 2000; // Assuming 21st century
                }
                // new Date(year, monthIndex, day, hours, minutes)
                return new Date(year, parseInt(parts[2]) - 1, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5])).toISOString();
            };

            const mappedData: Occurrence[] = data.map((item: any, index: number): Occurrence => {
                // Attempt to create a more stable numeric ID from the protocolo string
                const numericId = parseInt(item.id_ocorrencia?.replace('NVM', '') || '0', 10);
                return {
                    id: !isNaN(numericId) ? numericId : index,
                    protocolo: item.id_ocorrencia ? String(item.id_ocorrencia).replace(/^NVM/, 'GC') : `GC${index}`,
                    responsavel: String(item.responsavel || 'N/A'),
                    type: item.tp_ocorrencia,
                    description: item.descricao,
                    descricao_audio: item.descricao_audio || '',
                    timestamp: parseTimestamp(item.data_horario),
                    address: {
                        cep: String(item.cep),
                        logradouro: item.logradouro,
                        numero: String(item.numero),
                        bairro: item.bairro,
                        cidade: item.cidade,
                        estado: item.estado,
                    },
                    latitude: item.latitude,
                    longitude: item.longitude,
                    status: 'A Iniciar',
                    priority: 3,
                    da: 'N/A',
                    acoesExecutadas: 'Nenhuma',
                    actionsCount: 0,
                };
            });
            
            // Sort by most recent date first
            mappedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setAllOccurrences(mappedData);
        } catch (e: any) {
            console.error("Failed to fetch occurrences:", e);
            setError("Não foi possível carregar as ocorrências no momento.");
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchOccurrences();
    }, [fetchOccurrences]);

    const responsaveisOptions = useMemo(() => {
        const responsaveis = new Set(allOccurrences.map(o => o.responsavel).filter(Boolean));
        return [{ value: 'all', label: 'Todos os Responsáveis' }, ...Array.from(responsaveis).sort().map(r => ({ value: r, label: r }))];
    }, [allOccurrences]);
    
    const bairrosOptions = useMemo(() => {
        const bairros = new Set(allOccurrences.map(o => o.address.bairro).filter(Boolean));
        return [{ value: 'all', label: 'Todos os Bairros' }, ...Array.from(bairros).sort().map(b => ({ value: b, label: b }))];
    }, [allOccurrences]);

    useEffect(() => {
        let results = [...allOccurrences];

        if (filters.protocolo) {
            results = results.filter(o => o.protocolo.toLowerCase().includes(filters.protocolo.toLowerCase()));
        }
        if (filters.responsavel !== 'all') {
            results = results.filter(o => o.responsavel === filters.responsavel);
        }
        if (filters.bairro !== 'all') {
            results = results.filter(o => o.address.bairro === filters.bairro);
        }
        if (filters.startDate) {
            const startOfDay = new Date(filters.startDate);
            startOfDay.setHours(0, 0, 0, 0);
            results = results.filter(o => new Date(o.timestamp) >= startOfDay);
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            results = results.filter(o => new Date(o.timestamp) <= endOfDay);
        }

        setFilteredOccurrences(results);
        setCurrentPage(1);
    }, [filters, allOccurrences]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as HTMLElement).closest('[data-menu-container]')) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]);
    
    const handleMenuToggle = (occurrenceId: number) => {
        setOpenMenuId(prevId => (prevId === occurrenceId ? null : occurrenceId));
    };

    const handleOccurrenceCreated = () => {
        setIsModalOpen(false);
        fetchOccurrences();
        showToast("Ocorrência registrada com sucesso!");
    };

    const handleSaveOccurrence = () => {
        setEditingOccurrence(null);
        fetchOccurrences();
        showToast("Ocorrência atualizada com sucesso!");
    };

    const handleDeleteOccurrence = (occurrenceId: number) => {
        if (window.confirm('Tem certeza que deseja excluir esta ocorrência?')) {
            setAllOccurrences(prev => prev.filter(occ => occ.id !== occurrenceId));
        }
    };

    const handleFilterChange = (filterName: keyof typeof filters, value: any) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            protocolo: '',
            responsavel: 'all',
            bairro: 'all',
            startDate: null,
            endDate: null,
        });
    };
    
    const ITEMS_PER_PAGE = 9;

    const paginatedOccurrences = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredOccurrences.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredOccurrences, currentPage]);

    const totalPages = Math.ceil(filteredOccurrences.length / ITEMS_PER_PAGE);


    const OccurrenceCard: React.FC<{ occurrence: Occurrence }> = ({ occurrence }) => {
        const isMenuOpen = openMenuId === occurrence.id;
        // Rule: If status is 'A Iniciar', apply special styling
        const isStatusIniciar = occurrence.status === 'A Iniciar';
    
        return (
            <div className={`bg-white rounded-xl shadow-md p-4 flex flex-col space-y-2 font-sans text-gray-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isStatusIniciar ? 'bg-gray-50 border-gray-300' : 'border-transparent'} border`}>
                {/* Header with Protocolo and Menu */}
                <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-base text-slate-900">{occurrence.protocolo}</p>
                    <div className="relative" data-menu-container>
                        <button 
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                            onClick={() => handleMenuToggle(occurrence.id)}
                            aria-haspopup="true"
                            aria-expanded={isMenuOpen}
                        >
                           <DotsVerticalIcon className="w-5 h-5" />
                        </button>
                        {isMenuOpen && (
                           <div
                                className="absolute top-full right-0 mt-2 bg-white rounded-md shadow-xl border border-gray-100 w-36 z-10"
                                role="menu"
                                aria-orientation="vertical"
                            >
                                <button onClick={() => { setViewingOccurrence(occurrence); setOpenMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100" role="menuitem">Visualizar</button>
                                <button onClick={() => { setEditingOccurrence(occurrence); setOpenMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100" role="menuitem">Editar</button>
                                <button onClick={() => { handleDeleteOccurrence(occurrence.id); setOpenMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">Excluir</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📍 Endereço */}
                <div className="flex items-center text-sm text-gray-600">
                    <LocationMarkerIcon className="w-5 h-5 mr-2 flex-shrink-0 text-pink-500" />
                    <p>{`${occurrence.address.logradouro}, ${occurrence.address.numero || 'S/N'} - ${occurrence.address.bairro}`}</p>
                </div>
                
                <div className="pt-2 space-y-1">
                     {/* Tipo */}
                    <p className="text-sm">
                        <span className="font-semibold text-gray-700">Tipo:</span> {occurrence.type}
                    </p>
                </div>

                {/* Footer: Data/Hora & Responsável */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 mt-auto border-t border-gray-200">
                    <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-500" />
                        <span>{new Date(occurrence.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</span>
                    </div>
                    <div className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1.5 text-purple-600" />
                        <span className="font-medium">{occurrence.responsavel}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Ocorrências</h2>
                <Button onClick={() => setIsModalOpen(true)}>Registrar Ocorrência</Button>
            </div>

            <Filters 
                viewMode={viewMode} 
                onViewModeChange={setViewMode}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                responsaveis={responsaveisOptions}
                bairros={bairrosOptions}
            />

            {loading && (
                <div className="text-center py-10">
                    <p className="text-gray-600 font-semibold">Carregando ocorrências...</p>
                </div>
            )}
            
            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                    <p className="font-bold">Erro</p>
                    <p>{error}</p>
                </div>
            )}
            
            {!loading && !error && filteredOccurrences.length === 0 && (
                 <div className="text-center py-10">
                    <p className="text-gray-600 font-semibold">Nenhuma ocorrência encontrada para os filtros selecionados.</p>
                </div>
            )}

            {!loading && !error && filteredOccurrences.length > 0 && viewMode === 'grid' ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {paginatedOccurrences.map(occ => <OccurrenceCard key={occ.protocolo} occurrence={occ} />)}
                    </div>
                     {totalPages > 1 && (
                        <div className="mt-6 flex justify-between items-center">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-gray-700">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </>
            ) : null}
            
            {!loading && !error && filteredOccurrences.length > 0 && viewMode === 'list' ? (
                 <OccurrencesByType
                    occurrences={filteredOccurrences}
                    onView={setViewingOccurrence}
                    onEdit={setEditingOccurrence}
                    onDelete={handleDeleteOccurrence}
                 />
            ) : null}


            {isModalOpen && <CreateOccurrenceModal onClose={() => setIsModalOpen(false)} onSaveSuccess={handleOccurrenceCreated} username={username} />}
            {viewingOccurrence && <ViewOccurrenceModal occurrence={viewingOccurrence} onClose={() => setViewingOccurrence(null)} />}
            {editingOccurrence && <EditOccurrenceModal occurrence={editingOccurrence} onClose={() => setEditingOccurrence(null)} onSave={handleSaveOccurrence} />}
        </div>
    );
};

export default Occurrences;
