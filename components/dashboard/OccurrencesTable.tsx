

import React, { useState, useMemo } from 'react';
import { Occurrence } from '../../types';
import Button from '../common/Button';

interface OccurrencesTableProps {
    occurrences: Occurrence[];
}

const ITEMS_PER_PAGE = 10;

const OccurrencesTable: React.FC<OccurrencesTableProps> = ({ occurrences }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // FIX: Changed state to handle numeric IDs.
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    const filteredOccurrences = useMemo(() => {
        return occurrences.filter(occ => 
            Object.values(occ).some(value => {
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(searchTerm.toLowerCase());
                }
                if (typeof value === 'object' && value !== null && 'logradouro' in value) {
                    return (value as any).logradouro.toLowerCase().includes(searchTerm.toLowerCase());
                }
                return false;
            })
        );
    }, [occurrences, searchTerm]);

    const paginatedOccurrences = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredOccurrences.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredOccurrences, currentPage]);

    const totalPages = Math.ceil(filteredOccurrences.length / ITEMS_PER_PAGE);

    // FIX: Changed id parameter type to number.
    const handleSelectRow = (id: number) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(new Set(paginatedOccurrences.map(o => o.id)));
        } else {
            setSelectedRows(new Set());
        }
    };
    
    const exportToCSV = () => {
        const headers = ['Protocolo', 'Endereço', 'Responsável', 'Ações Executadas', 'Data de Criação', 'Prioridade'];
        const rows = occurrences.map(occ => [
            // FIX: Use protocolo instead of numeric id for export.
            occ.protocolo,
            `"${occ.address.logradouro}, ${occ.address.numero} - ${occ.address.bairro}"`,
            occ.responsavel,
            occ.acoesExecutadas,
            new Date(occ.timestamp).toLocaleDateString('pt-BR'),
            occ.priority
        ].join(','));

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ocorrencias.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <input
                    type="text"
                    placeholder="Buscar ocorrência..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="border border-gray-300 rounded-md shadow-sm px-4 py-2 w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Button onClick={exportToCSV} className="bg-slate-800 hover:bg-slate-700 h-10 w-full sm:w-auto">Exportar Tudo para CSV</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full w-full bg-white border border-gray-200 responsive-table">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 w-12 text-left"><input type="checkbox" onChange={handleSelectAll} /></th>
                            {['Protocolo', 'Endereço', 'Responsável', 'Ações Executadas', 'Data de Criação', 'Prioridade'].map(header => (
                                <th key={header} className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {paginatedOccurrences.map(occ => (
                            <tr key={occ.id} className={`hover:bg-gray-50 ${selectedRows.has(occ.id) ? 'bg-blue-50' : ''}`}>
                                <td data-label="Selecionar" className="p-4"><input type="checkbox" checked={selectedRows.has(occ.id)} onChange={() => handleSelectRow(occ.id)} /></td>
                                {/* FIX: Display protocolo string instead of numeric id. */}
                                <td data-label="Protocolo" className="p-4 text-sm text-gray-800 font-medium">{occ.protocolo}</td>
                                <td data-label="Endereço" className="p-4 text-sm text-gray-600">{`${occ.address.logradouro}, ${occ.address.numero} - ${occ.address.bairro}`}</td>
                                <td data-label="Responsável" className="p-4 text-sm text-gray-600">{occ.responsavel}</td>
                                <td data-label="Ações Executadas" className="p-4 text-sm text-gray-600">{occ.acoesExecutadas}</td>
                                <td data-label="Data de Criação" className="p-4 text-sm text-gray-600">{new Date(occ.timestamp).toLocaleDateString('pt-BR')}</td>
                                <td data-label="Prioridade" className="p-4 text-sm text-gray-600">{occ.priority}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {paginatedOccurrences.length === 0 && <p className="text-center py-8 text-gray-500">Nenhuma ocorrência encontrada.</p>}
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm gap-4">
                <p className="text-gray-600">Página {currentPage} de {totalPages}</p>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
                    >
                        Próxima
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OccurrencesTable;