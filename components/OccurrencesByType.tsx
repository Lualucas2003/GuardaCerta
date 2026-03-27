

import React, { useState, useMemo, useEffect } from 'react';
import ThinChevronDownIcon from './icons/ThinChevronDownIcon';
import { Occurrence } from '../types';
import LocationMarkerIcon from './icons/LocationMarkerIcon';
import CalendarIcon from './icons/CalendarIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';

interface OccurrencesByTypeProps {
    occurrences: Occurrence[];
    onView: (occurrence: Occurrence) => void;
    onEdit: (occurrence: Occurrence) => void;
    onDelete: (occurrenceId: number) => void;
}

const OccurrencesByType: React.FC<OccurrencesByTypeProps> = ({ occurrences, onView, onEdit, onDelete }) => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState('maior-menor');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const toggleAccordion = (name: string) => {
        setOpenAccordion(openAccordion === name ? null : name);
    };

    const handleMenuToggle = (protocolo: string) => {
        setOpenMenuId(prevId => (prevId === protocolo ? null : protocolo));
    };

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

    const occurrenceTypesData = useMemo(() => {
        const counts: { [key: string]: { count: number; occurrences: Occurrence[] } } = {};

        occurrences.forEach(occ => {
            // Fallback for occurrences that might not have a type
            const type = occ.type || 'Sem Categoria';
            if (!counts[type]) {
                counts[type] = { count: 0, occurrences: [] };
            }
            counts[type].count++;
            counts[type].occurrences.push(occ);
        });

        return Object.entries(counts).map(([name, data]) => ({
            name,
            count: data.count,
            occurrences: data.occurrences,
        }));
    }, [occurrences]);

    const sortedData = useMemo(() => {
        const data = [...occurrenceTypesData];
        if (sortOrder === 'maior-menor') {
            return data.sort((a, b) => b.count - a.count);
        }
        if (sortOrder === 'menor-maior') {
            return data.sort((a, b) => a.count - b.count);
        }
        if (sortOrder === 'alfabetica') {
            return data.sort((a, b) => a.name.localeCompare(b.name));
        }
        return data;
    }, [sortOrder, occurrenceTypesData]);


    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <label htmlFor="sort-order" className="text-sm text-gray-600 mr-2">Ordenar por:</label>
                <select 
                    id="sort-order"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="maior-menor">Quantidade (Maior para Menor)</option>
                    <option value="menor-maior">Quantidade (Menor para Maior)</option>
                    <option value="alfabetica">Ordem Alfabética</option>
                </select>
            </div>
             {sortedData.length === 0 && <p className="text-center py-8 text-gray-500">Nenhuma ocorrência para exibir na lista.</p>}
            <div className="space-y-3">
                {sortedData.map(item => (
                    <div key={item.name} className="bg-white rounded-lg shadow-sm border border-gray-200/80 overflow-hidden">
                        <button 
                            onClick={() => toggleAccordion(item.name)} 
                            className="w-full flex justify-between items-center p-4 text-left"
                            aria-expanded={openAccordion === item.name}
                        >
                            <div className="flex items-center">
                                <span className="font-bold text-gray-800">{item.name}</span>
                                <span className="ml-3 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                                    {item.count}
                                </span>
                            </div>
                            <ThinChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${openAccordion === item.name ? 'rotate-180' : ''}`} />
                        </button>
                        {openAccordion === item.name && (
                            <div className="p-4 border-t border-gray-200 bg-gray-50/80 space-y-3">
                                {item.occurrences.map(occ => {
                                    const isMenuOpen = openMenuId === occ.protocolo;
                                    return (
                                        <div key={occ.protocolo} className="p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-semibold text-gray-800">{occ.protocolo}</p>
                                                <div className="relative" data-menu-container>
                                                    <button 
                                                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                                        onClick={() => handleMenuToggle(occ.protocolo)}
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
                                                            <button onClick={() => { onView(occ); setOpenMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100" role="menuitem">Visualizar</button>
                                                            <button onClick={() => { onEdit(occ); setOpenMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100" role="menuitem">Editar</button>
                                                            <button onClick={() => { onDelete(occ.id); setOpenMenuId(null); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">Excluir</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center text-sm text-gray-600">
                                                <LocationMarkerIcon className="w-4 h-4 mr-1.5 flex-shrink-0 text-pink-500" />
                                                <p>{`${occ.address.logradouro}, ${occ.address.numero || 'S/N'} - ${occ.address.bairro}`}</p>
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                                <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                                <span>{new Date(occ.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OccurrencesByType;