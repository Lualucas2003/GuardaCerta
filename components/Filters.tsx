
import React, { useState, useRef, useEffect } from 'react';
import Input from './common/Input';
import Select from './common/Select';
import FilterIcon from './icons/FilterIcon';
import ChevronDownIcon from './icons/ChevronDownIcon'; // This is actually a chevron-up icon
import CalendarIcon from './icons/CalendarIcon';
import GridViewIcon from './icons/GridViewIcon';
import ListViewIcon from './icons/ListViewIcon';


declare const flatpickr: any;

interface FiltersProps {
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    filters: {
        protocolo: string;
        responsavel: string;
        bairro: string;
        startDate: Date | null;
        endDate: Date | null;
    };
    onFilterChange: (filterName: string, value: any) => void;
    onClearFilters: () => void;
    responsaveis: { value: string; label: string }[];
    bairros: { value: string; label: string }[];
}


const Filters: React.FC<FiltersProps> = ({
    viewMode,
    onViewModeChange,
    filters,
    onFilterChange,
    onClearFilters,
    responsaveis,
    bairros
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        let fpStart: any = null;
        let fpEnd: any = null;
        if (typeof flatpickr !== 'undefined') {
            if (startDateRef.current) {
                fpStart = flatpickr(startDateRef.current, {
                    dateFormat: "d/m/Y",
                    placeholder: "dd/mm/aaaa",
                    onChange: (selectedDates: Date[]) => {
                        onFilterChange('startDate', selectedDates[0] || null);
                        if (fpEnd) {
                            fpEnd.set('minDate', selectedDates[0]);
                        }
                    }
                });
            }
            if (endDateRef.current) {
                fpEnd = flatpickr(endDateRef.current, {
                    dateFormat: "d/m/Y",
                    placeholder: "dd/mm/aaaa",
                    onChange: (selectedDates: Date[]) => {
                        onFilterChange('endDate', selectedDates[0] || null);
                    }
                });
            }
        }
        return () => {
            fpStart?.destroy();
            fpEnd?.destroy();
        };
    }, [onFilterChange]);

    const handleClearClick = () => {
        if (startDateRef.current && (startDateRef.current as any)._flatpickr) {
            (startDateRef.current as any)._flatpickr.clear();
        }
        if (endDateRef.current && (endDateRef.current as any)._flatpickr) {
            (endDateRef.current as any)._flatpickr.clear();
        }
        onClearFilters();
    };

    const handleViewChange = (e: React.MouseEvent, mode: 'grid' | 'list') => {
        e.stopPropagation(); // Prevent the filter collapse/expand when changing view
        onViewModeChange(mode);
    };


    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-4"
                aria-expanded={isExpanded}
                aria-controls="filters-content"
            >
                <div className="flex items-center space-x-3">
                    <FilterIcon className="w-5 h-5 text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-800">Filtros</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                     <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-md">
                         <div 
                            onClick={(e) => handleViewChange(e, 'grid')}
                            className={`p-2 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:bg-white'}`}
                            title="Visualização em Grade"
                            role="button"
                            tabIndex={0}
                         >
                            <GridViewIcon className="w-5 h-5" />
                        </div>
                         <div
                            onClick={(e) => handleViewChange(e, 'list')}
                            className={`p-2 rounded cursor-pointer ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:bg-white'}`}
                            title="Visualização em Lista"
                            role="button"
                            tabIndex={0}
                         >
                            <ListViewIcon className="w-5 h-5" />
                        </div>
                    </div>
                    {/* This icon points up, so it rotates to point down when collapsed */}
                    <ChevronDownIcon className={`w-6 h-6 text-gray-600 transition-transform duration-300 ${isExpanded ? '' : 'rotate-180'}`} />
                </div>
            </button>
            <div id="filters-content" className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`}>
                <div className="p-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <Input 
                                id="protocolo" 
                                label="Protocolo" 
                                type="text" 
                                variant="light" 
                                value={filters.protocolo}
                                onChange={(e) => onFilterChange('protocolo', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <Select
                                id="responsavel"
                                label="Responsável"
                                variant="light"
                                options={responsaveis}
                                value={filters.responsavel}
                                onChange={(e) => onFilterChange('responsavel', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <Select
                                id="bairro"
                                label="Bairro"
                                variant="light"
                                options={bairros}
                                value={filters.bairro}
                                onChange={(e) => onFilterChange('bairro', e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data da Ocorrência</label>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        ref={startDateRef} 
                                        type="text"
                                        id="start-date" 
                                        className="w-full px-4 py-2 h-[42px] border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow duration-300 bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500" 
                                        placeholder="dd/mm/aaaa"
                                    />
                                    <CalendarIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                <span className="text-gray-500 text-center sm:text-left">até</span>
                                <div className="relative flex-1">
                                    <input 
                                        ref={endDateRef} 
                                        type="text"
                                        id="end-date" 
                                        className="w-full px-4 py-2 h-[42px] border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow duration-300 bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500" 
                                        placeholder="dd/mm/aaaa"
                                    />
                                    <CalendarIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-1 flex items-end justify-start md:justify-end">
                            <button onClick={handleClearClick} type="button" className="w-full md:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors h-[42px]">
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Filters;