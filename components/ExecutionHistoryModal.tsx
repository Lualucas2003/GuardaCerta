

import React, { useState, useEffect, useMemo } from 'react';
import { Rota, RotaCheckin, RotaPonto } from '../types';
import { api } from './api';
import Button from './common/Button';
import DotsVerticalIcon from './icons/DotsVerticalIcon';

interface ExecutionHistoryModalProps {
    route: Rota;
    onClose: () => void;
}

const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({ route, onClose }) => {
    const [checkins, setCheckins] = useState<RotaCheckin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'history' | 'album'>('history');
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [photosToShow, setPhotosToShow] = useState<string[] | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            const data = await api.getCheckinsForRota(route.id);
            setCheckins(data);
            setIsLoading(false);
        };
        fetchHistory();
    }, [route.id]);

    const executionDates = useMemo(() => {
// FIX: Add a guard to ensure `dataCheckin` is a valid string before creating a Date object.
        const dates = new Set(checkins.map(c => c.dataCheckin ? new Date(c.dataCheckin).toDateString() : null).filter(Boolean) as string[]);
        return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [checkins]);

    const albumData = useMemo(() => {
        // Group checkins by date
        const groupedByDate = new Map<string, RotaCheckin[]>();
        checkins.forEach(checkin => {
            if (checkin.anexoUrls && checkin.anexoUrls.length > 0) {
// FIX: Add a guard to ensure `dataCheckin` is a valid string before creating a Date object.
                const dateStr = checkin.dataCheckin ? new Date(checkin.dataCheckin).toDateString() : null;
                if (dateStr) {
                    if (!groupedByDate.has(dateStr)) {
                        groupedByDate.set(dateStr, []);
                    }
                    groupedByDate.get(dateStr)!.push(checkin);
                }
            }
        });
        
        // Sort dates from most recent to oldest
        const sortedDates = Array.from(groupedByDate.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        // Create the final data structure
        return sortedDates.map(date => ({
            date,
            checkins: groupedByDate.get(date)!
        }));
    }, [checkins]);


    const getStatusForPontoOnDate = (ponto: RotaPonto, date: string): RotaCheckin | null => {
        // The check-in API does not return a stable `pontoId`. 
        // We match based on the point's name or protocol, which is stored in the check-in's `pontoNome` property.
        const pontoIdentifier = 'protocolo' in ponto ? String(ponto.protocolo) : ponto.nome;

        return checkins.find(c => {
            const isNameMatch = c.pontoNome === pontoIdentifier;
            const isDateMatch = c.dataCheckin ? new Date(c.dataCheckin).toDateString() === date : false;
            return isNameMatch && isDateMatch;
        }) || null;
    };
    
    const viewButtonClasses = "px-4 py-2 text-sm font-semibold rounded-md transition-colors";
    const activeClasses = "bg-slate-700 text-white shadow";
    const inactiveClasses = "bg-slate-800/50 text-slate-300 hover:bg-slate-700";


    return (
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
             {photosToShow && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4" onClick={() => setPhotosToShow(null)}>
                    <div className="bg-slate-700 rounded-lg shadow-xl w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-xl font-bold text-white">Fotos do Ponto</h3>
                             <button onClick={() => setPhotosToShow(null)} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
                            {photosToShow.map((url, i) => (
                                <img
                                    key={url + i}
                                    src={url}
                                    alt={`Foto ${i + 1}`}
                                    className="w-full h-32 object-cover rounded-md border-2 border-slate-600 cursor-pointer hover:border-blue-500 transition-all hover:scale-105"
                                    onClick={() => setLightboxImage(url)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
             {lightboxImage && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-70"
                  onClick={() => setLightboxImage(null)}
                >
                  <div className="relative p-4">
                    <button
                      onClick={() => setLightboxImage(null)}
                      className="absolute top-0 right-0 m-4 text-white text-3xl leading-none"
                    >
                      &times;
                    </button>
                    <img
                      src={lightboxImage}
                      alt="Visualização ampliada"
                      className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                    />
                  </div>
                </div>
            )}
            <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-4xl h-[calc(100vh-8rem)] flex flex-col">
                <div className="p-6 border-b border-slate-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-100">Histórico de Execução</h2>
                            <p className="text-slate-400">{route.nome}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                    </div>
                     <div className="mt-4 flex space-x-2 bg-slate-900/70 p-1 rounded-lg">
                        <button onClick={() => setView('history')} className={`${viewButtonClasses} ${view === 'history' ? activeClasses : inactiveClasses}`}>Histórico</button>
                        <button onClick={() => setView('album')} className={`${viewButtonClasses} ${view === 'album' ? activeClasses : inactiveClasses}`}>Álbum de Fotos</button>
                    </div>
                </div>
                <div className="flex-grow p-6 overflow-y-auto">
                    {isLoading && <p className="text-slate-300 text-center">Carregando histórico...</p>}
                    
                    {!isLoading && view === 'history' && (
                        <>
                            {executionDates.length === 0 && <p className="text-slate-300 text-center">Nenhum histórico de execução encontrado para esta rota.</p>}
                            <div className="space-y-6">
                                {executionDates.map(dateStr => (
                                    <div key={dateStr} className="bg-slate-900/50 p-4 rounded-lg">
                                        <h3 className="font-bold text-lg text-white mb-3">{new Date(dateStr).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                        <div className="space-y-2">
                                            {route.pontos.map(ponto => {
                                                const checkin = getStatusForPontoOnDate(ponto, dateStr);

                                                return (
                                                    <div key={ponto.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                                                        <div>
                                                            <p className="font-semibold text-slate-200">{'protocolo' in ponto ? `Ocorrência ${ponto.protocolo}` : ponto.nome}</p>
                                                            {ponto.estimatedArrivalTime && (
                                                                <p className="text-xs text-slate-400 mt-1">Previsto: {ponto.estimatedArrivalTime}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            {checkin ? (
                                                                <>
                                                                    <span className="text-xs font-bold text-green-300 bg-green-900/70 px-3 py-1.5 rounded-full">EXECUTADO</span>
                                                                    {checkin.anexoUrls && checkin.anexoUrls.length > 0 && (
                                                                        <button onClick={() => setPhotosToShow(checkin.anexoUrls!)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors" title="Ver fotos do check-in">
                                                                            <DotsVerticalIcon className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-xs font-bold text-gray-300 bg-gray-700/60 px-3 py-1.5 rounded-full">PENDENTE</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                     {!isLoading && view === 'album' && (
                        <>
                            {albumData.length === 0 && <p className="text-slate-300 text-center">Nenhuma foto encontrada no histórico desta rota.</p>}
                            <div className="space-y-8">
                                {albumData.map(day => (
                                    <div key={day.date} className="bg-slate-900/50 p-4 rounded-lg">
                                        <h3 className="font-bold text-lg text-white mb-4 border-b border-slate-700 pb-2">{new Date(day.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                                        <div className="space-y-6">
                                            {day.checkins.map(checkin => (
                                                <div key={checkin.id} className="p-3 bg-slate-800 rounded-md">
                                                    <div className="mb-3 pb-2 border-b border-slate-700">
                                                        <h4 className="font-semibold text-slate-200">{checkin.pontoNome}</h4>
                                                        <p className="text-xs text-slate-400">Rota: {route.nome}</p>
                                                    </div>
                                                    {checkin.observacao ? (
                                                        <blockquote className="text-sm text-slate-300 border-l-4 border-slate-600 pl-3 italic mb-3">
                                                            "{checkin.observacao}"
                                                        </blockquote>
                                                    ) : (
                                                         <h4 className="font-semibold text-slate-400 mb-2 text-sm italic">Sem observação registrada</h4>
                                                    )}
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                                        {checkin.anexoUrls!.map((url, i) => (
                                                            <img
                                                                key={url + i}
                                                                src={url}
                                                                alt={`Foto de check-in ${i + 1}`}
                                                                className="w-full h-24 object-cover rounded-md border-2 border-slate-600 cursor-pointer hover:border-blue-500 transition-all hover:scale-105"
                                                                onClick={() => setLightboxImage(url)}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                     )}
                </div>
                 <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end">
                    <Button onClick={onClose} className="bg-slate-600 hover:bg-slate-700">Fechar</Button>
                </div>
            </div>
        </div>
    );
};

export default ExecutionHistoryModal;