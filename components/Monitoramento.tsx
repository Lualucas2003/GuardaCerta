
















import React, { useEffect, useRef, useState, useMemo } from 'react';
import { api } from './api';
import { User, Occurrence, Rota, RotaPonto, RotaCheckin } from '../types';
import UserIcon from './icons/UserIcon';
import FileTextIcon from './icons/FileTextIcon';
import RouteIcon from './icons/RouteIcon';
import ActionsInProgressIcon from './icons/dashboard/ActionsInProgressIcon';
import TotalOccurrencesIcon from './icons/dashboard/TotalOccurrencesIcon';
import MappedAreaIcon from './icons/dashboard/MappedAreaIcon';
import CompletedOccurrencesIcon from './icons/dashboard/CompletedOccurrencesIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';


declare const L: any;

interface UserLocation {
    usuario_id: number;
    latitude: number;
    longitude: number;
    ultimo_update: string;
    bt_apoio_status: number;
    nome?: string;
}

// Helper function for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

const isRouteScheduledOnDate = (route: Rota, date: Date): boolean => {
    if (route.status === 'Desabilitado') return false;
    
    const startDate = new Date(route.dataPrevista);
    startDate.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate < startDate) return false;
    
    switch (route.periodicidade) {
        case 'Nenhuma':
            return compareDate.toDateString() === startDate.toDateString();
        case 'Diário':
            return true;
        case 'Semanal': {
            const routeDay = startDate.getDay();
            return compareDate.getDay() === routeDay;
        }
        case 'Mensal': {
            const routeDate = startDate.getDate();
            return compareDate.getDate() === routeDate;
        }
        default:
            return false;
    }
}


