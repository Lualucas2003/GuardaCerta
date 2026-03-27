

import React, { useState, useEffect, useRef } from 'react';
import { Rota, RotaPonto, RotaCheckin } from '../types';
import { api } from './api';
import Button from './common/Button';
import Input from './common/Input';
import CameraIcon from './icons/CameraIcon';
import TrashIcon from './icons/TrashIcon';

declare const L: any;

interface RouteDetailsModalProps {
    route: Rota;
    onClose: () => void;
    showToast: (message: string) => void;
}

// Checkin/Skip sub-modal
const CheckinModal = ({
    ponto,
    mode,
    onClose,
    onSubmit
}: {
    ponto: RotaPonto,
    mode: 'checkin' | 'skip',
    onClose: () => void,
    onSubmit: (data: { observacao: string; fotos: File[] }) => Promise<void>
}) => {
    const [observacao, setObservacao] = useState('');
    const [fotos, setFotos] = useState<File[]>([]);
    const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFotos(prev => [...prev, file]);
            setFotoPreviews(prev => [...prev, URL.createObjectURL(file)]);
        }
        e.target.value = ''; // Allow re-capturing
    };
    
    const removeFoto = (indexToRemove: number) => {
        setFotos(prev => prev.filter((_, i) => i !== indexToRemove));
        setFotoPreviews(prev => {
            const urlToRemove = prev[indexToRemove];
            URL.revokeObjectURL(urlToRemove);
            return prev.filter((_, i) => i !== indexToRemove);
        });
    };

    useEffect(() => {
        // Clean up all object URLs when the component unmounts
        return () => {
            fotoPreviews.forEach(url => URL.revokeObjectURL(url));
        };
    }, [fotoPreviews]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'checkin' && fotos.length === 0) {
            alert('Ao menos uma foto é obrigatória para o check-in.');
            return;
        }
        if (mode === 'skip' && !observacao) {
             alert('A observação é obrigatória para pular um ponto.');
            return;
        }

        setIsUploading(true);
        try {
            await onSubmit({ observacao, fotos });
        } catch (error) {
            console.error("Failed to submit checkin:", error);
            alert(`Falha ao enviar check-in: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-80 flex items-center justify-center z-[60] p-4">
            <div className="bg-slate-700 rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {mode === 'checkin' ? 'Realizar Check-in' : 'Pular Ponto'}
                        </h3>
                        <p className="text-slate-300 mb-4">{'protocolo' in ponto ? `Ocorrência ${ponto.protocolo}` : ponto.nome}</p>
                        
                        {mode === 'checkin' && (
                            <div className="mb-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                                    {fotoPreviews.map((preview, index) => (
                                        <div key={preview} className="relative group">
                                            <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-md border border-slate-600" />
                                            <button type="button" onClick={() => removeFoto(index)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-slate-500 rounded-md flex flex-col items-center justify-center text-slate-400 hover:bg-slate-600">
                                    <CameraIcon className="w-8 h-8 mb-1" />
                                    <span>{fotos.length > 0 ? 'Tirar Outra Foto' : 'Tirar Foto(s)'}</span>
                                </button>
                                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} hidden />
                            </div>
                        )}
                        
                        <div>
                            <label htmlFor="observacao" className="block text-sm font-medium text-slate-300 mb-2">Observação {mode === 'skip' ? '(obrigatório)' : '(opcional)'}</label>
                            <textarea id="observacao" value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div className="bg-slate-800 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
                        <Button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500">Cancelar</Button>
                        <Button type="submit" disabled={isUploading}>{isUploading ? 'Enviando...' : 'Confirmar'}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({ route, onClose, showToast }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const layerGroupRef = useRef<any>(null); // To hold markers
    const routingControlRef = useRef<any>(null);
    const [checkins, setCheckins] = useState<RotaCheckin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [checkinModalState, setCheckinModalState] = useState<{ponto: RotaPonto, mode: 'checkin' | 'skip'} | null>(null);

    useEffect(() => {
        const fetchCheckins = async () => {
            setIsLoading(true);
            const data = await api.getCheckinsForRota(route.id);
            setCheckins(data);
            setIsLoading(false);
        };
        fetchCheckins();
    }, [route.id]);

    // Initialize map once on mount
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current).setView([-8.057, -34.912], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            mapRef.current = map;
            setTimeout(() => map.invalidateSize(), 100);
        }

        // Cleanup map on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update map layers when route changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map || typeof L.Routing === 'undefined') return;

        // Clear previous route layers
        if (routingControlRef.current) {
            routingControlRef.current.remove();
            routingControlRef.current = null;
        }
        if (layerGroupRef.current) {
            layerGroupRef.current.clearLayers();
        } else {
            layerGroupRef.current = L.layerGroup().addTo(map);
        }

        const waypoints: any[] = [];
        route.pontos.forEach((ponto, index) => {
             if (ponto.latitude && ponto.longitude) {
                const latLng = L.latLng(ponto.latitude, ponto.longitude);
                waypoints.push(latLng);
                L.marker(latLng)
                    .bindPopup(`<b>Rota: ${route.nome}</b><br>${index + 1}: ${'protocolo' in ponto ? ponto.protocolo : ponto.nome}`)
                    .addTo(layerGroupRef.current);
             }
        });

        if (waypoints.length > 1) {
            const control = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                show: false,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                lineOptions: {
                    styles: [{ color: '#3b82f6', weight: 5, opacity: 0.7 }]
                },
                createMarker: () => null
            }).addTo(map);
            routingControlRef.current = control;
        } else if (waypoints.length === 1) {
            map.setView(waypoints[0], 15);
        } else {
            // Default view if no points
            map.setView([-8.057, -34.912], 12);
        }
        
    }, [route]);
    
    const handleOpenGoogleMaps = () => {
        const waypoints = route.pontos
            .map(p => `${p.latitude},${p.longitude}`)
            .join('/');
        window.open(`https://www.google.com/maps/dir/${waypoints}`, '_blank');
    };
    
    const handleCheckinSubmit = async (data: { observacao: string; fotos: File[] }) => {
        if (!checkinModalState) return;

        const rotaNome = route.nome;
        const ponto = checkinModalState.ponto;
        // FIX: Use 'in' operator for type guarding the discriminated union 'RotaPonto'.
        // This resolves the error where 'protocolo' was accessed on the 'CustomPonto' type.
        const pontoNome = 'protocolo' in ponto ? `Ocorrência ${ponto.protocolo}` : ponto.nome;

        await api.createRotaCheckin(
            {
                rotaId: route.id,
                pontoId: checkinModalState.ponto.id,
                pontoType: checkinModalState.ponto.pontoType,
                usuarioId: 2, // Mock fiscal ID
                status: checkinModalState.mode === 'checkin' ? 'feito' : 'não feito',
                observacao: data.observacao,
                dataCheckin: new Date().toISOString()
            },
            data.fotos,
            rotaNome,
            pontoNome
        );
        
        setCheckinModalState(null);
        showToast('Check-in realizado com sucesso!');
        
        // Refresh checkins from the source of truth
        const updatedCheckins = await api.getCheckinsForRota(route.id);
        setCheckins(updatedCheckins);
    };

    const getCheckinForPonto = (ponto: RotaPonto): RotaCheckin | null => {
        // This logic should be more sophisticated for recurring routes,
        // but for now, it finds the latest check-in for a point.
        return checkins.filter(c => c.pontoId === ponto.id)
                       .sort((a, b) => new Date(b.dataCheckin).getTime() - new Date(a.dataCheckin).getTime())[0] || null;
    };


    return (
     <>
        {lightboxImage && (
            <div
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70]"
              onClick={() => setLightboxImage(null)}
            >
              <div className="relative p-4">
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute -top-2 -right-2 m-4 text-white text-4xl leading-none"
                >
                  &times;
                </button>
                <img
                  src={lightboxImage}
                  alt="Visualização ampliada do check-in"
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                />
              </div>
            </div>
        )}
        <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-6xl max-h-full flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">{route.nome}</h2>
                        <p className="text-slate-400">Fiscal: {route.fiscalNome}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                </div>
                <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto min-h-0">
                    <div className="w-full lg:w-1/3 flex flex-col p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-700">
                        <Button onClick={handleOpenGoogleMaps} fullWidth>Navegar com Google Maps</Button>
                         <h3 className="font-semibold text-slate-200">Pontos de Visita</h3>
                         <div className="flex-grow bg-slate-900/50 p-2 rounded-md lg:overflow-y-auto">
                            {route.pontos.map((ponto, index) => {
                                const checkin = getCheckinForPonto(ponto);
                                const status = checkin ? checkin.status : 'pendente';
                                return (
                                <div key={ponto.id} className="p-3 border-b border-slate-700 last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center flex-wrap mb-1">
                                                <p className="text-slate-200 font-semibold mr-3">
                                                    {index + 1}. {'protocolo' in ponto ? `Ocorrência ${ponto.protocolo}` : ponto.nome}
                                                </p>
                                                {status === 'feito' && <span className="text-xs font-bold text-green-400 bg-green-900/50 px-2 py-1 rounded-full">CONCLUÍDO</span>}
                                                {status === 'não feito' && <span className="text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-1 rounded-full">PULADO</span>}
                                            </div>
                                            <p className="text-sm text-slate-400">
                                                {ponto.pontoType === 'ocorrencia' 
                                                    ? `${ponto.address.logradouro}, ${ponto.address.numero || 'S/N'}` 
                                                    : ponto.address.fullAddress
                                                }
                                            </p>
                                        </div>
                                        {ponto.estimatedArrivalTime && (
                                            <span className="text-xs font-mono text-cyan-300 bg-cyan-900/50 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">{ponto.estimatedArrivalTime}</span>
                                        )}
                                    </div>
                                    
                                    {checkin && checkin.anexoUrls && checkin.anexoUrls.length > 0 && (
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            {checkin.anexoUrls.map((url, i) => (
                                                <img
                                                    key={url + i}
                                                    src={url}
                                                    alt={`Foto do check-in para ${'nome' in ponto ? ponto.nome : ''} ${i + 1}`}
                                                    className="w-20 h-20 object-cover rounded-md border-2 border-slate-600 cursor-pointer hover:border-blue-500 transition-all"
                                                    onClick={() => setLightboxImage(url)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {status === 'pendente' && (
                                        <div className="mt-3 flex space-x-2">
                                            <Button className="flex-1 !py-2 !px-3 text-sm" onClick={() => setCheckinModalState({ponto, mode: 'checkin'})}>Check-in</Button>
                                            <Button className="flex-1 !py-2 !px-3 text-sm bg-amber-600 hover:bg-amber-700" onClick={() => setCheckinModalState({ponto, mode: 'skip'})}>Pular</Button>
                                        </div>
                                    )}
                                </div>
                            )})}
                         </div>
                    </div>
                    <div className="w-full lg:w-2/3 p-6 h-96 lg:h-auto flex-shrink-0">
                         <div ref={mapContainerRef} className="w-full h-full rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
        {checkinModalState && <CheckinModal ponto={checkinModalState.ponto} mode={checkinModalState.mode} onClose={() => setCheckinModalState(null)} onSubmit={handleCheckinSubmit} />}
    </>
    );
};

export default RouteDetailsModal;