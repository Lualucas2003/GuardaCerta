

import React, { useEffect, useRef } from 'react';
import { Rota } from '../types';

declare const L: any;

interface MapViewProps {
    routes: Rota[];
}

const MapView: React.FC<MapViewProps> = ({ routes }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const layersRef = useRef<any[]>([]); // To hold all markers, routes, etc.

    // Initialize map on first render
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
            const map = L.map(mapContainerRef.current, {
                center: [-8.063, -34.925],
                zoom: 13,
                zoomControl: false 
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            L.control.zoom({ position: 'topleft' }).addTo(map);

            // --- Create Legend ---
            const legend = L.control({ position: 'bottomright' });
            legend.onAdd = function () {
                const div = L.DomUtil.create('div', 'info legend');
                div.innerHTML = `
                    <h4 style="margin: 0 0 5px; font-weight: bold; color: #333;">Legenda</h4>
                    <div style="display: flex; align-items: center; margin-bottom: 2px;">
                        <i style="width: 18px; height: 3px; background: #1d4ed8; margin-right: 8px;"></i>
                        <span style="color: #333;">Rota Ativa</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <i style="width: 18px; height: 3px; background: #6b7280; margin-right: 8px;"></i>
                        <span style="color: #333;">Rota Desabilitada</span>
                    </div>
                `;
                return div;
            };
            legend.addTo(map);

            mapRef.current = map;
        }

        // Cleanup function to remove the map instance when the component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once.

    // Update routes on the map when `routes` prop changes
    useEffect(() => {
        if (!mapRef.current || typeof L.Routing === 'undefined') {
            return;
        }

        const map = mapRef.current;

        // Clear previous route layers and controls from the map
        layersRef.current.forEach(item => {
            // .remove() is a polymorphic method that works on both layers and controls
            item.remove();
        });
        layersRef.current = [];
        
        // --- Draw Markers and Routes ---
        routes.forEach(route => {
            const waypoints = route.pontos
                .filter(p => p.latitude && p.longitude)
                .map(p => L.latLng(p.latitude, p.longitude));

            // Add markers for each point in the route
            waypoints.forEach((wp, index) => {
                const ponto = route.pontos.find(p => p.latitude === wp.lat && p.longitude === wp.lng);
                if (ponto) {
                    const marker = L.marker(wp).addTo(map)
                        .bindPopup(`<b>Rota: ${route.nome}</b><br>${index + 1}: ${'protocolo' in ponto ? ponto.protocolo : ponto.nome}`);
                    layersRef.current.push(marker);
                }
            });
            
            if (waypoints.length > 1) {
                const control = L.Routing.control({
                    waypoints: waypoints,
                    routeWhileDragging: false,
                    show: false, // Hides the itinerary panel
                    addWaypoints: false, // Prevents adding waypoints by clicking
                    draggableWaypoints: false, // Waypoints can't be dragged
                    fitSelectedRoutes: false, // We'll manage zoom ourselves
                    lineOptions: {
                        styles: [{
                            color: route.status !== 'Desabilitado' ? '#1d4ed8' : '#6b7280',
                            weight: 5,
                            opacity: 0.8
                        }]
                    },
                    // Hide default start/end markers since we are adding our own
                    createMarker: () => null
                }).addTo(map);
                
                // Add the control itself to the layers array to be removed later
                layersRef.current.push(control);
            }
        });

        // Fit map to show all points
        const allWaypoints = routes.flatMap(route => route.pontos.filter(p => p.latitude && p.longitude).map(p => L.latLng(p.latitude, p.longitude)));
        if (allWaypoints.length > 0) {
            map.fitBounds(L.latLngBounds(allWaypoints), { padding: [50, 50] });
        }
        
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 500);

    }, [routes]);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
             <h3 className="text-xl font-bold text-gray-800 mb-4">Mapa de Rotas</h3>
            <div ref={mapContainerRef} className="w-full h-[400px] md:h-[60vh] rounded-lg bg-gray-100 border border-gray-300" />
            <style>{`
                .leaflet-container {
                    font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif;
                }
                .legend {
                    padding: 6px 10px;
                    background: white;
                    background: rgba(255, 255, 255, 0.9);
                    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
                    border-radius: 5px;
                    line-height: 18px;
                }
                /* Hide the default routing error box which can be intrusive */
                .leaflet-routing-error {
                    display: none !important;
                }
            `}</style>
        </div>
    );
};

export default MapView;