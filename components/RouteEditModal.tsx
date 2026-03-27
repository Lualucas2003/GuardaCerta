

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rota, User, RotaPonto, CustomPonto, RotaStatus } from '../types';
import { api } from './api';
import Input from './common/Input';
import Select from './common/Select';
import Button from './common/Button';
import ArrowUpIcon from './icons/ArrowUpIcon';
import ArrowDownIcon from './icons/ArrowDownIcon';
import TrashIcon from './icons/TrashIcon';
import ThinChevronDownIcon from './icons/ThinChevronDownIcon';

declare const L: any;
declare const flatpickr: any;

interface RouteEditModalProps {
    onClose: () => void;
    onSave: () => void;
    routeToEdit?: Rota;
}

const RouteEditModal: React.FC<RouteEditModalProps> = ({ onClose, onSave, routeToEdit }) => {
    // Form State
    const [nome, setNome] = useState(routeToEdit?.nome || '');
    const [formaRota, setFormaRota] = useState('Carro');
    const [selectedFiscalIds, setSelectedFiscalIds] = useState<number[]>([]);
    const [dataPrevista, setDataPrevista] = useState(routeToEdit?.dataPrevista || '');
    const [periodicidade, setPeriodicidade] = useState<'Nenhuma' | 'Diário' | 'Semanal' | 'Mensal'>(routeToEdit?.periodicidade || 'Nenhuma');
    const [status, setStatus] = useState<RotaStatus>(routeToEdit?.status || 'Ativo');
    const [pontos, setPontos] = useState<RotaPonto[]>(routeToEdit?.pontos || []);

    // UI & Data State
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isFiscalDropdownOpen, setIsFiscalDropdownOpen] = useState(false);
    const [fiscalSearchTerm, setFiscalSearchTerm] = useState('');
    const [openSections, setOpenSections] = useState({ info: true, points: true, addPoint: true });

    // Custom Ponto State
    const [customPontoNome, setCustomPontoNome] = useState('');
    const [customPontoEndereco, setCustomPontoEndereco] = useState('');
    const [customPontoCoords, setCustomPontoCoords] = useState<{lat: number, lng: number} | null>(null);
    const [customPontoAddressDetails, setCustomPontoAddressDetails] = useState<Partial<CustomPonto['address']>>({});
    const customPontoMarkerRef = useRef<any>(null);


    const dateInputRef = useRef<HTMLInputElement>(null);
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const routingControlRef = useRef<any>(null);
    const fiscalDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch initial data for form dropdowns
    useEffect(() => {
        const loadData = async () => {
            const users = await api.getAllUsers();
            setAvailableUsers(users);

            if (routeToEdit) {
                const fiscalNames = (routeToEdit.fiscalNome || '').split(';').map(name => name.trim());
                const initialFiscalIds = users
                    .filter(user => fiscalNames.includes(user?.nome || ''))
                    .map(user => user.id);
                setSelectedFiscalIds(initialFiscalIds);
            }
        };
        loadData();
    }, [routeToEdit]);

    const handleGeocodeAddress = useCallback(async (query: string, showAlerts: boolean = false) => {
        if (!query) {
            if (showAlerts) alert('Por favor, insira um endereço para buscar.');
            return;
        }
        setIsGeocoding(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&accept-language=pt&addressdetails=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const { lat, lon, address, display_name } = data[0];
                setCustomPontoCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
                const addr = address || {};
                setCustomPontoAddressDetails({
                    logradouro: addr.road || '',
                    numero: addr.house_number || '',
                    bairro: addr.suburb || addr.neighbourhood || '',
                    cidade: addr.city || addr.town || '',
                    estado: addr.state || '',
                    pais: addr.country || '',
                    cep: addr.postcode || '',
                    fullAddress: display_name || query
                });
            } else {
                if (showAlerts) alert('Endereço não encontrado.');
            }
        } catch (error) {
            console.error("Erro de geocoding:", error);
            if (showAlerts) alert('Ocorreu um erro ao buscar o endereço.');
        } finally {
            setIsGeocoding(false);
        }
    }, []);

    // Debounced effect for automatic geocoding as user types
    useEffect(() => {
        const handler = setTimeout(() => {
            if (customPontoEndereco.trim().length > 5) { // Start searching after 5 characters
                handleGeocodeAddress(customPontoEndereco, false); // `false` to not show alerts on auto-search
            }
        }, 1000); // 1-second delay after user stops typing

        return () => {
            clearTimeout(handler);
        };
    }, [customPontoEndereco, handleGeocodeAddress]);


    const handleMapClick = useCallback(async (latlng: { lat: number, lng: number }) => {
        setCustomPontoCoords(latlng);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&accept-language=pt-BR`);
            const data = await response.json();
            if (data && data.display_name) {
                setCustomPontoEndereco(data.display_name);
                const addr = data.address || {};
                setCustomPontoAddressDetails({
                    logradouro: addr.road || '',
                    numero: addr.house_number || '',
                    bairro: addr.suburb || addr.neighbourhood || '',
                    cidade: addr.city || addr.town || '',
                    estado: addr.state || '',
                    pais: addr.country || '',
                    cep: addr.postcode || '',
                    fullAddress: data.display_name
                });
            }
        } catch (error) {
            console.error("Erro no reverse geocoding:", error);
        }
    }, []);


    // Initialize flatpickr
    useEffect(() => {
        let fp: any = null;
        if (dateInputRef.current) {
            fp = flatpickr(dateInputRef.current, {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                onChange: (selectedDates: Date[]) => {
                    if (selectedDates[0]) {
                        setDataPrevista(selectedDates[0].toISOString());
                    }
                }
            });
        }
        return () => fp?.destroy();
    }, []);
    
    // Initialize map
    useEffect(() => {
        const initMap = () => {
            if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
                try {
                    const map = L.map(mapContainerRef.current).setView([-8.057, -34.912], 12);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    
                    map.on('click', (e: any) => handleMapClick(e.latlng));

                    mapRef.current = map;
                    setTimeout(() => {
                        if (mapRef.current) {
                            mapRef.current.invalidateSize();
                        }
                    }, 500);
                } catch (error) {
                    console.error("Error initializing map in RouteEditModal:", error);
                }
            }
        };

        const timer = setTimeout(initMap, 200);
        return () => clearTimeout(timer);
    }, [handleMapClick]);
    
    // Close fiscal dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fiscalDropdownRef.current && !fiscalDropdownRef.current.contains(event.target as Node)) {
                setIsFiscalDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update map with route points whenever they change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !pontos || typeof L.Routing === 'undefined') return;
        
        // Clear previous layers
        if (routingControlRef.current) {
            routingControlRef.current.remove();
            routingControlRef.current = null;
        }
        map.eachLayer((layer: any) => {
             if (layer instanceof L.Marker) {
                // Keep the temporary marker for adding a new custom point
                if (layer !== customPontoMarkerRef.current) {
                    map.removeLayer(layer);
                }
            }
        });

        // FIX: The 'L' namespace is not available for types when using `declare const L: any;`.
        // Changed the type of 'waypoints' from 'L.LatLng[]' to 'any[]' to resolve the compilation error.
        const waypoints: any[] = [];
        pontos.forEach((ponto, index) => {
             if(ponto.latitude && ponto.longitude) {
                const latLng = L.latLng(ponto.latitude, ponto.longitude);
                waypoints.push(latLng);
                L.marker(latLng)
                    .addTo(map)
                    .bindPopup(`<b>Rota: ${nome || 'Nova Rota'}</b><br>${index + 1}: ${'protocolo' in ponto ? ponto.protocolo : ponto.nome}`);
             }
        });

        if (waypoints.length > 1) {
            const control = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                show: false,
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: !customPontoCoords,
                lineOptions: {
                    styles: [{ color: '#3b82f6', weight: 5, opacity: 0.7 }]
                },
                createMarker: () => null
            }).addTo(map);
            routingControlRef.current = control;
        } else if (waypoints.length === 1 && !customPontoCoords) {
            map.setView(waypoints[0], 15);
        }

    }, [pontos, customPontoCoords, nome]);

    // Update temporary marker for custom point
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Remove previous temporary marker if it exists
        if (customPontoMarkerRef.current) {
            map.removeLayer(customPontoMarkerRef.current);
        }

        if (customPontoCoords) {
            const tempMarker = L.marker([customPontoCoords.lat, customPontoCoords.lng], {
                draggable: true, // Make the marker draggable
                icon: L.divIcon({
                    className: 'blinking-marker',
                    html: '<div class="pin"></div><div class="pin-effect"></div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                })
            }).addTo(map);

            // When dragging ends, update coordinates and address
            tempMarker.on('dragend', (event: any) => {
                handleMapClick(event.target.getLatLng());
            });

            customPontoMarkerRef.current = tempMarker;
            
            const newLatLng = L.latLng(customPontoCoords.lat, customPontoCoords.lng);
            const currentCenter = map.getCenter();
            // Only zoom if the new point is far (>500m) from the current center.
            // This prevents zooming on local clicks while still zooming for address searches.
            if (currentCenter.distanceTo(newLatLng) > 500) {
                map.setView(newLatLng, 16);
            } else {
                map.panTo(newLatLng);
            }
        } else {
             customPontoMarkerRef.current = null;
        }
    }, [customPontoCoords, handleMapClick]);
    
    const handleAddCustomPonto = () => {
        if(!customPontoNome || !customPontoCoords || !customPontoAddressDetails.fullAddress) {
            alert("Preencha o nome e selecione uma localização no mapa.");
            return;
        }
        const newPonto: RotaPonto = {
            id: `custom_${Date.now()}`,
            nome: customPontoNome,
            address: {
                logradouro: customPontoAddressDetails.logradouro,
                numero: customPontoAddressDetails.numero,
                bairro: customPontoAddressDetails.bairro,
                cidade: customPontoAddressDetails.cidade,
                estado: customPontoAddressDetails.estado,
                pais: customPontoAddressDetails.pais,
                cep: customPontoAddressDetails.cep,
                fullAddress: customPontoAddressDetails.fullAddress
            },
            latitude: customPontoCoords.lat,
            longitude: customPontoCoords.lng,
            pontoType: 'custom'
        };
        setPontos(prev => [...prev, newPonto]);
        setCustomPontoNome('');
        setCustomPontoEndereco('');
        setCustomPontoCoords(null);
        setCustomPontoAddressDetails({});
    };

    const handlePointAction = (index: number, action: 'up' | 'down' | 'delete') => {
        setPontos(currentPontos => {
            const newPontos = [...currentPontos];
            if (action === 'delete') {
                newPontos.splice(index, 1);
            } else if (action === 'up' && index > 0) {
                [newPontos[index - 1], newPontos[index]] = [newPontos[index], newPontos[index - 1]];
            } else if (action === 'down' && index < newPontos.length - 1) {
                [newPontos[index], newPontos[index + 1]] = [newPontos[index + 1], newPontos[index]];
            }
            return newPontos;
        });
    };

    const handlePointTimeChange = (index: number, time: string) => {
        setPontos(currentPontos => {
            const newPontos = [...currentPontos];
            newPontos[index] = { ...newPontos[index], estimatedArrivalTime: time };
            return newPontos;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        let finalNome = nome;
        if (!routeToEdit) {
            finalNome = `${nome} - ${formaRota.toLowerCase()}`;
        }

        const rotaData = { nome: finalNome, fiscalIds: selectedFiscalIds, dataPrevista, periodicidade, pontos, status };
        try {
            if (routeToEdit) {
                await api.updateRota(routeToEdit.id, rotaData);
            } else {
                await api.createRota(rotaData);
            }
            onSave();
        } catch (error) {
            console.error("Failed to save route", error);
            alert(`Falha ao salvar a rota: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFiscalSelect = (userId: number) => {
        setSelectedFiscalIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };
    
    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const filteredAvailableUsers = availableUsers.filter(user =>
        (user?.nome || '').toLowerCase().includes(fiscalSearchTerm.toLowerCase())
    );

    const selectedFiscalNames = availableUsers
        .filter(user => selectedFiscalIds.includes(user.id))
        .map(user => user.nome)
        .join(', ');


    return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
        <style>{`
            .blinking-marker .pin {
                background: #3b82f6; /* Tailwind blue-500 */
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            .blinking-marker .pin-effect {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #3b82f6;
                animation: pulse 1.5s ease-out infinite;
                transform-origin: center;
                transform: translate(-50%, -50%) scale(1);
            }
            @keyframes pulse {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 0.7;
                }
                70% {
                    transform: translate(-50%, -50%) scale(3);
                    opacity: 0;
                }
                100% {
                    opacity: 0;
                }
            }
        `}</style>
      <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-6xl max-h-[calc(100vh-8rem)] flex flex-col">
        <div className="p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-100">{routeToEdit ? 'Editar Rota' : 'Criar Nova Rota'}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>
        </div>
        
        <div className="flex-grow flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
            {/* Left Panel: Form & Lists */}
            <form onSubmit={handleSubmit} className="w-full lg:w-1/2 flex flex-col p-6 space-y-4 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-700 order-2 lg:order-1">
                {/* Basic Info */}
                <div className="border border-slate-600 rounded-lg">
                    <button type="button" onClick={() => toggleSection('info')} className="w-full flex justify-between items-center p-4">
                        <h3 className="text-slate-300 font-semibold">Informações Básicas</h3>
                        <ThinChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${openSections.info ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.info && (
                        <div className="p-4 border-t border-slate-700 space-y-4">
                            <Input id="nome" label="Nome da Rota" type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                            {!routeToEdit && (
                                <Select 
                                    id="formaRota" 
                                    label="Forma de Rota" 
                                    value={formaRota} 
                                    onChange={e => setFormaRota(e.target.value)} 
                                    options={[
                                        { value: 'Carro', label: 'Carro' }, 
                                        { value: 'Caminhada', label: 'Caminhada' }, 
                                        { value: 'Moto', label: 'Moto' }, 
                                        { value: 'Barco', label: 'Barco' }
                                    ]}
                                />
                            )}
                            <div>
                                <label id="fiscal-label" className="block text-sm font-medium text-slate-300 mb-2">Fiscal Responsável</label>
                                <div className="relative" ref={fiscalDropdownRef}>
                                    <button type="button" onClick={() => setIsFiscalDropdownOpen(!isFiscalDropdownOpen)} className="w-full text-left px-4 py-2 border rounded-lg bg-slate-800 border-slate-600 text-slate-100 h-[42px] flex justify-between items-center" aria-haspopup="listbox" aria-labelledby="fiscal-label">
                                        <span className="truncate">{selectedFiscalNames || 'Selecione um ou mais fiscais'}</span>
                                        <ThinChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isFiscalDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isFiscalDropdownOpen && (
                                        <div className="absolute top-full mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                            <div className="p-2 sticky top-0 bg-slate-700"><Input id="fiscalSearch" label="" type="text" placeholder="Buscar fiscal..." value={fiscalSearchTerm} onChange={e => setFiscalSearchTerm(e.target.value)} /></div>
                                            <ul role="listbox">
                                                {filteredAvailableUsers.map(user => (
                                                    <li key={user.id} onClick={() => handleFiscalSelect(user.id)} className="px-4 py-2 text-slate-200 hover:bg-slate-600 cursor-pointer flex items-center" role="option" aria-selected={selectedFiscalIds.includes(user.id)}>
                                                        <input type="checkbox" checked={selectedFiscalIds.includes(user.id)} readOnly className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                        {user.nome}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Input ref={dateInputRef} id="dataPrevista" label="Data de Início" type="text" defaultValue={dataPrevista} placeholder="Selecione a data e hora" required />
                            <Select id="periodicidade" label="Periodicidade" value={periodicidade} onChange={e => setPeriodicidade(e.target.value as any)} options={[{ value: 'Nenhuma', label: 'Nenhuma' }, { value: 'Diário', label: 'Diário' }, { value: 'Semanal', label: 'Semanal' }, { value: 'Mensal', label: 'Mensal' }]}/>
                            <Select id="status" label="Status" value={status} onChange={e => setStatus(e.target.value as RotaStatus)} options={[{ value: 'Ativo', label: 'Ativo' }, { value: 'Desabilitado', label: 'Desabilitado' }]}/>
                        </div>
                    )}
                </div>

                {/* Points Management */}
                <div className="border border-slate-600 rounded-lg">
                    <button type="button" onClick={() => toggleSection('points')} className="w-full flex justify-between items-center p-4">
                        <h3 className="font-semibold text-slate-200">Pontos da Rota ({pontos.length})</h3>
                        <ThinChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${openSections.points ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.points && (
                        <div className="p-2 border-t border-slate-700">
                             <div className="bg-slate-900/50 p-2 rounded-md overflow-y-auto min-h-[150px] max-h-[300px]">
                                {pontos.length === 0 && <p className="text-slate-400 text-center py-4">Adicione pontos personalizados.</p>}
                                {pontos.map((ponto, index) => (
                                     <div key={ponto.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-700">
                                        <div className="flex-grow flex items-center justify-between">
                                            <span className="text-slate-200 truncate pr-2">{index + 1}. {ponto.pontoType === 'ocorrencia' ? `Ocorrência ${ponto.protocolo}` : ponto.nome}</span>
                                            <input type="time" value={ponto.estimatedArrivalTime || ''} onChange={(e) => handlePointTimeChange(index, e.target.value)} className="bg-slate-800 text-slate-200 border border-slate-600 rounded-md px-2 py-1 text-sm w-24 ml-2" title="Horário de chegada previsto" />
                                        </div>
                                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                            <button type="button" onClick={() => handlePointAction(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-30"><ArrowUpIcon className="w-4 h-4 text-slate-300" /></button>
                                            <button type="button" onClick={() => handlePointAction(index, 'down')} disabled={index === pontos.length - 1} className="p-1 disabled:opacity-30"><ArrowDownIcon className="w-4 h-4 text-slate-300" /></button>
                                            <button type="button" onClick={() => handlePointAction(index, 'delete')} className="p-1"><TrashIcon className="w-4 h-4 text-red-500" /></button>
                                        </div>
                                     </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
                
                 <div className="flex-shrink-0 flex justify-end space-x-4 pt-4">
                    <Button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700">Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar Rota'}</Button>
                </div>
            </form>

            {/* Right Panel: Map & Custom Ponto */}
            <div className="w-full lg:w-1/2 flex flex-col p-6 space-y-4 lg:overflow-y-auto order-1 lg:order-2">
                {/* Map Section */}
                <div className="border border-slate-600 rounded-lg overflow-hidden flex-shrink-0">
                    <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
                        <h3 className="text-sm font-semibold text-white">Localização no Mapa</h3>
                    </div>
                    <div className="h-[300px] lg:h-[400px] bg-slate-900 relative">
                        <div ref={mapContainerRef} className="w-full h-full" />
                        {typeof L === 'undefined' && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Carregando mapa...
                            </div>
                        )}
                    </div>
                </div>
                 <div className="border border-slate-600 rounded-lg">
                    <button type="button" onClick={() => toggleSection('addPoint')} className="w-full flex justify-between items-center p-4">
                        <h3 className="text-slate-300 font-semibold">Adicionar Ponto Personalizado</h3>
                        <ThinChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform ${openSections.addPoint ? 'rotate-180' : ''}`} />
                    </button>
                    {openSections.addPoint && (
                        <div className="p-4 border-t border-slate-700 space-y-4">
                            <p className="text-sm text-slate-400">Escreva um endereço e clique em buscar, ou clique no mapa para definir a localização de um novo ponto.</p>
                            <Input id="customPontoNome" label="Nome do Ponto" value={customPontoNome} onChange={e => setCustomPontoNome(e.target.value)} />
                            <div className="flex items-end space-x-2">
                                <div className="flex-grow"><Input id="customPontoEndereco" label="Endereço" value={customPontoEndereco} onChange={e => setCustomPontoEndereco(e.target.value)} placeholder="Digite um endereço..."/></div>
                                <Button type="button" onClick={() => handleGeocodeAddress(customPontoEndereco, true)} disabled={isGeocoding} className="h-[42px] !py-2 !px-4 whitespace-nowrap">{isGeocoding ? 'Buscando...' : 'Buscar'}</Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input id="customPontoLat" label="Latitude" value={customPontoCoords?.lat.toFixed(6) || ''} readOnly /><Input id="customPontoLng" label="Longitude" value={customPontoCoords?.lng.toFixed(6) || ''} readOnly /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input id="customPontoLogradouro" label="Logradouro" value={customPontoAddressDetails.logradouro || ''} readOnly /><Input id="customPontoNumero" label="Número" value={customPontoAddressDetails.numero || ''} readOnly /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input id="customPontoBairro" label="Bairro" value={customPontoAddressDetails.bairro || ''} readOnly /><Input id="customPontoCidade" label="Cidade" value={customPontoAddressDetails.cidade || ''} readOnly /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Input id="customPontoEstado" label="Estado" value={customPontoAddressDetails.estado || ''} readOnly /><Input id="customPontoPais" label="País" value={customPontoAddressDetails.pais || ''} readOnly /></div>
                            <Button type="button" fullWidth onClick={handleAddCustomPonto}>Adicionar Ponto à Rota</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
    );
};

export default RouteEditModal;