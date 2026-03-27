import React, { useEffect, useRef, useState } from 'react';
import { Occurrence } from '../../types';

declare const L: any;

interface MapChartProps {
    occurrences: Occurrence[];
}

const MapChart: React.FC<MapChartProps> = ({ occurrences }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const [activeLayer, setActiveLayer] = useState<'points' | 'heat'>('points');

    // 1. Initialize map on first render
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
            const initialCoords: [number, number] = [-8.057, -34.912]; // Centered on Recife
            const map = L.map(mapContainerRef.current).setView(initialCoords, 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            mapRef.current = map;
            
            // Ensures the map tiles render correctly if the container size was calculated late.
            setTimeout(() => map.invalidateSize(), 0); 
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // 2. Unified effect to manage creating and displaying map layers.
    // This runs whenever the data or the selected view mode changes.
    useEffect(() => {
        if (!mapRef.current || typeof L === 'undefined' || typeof L.heatLayer === 'undefined') {
            return;
        }
        const map = mapRef.current;

        // --- Create new layer objects from the current occurrences data ---
        const markers = occurrences
            .filter(occ => occ.latitude && occ.longitude)
            .map(occ => {
                const marker = L.marker([occ.latitude!, occ.longitude!]);
                marker.bindPopup(`<b>${occ.type}</b><br>${occ.address.logradouro}, ${occ.address.bairro}`);
                return marker;
            });
        const markerLayer = L.layerGroup(markers);

        const points = occurrences
            .filter(occ => occ.latitude && occ.longitude)
            .map(occ => [occ.latitude!, occ.longitude!, 1]); // Lat, Lng, Intensity
        
        const heatLayer = L.heatLayer(points, { 
            radius: 25,
            blur: 15,
            maxZoom: 18,
            gradient: {0.4: '#60a5fa', 0.65: '#2563eb', 1: '#1e3a8a'}
        });
        
        // Add the currently active layer to the map
        if (activeLayer === 'points') {
            map.addLayer(markerLayer);
        } else {
            map.addLayer(heatLayer);
        }

        // Return a cleanup function. This will be called before the effect runs again,
        // or when the component unmounts.
        return () => {
            if (map.hasLayer(markerLayer)) {
                map.removeLayer(markerLayer);
            }
            if (map.hasLayer(heatLayer)) {
                map.removeLayer(heatLayer);
            }
        };

    }, [occurrences, activeLayer]); // Re-run when data or view mode changes.


    const buttonBaseClasses = "px-4 py-2 text-sm font-semibold rounded-md transition-colors";
    const activeClasses = "bg-slate-800 text-white shadow";
    const inactiveClasses = "bg-white text-gray-700 hover:bg-gray-100 border";

    return (
        <div className="relative">
            <div className="absolute top-2 right-2 z-[1000] bg-white p-1 rounded-md shadow-md flex space-x-1">
                 <button 
                    onClick={() => setActiveLayer('points')}
                    className={`${buttonBaseClasses} ${activeLayer === 'points' ? activeClasses : inactiveClasses}`}
                >
                    Pontos
                </button>
                <button 
                    onClick={() => setActiveLayer('heat')}
                    className={`${buttonBaseClasses} ${activeLayer === 'heat' ? activeClasses : inactiveClasses}`}
                >
                    Mapa de Calor
                </button>
            </div>
            <div ref={mapContainerRef} className="w-full h-96 rounded-lg z-0" />
        </div>
    );
};

export default MapChart;