const Monitoramento: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const layersRef = useRef<any>({
        users: null,
        occurrences: null,
        routes: null,
        userPath: null
    });
    const pollingRef = useRef<number | null>(null);

    // Data states
    const [rawLocationHistory, setRawLocationHistory] = useState<UserLocation[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [routes, setRoutes] = useState<Rota[]>([]);
    const [checkins, setCheckins] = useState<RotaCheckin[]>([]);
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<'all' | number>('all');
    const [pathUserId, setPathUserId] = useState<number | null>(null);
    const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);

    const [visibleLayers, setVisibleLayers] = useState({
        users: true,
        occurrences: true,
        routes: true,
    });

    // Initialize map and layer groups when the container is ready
    useEffect(() => {
        // Run this effect only when loading is complete and the map container is available
        if (!loading && mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
            const map = L.map(mapContainerRef.current, {
                center: [-8.05428, -34.8813],
                zoom: 13,
                zoomControl: true 
            });

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri'
            }).addTo(map);

            mapRef.current = map;
            layersRef.current.users = L.layerGroup().addTo(map);
            layersRef.current.occurrences = L.layerGroup().addTo(map);
            layersRef.current.routes = L.layerGroup().addTo(map);
            layersRef.current.userPath = L.layerGroup().addTo(map);
            
            // This is crucial for rendering map tiles correctly when the map container's size is determined by its content or parent layout after initial render.
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                }
            }, 500);
        }

        // Cleanup function to remove the map instance on component unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        }
    }, [loading]); // Dependency on `loading` ensures map initializes after data is loaded and container is rendered

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openMenuUserId !== null && !(event.target as HTMLElement).closest(`[data-menu-id="${openMenuUserId}"]`)) {
                setOpenMenuUserId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [openMenuUserId]);

    // Fetch and poll for all data
    useEffect(() => {
        const fetchData = async () => {
            if (loading) { // Only fetch everything on initial load
                setError(null);
                try {
                    const dummyUser: User = { id: 0, nome: '', cpf: '', matricula: '', email: '', celular: '', perfil: '', unidade: '', perfilId: 0, unidadeId: 0 };
                    const [locationsResponse, usersResponse, occurrencesResponse, routesResponse, checkinsResponse] = await Promise.all([
                        fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/c89b536d-49fd-4895-89d5-ff722579f271'),
                        api.getAllUsers(),
                        fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getocorrencia'),
                        api.getRotas(dummyUser),
                        api.getAllCheckins()
                    ]);

                    if (!locationsResponse.ok) {
                        throw new Error(`Falha ao buscar dados de localização: ${locationsResponse.status} ${locationsResponse.statusText}`);
                    }
                    if (!occurrencesResponse.ok) {
                        throw new Error(`Falha ao buscar dados de ocorrências: ${occurrencesResponse.status} ${occurrencesResponse.statusText}`);
                    }
                    
                    const rawLocations = await locationsResponse.json();
                    const parsedLocations: UserLocation[] = (Array.isArray(rawLocations) ? rawLocations : []).map((loc: any): UserLocation => ({
                        usuario_id: Number(loc.usuario_id),
                        latitude: parseFloat(String(loc.latitude)),
                        longitude: parseFloat(String(loc.longitude)),
                        ultimo_update: String(loc.ultimo_update),
                        bt_apoio_status: Number(loc.bt_apoio_status) || 0,
                    }));
                    setRawLocationHistory(parsedLocations);
                    setUsers(usersResponse);

                    const rawOccurrences = await occurrencesResponse.json();
                    const parseTimestamp = (dateString: string): string => {
                      const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4}|\d{2}) (\d{2}):(\d{2})/);
                      if (!parts) return new Date().toISOString();
                      let year = parseInt(parts[3]);
                      if (year < 100) year += 2000;
                      return new Date(year, parseInt(parts[2]) - 1, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5])).toISOString();
                    };
                    const mappedOccurrences = (Array.isArray(rawOccurrences) ? rawOccurrences : [rawOccurrences]).map((item: any, index: number): Occurrence => ({
                        id: parseInt(item.id_ocorrencia?.replace('NVM', '') || '0', 10) || index,
                        protocolo: String(item.id_ocorrencia || `GC${index}`),
                        responsavel: String(item.responsavel || 'N/A'), type: item.tp_ocorrencia, description: item.descricao,
                        timestamp: parseTimestamp(item.data_horario),
                        address: { cep: String(item.cep), logradouro: item.logradouro, numero: String(item.numero), bairro: item.bairro, cidade: item.cidade, estado: item.estado },
                        latitude: parseFloat(item.latitude), longitude: parseFloat(item.longitude), status: 'A Iniciar', priority: 3, da: 'N/A', acoesExecutadas: 'Nenhuma', actionsCount: 0,
                    }));
                    setOccurrences(mappedOccurrences);
                    setRoutes(routesResponse);
                    setCheckins(checkinsResponse);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            } else { // Just poll for locations after initial load
                 try {
                     const locationsResponse = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/c89b536d-49fd-4895-89d5-ff722579f271');
                     if(locationsResponse.ok) {
                        const rawLocations = await locationsResponse.json();
                        const parsedLocations: UserLocation[] = (Array.isArray(rawLocations) ? rawLocations : []).map((loc: any): UserLocation => ({
                            usuario_id: Number(loc.usuario_id),
                            latitude: parseFloat(String(loc.latitude)),
                            longitude: parseFloat(String(loc.longitude)),
                            ultimo_update: String(loc.ultimo_update),
                            bt_apoio_status: Number(loc.bt_apoio_status) || 0,
                        }));
                        setRawLocationHistory(parsedLocations);
                     }
                 } catch (err: any) {
                     const errorMessage = err instanceof Error ? err.message : String(err);
                     if (errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('load failed')) {
                         console.warn("Network issue: Polling for locations failed. Will retry.");
                     } else {
                         console.error("Polling for locations failed:", err);
                     }
                 }
            }
        };

        fetchData();
        pollingRef.current = window.setInterval(fetchData, 15000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [loading]);

    const allLocations = useMemo<(UserLocation & { nome: string; })[]>(() => {
        const latestLocations = new Map<number, UserLocation>();
        rawLocationHistory.forEach(loc => {
            const existing = latestLocations.get(loc.usuario_id);
            if (!existing || new Date(loc.ultimo_update) > new Date(existing.ultimo_update)) {
                latestLocations.set(loc.usuario_id, loc);
            }
        });

        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const onlineUsers = Array.from(latestLocations.values()).filter(loc => {
            const lastUpdate = new Date(loc.ultimo_update);
            return !isNaN(lastUpdate.getTime()) && lastUpdate >= fifteenMinutesAgo;
        });

        const usersMap = new Map(users.map(u => [u.id, u]));
        return onlineUsers.map(loc => ({
            ...loc,
            nome: usersMap.get(loc.usuario_id)?.nome || `Guarda ${loc.usuario_id}`
        }));
    }, [rawLocationHistory, users]);
    
    const pathForDisplay = useMemo<(UserLocation & { nome: string; })[]>(() => {
        if (pathUserId === null || !rawLocationHistory || !users) return [];
        const usersMap = new Map(users.map(u => [u.id, u]));
        const userName = usersMap.get(pathUserId)?.nome || `Guarda ${pathUserId}`;

        return rawLocationHistory
            .filter(loc => loc.usuario_id === pathUserId)
            .sort((a, b) => new Date(a.ultimo_update).getTime() - new Date(b.ultimo_update).getTime())
            .map(loc => ({
                ...loc,
                nome: userName,
            }));
    }, [rawLocationHistory, pathUserId, users]);

    // Update map markers and paths
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;
        const allVisiblePoints: any[] = [];

        Object.keys(layersRef.current).forEach(key => layersRef.current[key]?.clearLayers());
        
        const createCustomIcon = (color: string, isUserIcon: boolean = false, isPulsing: boolean = false) => {
            const innerIcon = isUserIcon 
                ? `<path d="M16 8 L9 11 V 17 C9 20.86 12.14 24.42 16 25.5 C19.86 24.42 23 20.86 23 17 V 11 Z" fill="#fff"/>`
                : `<circle cx="16" cy="16" r="7" fill="#fff"/>`;
            
            const pulsingEffect = isPulsing ? `<div class="pulsing-dot" style="background-color: ${color};"></div>` : '';

            const iconSvg = `
                <div class="marker-container">
                    ${pulsingEffect}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
                        <path fill="${color}" stroke="#fff" stroke-width="2" d="M16 0C7.163 0 0 7.163 0 16c0 1.984.357 3.883 1.01 5.637L16 44l14.99-22.363A16.005 16.005 0 0 0 32 16C32 7.163 24.837 0 16 0z"/>
                        ${innerIcon}
                    </svg>
                </div>`;
            return L.divIcon({ html: iconSvg, className: 'custom-map-marker', iconSize: [32, 44], iconAnchor: [16, 44], popupAnchor: [0, -44] });
        };
        
        if (selectedUserId !== 'all') { // FOCUSED VIEW
            const selectedUserLoc = allLocations.find(loc => loc.usuario_id === selectedUserId);
            
            if (selectedUserLoc) {
                const isSupportActive = selectedUserLoc.bt_apoio_status === 1;
                const color = isSupportActive ? '#f59e0b' : '#2563eb';
                const latLng: [number, number] = [selectedUserLoc.latitude, selectedUserLoc.longitude];
                const formattedTime = new Date(selectedUserLoc.ultimo_update).toLocaleTimeString('pt-BR');

                L.marker(latLng, { icon: createCustomIcon(color, true, isSupportActive) })
                    .bindPopup(`<b>Posição Atual</b><br>${selectedUserLoc.nome}<br>${new Date(selectedUserLoc.ultimo_update).toLocaleString('pt-BR')}`)
                    .bindTooltip(formattedTime, { permanent: true, direction: 'top', offset: [0, -44], className: 'location-timestamp-tooltip' })
                    .addTo(layersRef.current.users);
                allVisiblePoints.push(latLng);
            }

            if (pathUserId === selectedUserId && pathForDisplay.length > 0) {
                const latlngs = pathForDisplay.map(p => [p.latitude, p.longitude]);
                L.polyline(latlngs, { color: '#4f46e5', weight: 4, opacity: 0.8 }).addTo(layersRef.current.userPath);

                pathForDisplay.forEach((point, index) => {
                    const latLng = [point.latitude, point.longitude];
                    if (index === 0) {
                        L.marker(latLng, { icon: createCustomIcon('#10b981', false) })
                            .bindPopup(`<b>Início do Trajeto</b><br>${point.nome}<br>${new Date(point.ultimo_update).toLocaleString('pt-BR')}`)
                            .addTo(layersRef.current.userPath);
                    } else if (index < pathForDisplay.length - 1) {
                        L.circleMarker(latLng, { radius: 4, color: '#4f46e5', fillColor: '#fff', fillOpacity: 1, weight: 2 })
                            .bindPopup(`Ponto #${index + 1}<br>${new Date(point.ultimo_update).toLocaleString('pt-BR')}`)
                            .addTo(layersRef.current.userPath);
                    }
                    allVisiblePoints.push(latLng);
                });
            }

        } else { // GENERAL VIEW
            if (visibleLayers.users) {
                allLocations.forEach(loc => {
                    const isSupportActive = loc.bt_apoio_status === 1;
                    const color = isSupportActive ? '#f59e0b' : '#2563eb';
                    const latLng: [number, number] = [loc.latitude, loc.longitude];
                    const formattedTime = new Date(loc.ultimo_update).toLocaleTimeString('pt-BR');
                    
                    L.marker(latLng, { icon: createCustomIcon(color, true, isSupportActive) })
                        .bindPopup(`<b>${loc.nome}</b><br>Última atualização: ${new Date(loc.ultimo_update).toLocaleString('pt-BR')}`)
                        .bindTooltip(formattedTime, { permanent: true, direction: 'top', offset: [0, -44], className: 'location-timestamp-tooltip' })
                        .addTo(layersRef.current.users);
                    allVisiblePoints.push(latLng);
                });
            }
            if (visibleLayers.occurrences) {
                occurrences.forEach(occ => {
                     if (occ.latitude && occ.longitude) {
                        const latLng: [number, number] = [occ.latitude, occ.longitude];
                        L.marker(latLng, { icon: createCustomIcon('#ef4444') })
                            .bindPopup(`<b>Ocorrência: ${occ.protocolo}</b><br>${occ.type}<br>${occ.address.logradouro}`)
                            .addTo(layersRef.current.occurrences);
                        allVisiblePoints.push(latLng);
                     }
                });
            }
            if (visibleLayers.routes) {
                routes.forEach(route => {
                    route.pontos.forEach(ponto => {
                        if (ponto.latitude && ponto.longitude) {
                            const latLng: [number, number] = [ponto.latitude, ponto.longitude];
                            const pontoName = ponto.pontoType === 'custom' ? ponto.nome : ponto.protocolo;
                            L.marker(latLng, { icon: createCustomIcon('#10b981') })
                                .bindPopup(`<b>Ponto de Rota: ${pontoName}</b><br>Rota: ${route.nome}`)
                                .addTo(layersRef.current.routes);
                            allVisiblePoints.push(latLng);
                        }
                    });
                });
            }
        }
        
        if (allVisiblePoints.length > 1) {
            const bounds = L.latLngBounds(allVisiblePoints);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
        } else if (allVisiblePoints.length === 1) {
            map.setView(allVisiblePoints[0], 17);
        }

    }, [selectedUserId, pathUserId, pathForDisplay, allLocations, occurrences, routes, visibleLayers]);
    
    const handleLayerToggle = (layerName: keyof typeof visibleLayers) => {
        setVisibleLayers(prev => ({ ...prev, [layerName]: !prev[layerName] }));
    };

    const indicatorData = useMemo(() => {
        const guardsRequestingSupport = allLocations.filter(loc => loc.bt_apoio_status === 1);
        const activeRoutes = routes.filter(r => r.status === 'Ativo');

        return {
            guardsOnline: allLocations.length,
            occurrencesOnMap: occurrences.length,
            activeRoutesCount: activeRoutes.length,
            supportRequests: guardsRequestingSupport,
        };
    }, [allLocations, occurrences, routes]);

    const dailyStats = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const occurrencesToday = occurrences.filter(occ => new Date(occ.timestamp) >= todayStart).length;

        let totalDistance = 0;
        const userPaths: { [key: number]: UserLocation[] } = {};

        rawLocationHistory.forEach(loc => {
            if (new Date(loc.ultimo_update) >= todayStart) {
                if (!userPaths[loc.usuario_id]) {
                    userPaths[loc.usuario_id] = [];
                }
                userPaths[loc.usuario_id].push(loc);
            }
        });

        Object.values(userPaths).forEach(path => {
            path.sort((a, b) => new Date(a.ultimo_update).getTime() - new Date(b.ultimo_update).getTime());
            for (let i = 1; i < path.length; i++) {
                totalDistance += getDistance(path[i-1].latitude, path[i-1].longitude, path[i].latitude, path[i].longitude);
            }
        });
        
        const kmsTraveled = (totalDistance / 1000).toFixed(2);
        
        let totalPointsToday = 0;
        let completedPointsToday = 0;
        const today = new Date();

        const routesForToday = routes.filter(route => isRouteScheduledOnDate(route, today));
        
        routesForToday.forEach(route => {
            totalPointsToday += route.pontos.length;
        });

        const checkinsToday = checkins.filter(c => {
            const checkinDate = new Date(c.dataCheckin);
            return checkinDate >= todayStart;
        });

        routesForToday.forEach(route => {
            route.pontos.forEach(ponto => {
                const pontoIdentifier = 'protocolo' in ponto ? `Ocorrência ${ponto.protocolo}` : ponto.nome;
                const hasBeenCheckedIn = checkinsToday.some(c => 
                    c.rotaId === route.id &&
                    c.pontoNome === pontoIdentifier &&
                    c.status === 'feito'
                );
                if (hasBeenCheckedIn) {
                    completedPointsToday++;
                }
            });
        });

        const compliancePercentage = totalPointsToday > 0 ? (completedPointsToday / totalPointsToday) * 100 : 0;
        const routeCompliance = `${Math.round(compliancePercentage)}%`;


        return {
            kmsTraveled,
            occurrencesToday,
            routeCompliance,
        };
    }, [rawLocationHistory, occurrences, routes, checkins]);

    const totalActiveRoutesLength = useMemo(() => {
        let totalLength = 0;
        const activeRoutes = routes.filter(r => r.status === 'Ativo');

        activeRoutes.forEach(route => {
            for (let i = 1; i < route.pontos.length; i++) {
                const p1 = route.pontos[i - 1];
                const p2 = route.pontos[i];
                if (p1.latitude && p1.longitude && p2.latitude && p2.longitude) {
                    totalLength += getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
                }
            }
        });

        return (totalLength / 1000).toFixed(2);
    }, [routes]);


    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Monitoramento em Tempo Real</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card for Guards Online */}
                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-blue-100 rounded-full p-3">
                        <UserIcon className="h-6 w-6 text-blue-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Guardas Online</p>
                        <p className="text-2xl font-bold text-slate-900">{indicatorData.guardsOnline}</p>
                    </div>
                </div>

                {/* Card for Occurrences */}
                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-red-100 rounded-full p-3">
                        <FileTextIcon className="h-6 w-6 text-red-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Ocorrências no Mapa</p>
                        <p className="text-2xl font-bold text-slate-900">{indicatorData.occurrencesOnMap}</p>
                    </div>
                </div>

                {/* Card for Active Routes */}
                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-green-100 rounded-full p-3">
                        <RouteIcon className="h-6 w-6 text-green-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Rotas Ativas</p>
                        <p className="text-2xl font-bold text-slate-900">{indicatorData.activeRoutesCount}</p>
                    </div>
                </div>

                {/* Special Card for Support Requests */}
                <div className={`p-5 rounded-lg shadow-md border ${indicatorData.supportRequests.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-4">
                        <div className={`flex-shrink-0 rounded-full p-3 ${indicatorData.supportRequests.length > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            <ActionsInProgressIcon className={`h-6 w-6 ${indicatorData.supportRequests.length > 0 ? 'text-amber-600' : 'text-gray-800'}`} />
                        </div>
                        <div>
                            <p className={`text-sm ${indicatorData.supportRequests.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Apoio Solicitado</p>
                            <p className={`text-2xl font-bold ${indicatorData.supportRequests.length > 0 ? 'text-amber-800 animate-pulse' : 'text-slate-900'}`}>{indicatorData.supportRequests.length}</p>
                        </div>
                    </div>
                    {indicatorData.supportRequests.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-amber-200">
                            <ul className="text-xs text-amber-800 space-y-1">
                                {/* FIX: Added explicit type to 'req' to resolve property access error. */}
                                {indicatorData.supportRequests.map((req: { usuario_id: number; nome: string }) => (
                                    <li key={req.usuario_id} className="font-semibold">{req.nome}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Camadas Visíveis</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                   {Object.keys(visibleLayers).map(layerKey => (
                       <label key={layerKey} className="inline-flex items-center cursor-pointer">
                           <input
                               type="checkbox"
                               checked={visibleLayers[layerKey as keyof typeof visibleLayers]}
                               onChange={() => handleLayerToggle(layerKey as keyof typeof visibleLayers)}
                               className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                           />
                           <span className="ml-2 text-gray-700 capitalize">{layerKey === 'users' ? 'Guardas' : (layerKey === 'routes' ? 'Pontos de Rota' : 'Ocorrências')}</span>
                       </label>
                   ))}
                </div>
            </div>

            {loading && <p className="text-center text-gray-600">Carregando dados do mapa...</p>}
            {error && <p className="text-center text-red-600">Erro: {error}</p>}

            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white rounded-lg shadow-md border border-gray-200 h-[60vh] flex flex-col">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Guardas Online ({allLocations.length})</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <ul className="divide-y divide-gray-200">
                                <li
                                    onClick={() => {
                                        setSelectedUserId('all');
                                        setPathUserId(null);
                                        setOpenMenuUserId(null);
                                    }}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUserId === 'all' ? 'bg-blue-100 hover:bg-blue-100 font-bold text-blue-800' : ''}`}
                                >
                                    Mostrar Todos no Mapa
                                </li>
                                {/* FIX: Added explicit types to sort callback parameters to resolve property access error. */}
                                {[...allLocations].sort((a: { nome?: string }, b: { nome?: string }) => (a?.nome || '').localeCompare(b?.nome || '')).map(loc => (
                                    <li 
                                        key={loc.usuario_id}
                                        className={`px-4 py-3 transition-colors ${selectedUserId === loc.usuario_id ? 'bg-blue-100' : ''}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div
                                                className="flex items-center space-x-3 cursor-pointer flex-grow"
                                                onClick={() => {
                                                    setSelectedUserId(loc.usuario_id);
                                                    setPathUserId(null);
                                                    setOpenMenuUserId(null);
                                                }}
                                            >
                                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${loc.bt_apoio_status === 1 ? 'bg-amber-400' : 'bg-green-500'}`}></div>
                                                <span className="font-medium text-gray-800">{loc.nome}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 flex-shrink-0">
                                                <div className="text-xs text-gray-500 text-right">
                                                    <div>{new Date(loc.ultimo_update).toLocaleDateString('pt-BR')}</div>
                                                    <div className="font-semibold text-gray-600">{new Date(loc.ultimo_update).toLocaleTimeString('pt-BR')}</div>
                                                </div>
                                                <div className="relative" data-menu-id={loc.usuario_id}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuUserId(openMenuUserId === loc.usuario_id ? null : loc.usuario_id);
                                                        }}
                                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-200"
                                                    >
                                                        <DotsVerticalIcon className="w-5 h-5" />
                                                    </button>
                                                    {openMenuUserId === loc.usuario_id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUserId(loc.usuario_id);
                                                                    setPathUserId(loc.usuario_id);
                                                                    setOpenMenuUserId(null);
                                                                }}
                                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                            >
                                                                Visualizar Trajeto do Dia
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div ref={mapContainerRef} className="w-full h-[60vh] rounded-lg shadow-md border border-gray-200" />
                    </div>
                </div>
            )}
            
             <style>{`
                .custom-map-marker {
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                }
                .marker-container {
                    position: relative;
                    width: 32px;
                    height: 44px;
                }
                .marker-container svg {
                    position: absolute;
                    z-index: 1;
                }
                .pulsing-dot {
                    position: absolute;
                    top: 16px; /* center of the pin head */
                    left: 16px;
                    transform: translate(-50%, -50%);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    z-index: 0;
                    animation: pulse-animation 1.5s infinite;
                }
                @keyframes pulse-animation {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
                    70% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
                    100% { opacity: 0; }
                }
                .location-timestamp-tooltip {
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 11px;
                    font-weight: bold;
                    white-space: nowrap;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }
            `}</style>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-3">
                        <RouteIcon className="h-6 w-6 text-indigo-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">KMs Percorridos (Hoje)</p>
                        <p className="text-2xl font-bold text-slate-900">{dailyStats.kmsTraveled}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-rose-100 rounded-full p-3">
                        <TotalOccurrencesIcon className="h-6 w-6 text-rose-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Ocorrências (Hoje)</p>
                        <p className="text-2xl font-bold text-slate-900">{dailyStats.occurrencesToday}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-teal-100 rounded-full p-3">
                        <MappedAreaIcon className="h-6 w-6 text-teal-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Extensão de Rotas (km)</p>
                        <p className="text-2xl font-bold text-slate-900">{totalActiveRoutesLength}</p>
                    </div>
                </div>
                
                <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
                    <div className="flex-shrink-0 bg-lime-100 rounded-full p-3">
                        <CompletedOccurrencesIcon className="h-6 w-6 text-lime-800" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Cumprimento de Rotas</p>
                        <p className="text-2xl font-bold text-slate-900">{dailyStats.routeCompliance}</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Monitoramento;