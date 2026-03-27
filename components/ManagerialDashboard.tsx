





import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Occurrence, Rota, User } from '../types';
import { api } from './api';
import SummaryCard from './dashboard/SummaryCard';
import HorizontalBarChart from './dashboard/HorizontalBarChart';
import VerticalBarChart from './dashboard/VerticalBarChart';
import LineChart from './dashboard/LineChart';
import MapChart from './dashboard/MapChart';
import OccurrencesTable from './dashboard/OccurrencesTable';
import TotalOccurrencesIcon from './icons/dashboard/TotalOccurrencesIcon';
import CompletedOccurrencesIcon from './icons/dashboard/CompletedOccurrencesIcon';
import InProgressOccurrencesIcon from './icons/dashboard/InProgressOccurrencesIcon';
import ActionsInProgressIcon from './icons/dashboard/ActionsInProgressIcon';
import ActiveRoutesIcon from './icons/dashboard/ActiveRoutesIcon';
import MappedAreaIcon from './icons/dashboard/MappedAreaIcon';
import RecoveredAreaIcon from './icons/dashboard/RecoveredAreaIcon';
import CalendarIcon from './icons/CalendarIcon';
import Button from './common/Button';
import DocumentDownloadIcon from './icons/DocumentDownloadIcon';
import ReportPage from './ReportPage';

declare const flatpickr: any;

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

const ManagerialDashboard: React.FC = () => {
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    const [allOccurrences, setAllOccurrences] = useState<Occurrence[]>([]);
    const [allRoutes, setAllRoutes] = useState<Rota[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<Occurrence[] | null>(null);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [occurrencesData, routesData] = await Promise.all([
                    api.getAllOccurrences(),
                    api.getRotas({} as User)
                ]);
                
                setAllOccurrences(occurrencesData);
                setAllRoutes(routesData);

                if (occurrencesData.length > 0) {
                    const dates = occurrencesData.map(o => new Date(o.timestamp));
                    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                    setStartDate(minDate);
                    setEndDate(maxDate);
                } else {
                    const today = new Date();
                    const monthAgo = new Date();
                    monthAgo.setMonth(today.getMonth() - 1);
                    setStartDate(monthAgo);
                    setEndDate(today);
                }

            } catch (err) {
                setError("Falha ao carregar dados do dashboard.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (loading) return; // Wait for data to load before initializing pickers

        let fpStart: any = null;
        let fpEnd: any = null;
        if (typeof flatpickr !== 'undefined' && startDateRef.current && endDateRef.current) {
            fpStart = flatpickr(startDateRef.current, {
                dateFormat: "d/m/Y",
                defaultDate: startDate,
                onChange: (selectedDates: Date[]) => setStartDate(selectedDates[0] || null),
            });
            fpEnd = flatpickr(endDateRef.current, {
                dateFormat: "d/m/Y",
                defaultDate: endDate,
                minDate: startDate,
                onChange: (selectedDates: Date[]) => setEndDate(selectedDates[0] || null),
            });
             if(fpStart && fpEnd) {
                 fpStart.set('onChange', (selectedDates: Date[]) => {
                     setStartDate(selectedDates[0] || null);
                     fpEnd.set('minDate', selectedDates[0]);
                 });
             }
        }
        return () => {
            fpStart?.destroy();
            fpEnd?.destroy();
        };
    }, [loading, startDate, endDate]);

    const filteredOccurrences = useMemo(() => {
        if (!startDate || !endDate) return allOccurrences;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return allOccurrences.filter(occ => {
            const occDate = new Date(occ.timestamp);
            return occDate >= start && occDate <= end;
        });
    }, [allOccurrences, startDate, endDate]);

    const handleGenerateReport = () => {
        if (filteredOccurrences.length === 0) {
            alert('Nenhuma ocorrência para gerar relatório com os filtros atuais.');
            return;
        }
        setReportData(filteredOccurrences);
    };

    const summaryData = useMemo(() => {
        const total = filteredOccurrences.length;
        const concluidas = filteredOccurrences.filter(o => o.status === 'Concluído').length;
        const emAndamento = filteredOccurrences.filter(o => o.status === 'Em Andamento').length;
        const acoesEmAndamento = filteredOccurrences.reduce((acc, o) => acc + (o.actionsCount || 0), 0);
        const rotasAtivas = allRoutes.filter(r => r.status === 'Ativo').length;
        
        let totalRouteLength = 0;
        allRoutes.filter(r => r.status === 'Ativo').forEach(route => {
            for (let i = 1; i < route.pontos.length; i++) {
                const p1 = route.pontos[i - 1];
                const p2 = route.pontos[i];
                if (p1.latitude && p1.longitude && p2.latitude && p2.longitude) {
                    totalRouteLength += getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
                }
            }
        });
        const extensaoRotas = (totalRouteLength / 1000).toFixed(2);

        return {
            total,
            concluidas,
            emAndamento,
            acoesEmAndamento,
            rotasAtivas,
            extensaoRotas,
            areaRecuperada: '0'
        };
    }, [filteredOccurrences, allRoutes]);

    const chartData = useMemo(() => {
        if (filteredOccurrences.length === 0) {
             // Return empty state for all charts to prevent errors
            const emptyChart = { labels: [], datasets: [{ data: [] }] };
            return {
                irregularityData: emptyChart, irregularityPercentages: [],
                statusData: emptyChart, statusPercentages: [],
                timeSeriesData: emptyChart,
                priorityData: emptyChart,
                neighborhoodData: emptyChart, neighborhoodPercentages: [],
            };
        }
        
        const total = filteredOccurrences.length;

        // Irregularity Data
        const byType = filteredOccurrences.reduce((acc, occ) => { acc[occ.type] = (acc[occ.type] || 0) + 1; return acc; }, {} as Record<string, number>);
        // FIX: Destructure the array item in the sort callback to ensure TypeScript correctly infers `a` and `b` as numbers.
        const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 7);
        const irregularityData = { labels: sortedTypes.map(item => item[0]), datasets: [{ data: sortedTypes.map(item => item[1]), backgroundColor: ['#1e3a8a', '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'], borderRadius: 6, barThickness: 20 }] };
        // FIX: Destructure the array item in the map callback to ensure TypeScript correctly infers `count` as a number, resolving the arithmetic operation error.
        const irregularityPercentages = sortedTypes.map(([, count]) => (count / total) * 100);
        
        // Status Data
        const byStatus = filteredOccurrences.reduce((acc, occ) => { acc[occ.status] = (acc[occ.status] || 0) + 1; return acc; }, {} as Record<string, number>);
        const statusData = { labels: Object.keys(byStatus), datasets: [{ data: Object.values(byStatus), backgroundColor: ['#1d4ed8', '#3b82f6', '#60a5fa'], borderRadius: 6, barThickness: 50 }] };
        // FIX: Added explicit type annotation to `count` to resolve potential type inference issues.
        const statusPercentages = Object.values(byStatus).map((count: number) => (count / total) * 100);

        // Time Series Data
        const byDate = filteredOccurrences.reduce((acc, occ) => { const date = new Date(occ.timestamp).toLocaleDateString('pt-BR'); acc[date] = (acc[date] || 0) + 1; return acc; }, {} as Record<string, number>);
        // FIX: Replaced unreliable date string parsing with an explicit Date object constructor for robust sorting.
        const sortedDates = Object.entries(byDate).sort((a, b) => {
            const datePartsA = a[0].split('/');
            const datePartsB = b[0].split('/');
            if (datePartsA.length < 3 || datePartsB.length < 3) return 0;
            const dateA = new Date(Number(datePartsA[2]), Number(datePartsA[1]) - 1, Number(datePartsA[0]));
            const dateB = new Date(Number(datePartsB[2]), Number(datePartsB[1]) - 1, Number(datePartsB[0]));
            return dateA.getTime() - dateB.getTime();
        });
        const timeSeriesData = { labels: sortedDates.map(item => item[0].substring(0, 5)), datasets: [{ label: 'Novas Ocorrências', data: sortedDates.map(item => item[1]), fill: false, borderColor: '#1e3a8a', tension: 0.4, pointBackgroundColor: '#1e3a8a', pointRadius: 5 }] };
        
        // Priority Data
        const priorityMap: Record<number, string> = { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Urgente' };
        const byPriority = filteredOccurrences.reduce((acc, occ) => { const label = priorityMap[occ.priority] || `P${occ.priority}`; acc[label] = (acc[label] || 0) + 1; return acc; }, {} as Record<string, number>);
        const priorityData = { labels: Object.keys(byPriority), datasets: [{ data: Object.values(byPriority), backgroundColor: ['#60a5fa', '#3b82f6', '#f59e0b', '#dc2626'], borderRadius: 6, barThickness: 50 }] };

        // Neighborhood Data
        const byBairro = filteredOccurrences.reduce((acc, occ) => { const bairro = occ.address.bairro || 'Não informado'; acc[bairro] = (acc[bairro] || 0) + 1; return acc; }, {} as Record<string, number>);
        // FIX: Destructure the array item in the sort callback to ensure TypeScript correctly infers `a` and `b` as numbers.
        const sortedBairros = Object.entries(byBairro).sort(([, a], [, b]) => b - a).slice(0, 4);
        const neighborhoodData = { labels: sortedBairros.map(item => item[0]), datasets: [{ data: sortedBairros.map(item => item[1]), backgroundColor: ['#1d4ed8', '#3b82f6', '#f59e0b', '#dc2626'], borderRadius: 6, barThickness: 20 }] };
        // FIX: Destructure the array item in the map callback to ensure TypeScript correctly infers `count` as a number, resolving the arithmetic operation error.
        const neighborhoodPercentages = sortedBairros.map(([, count]) => (count / total) * 100);

        return { irregularityData, irregularityPercentages, statusData, statusPercentages, timeSeriesData, priorityData, neighborhoodData, neighborhoodPercentages };
    }, [filteredOccurrences]);
    
    const summaryCards = [
        { icon: <TotalOccurrencesIcon />, title: 'Total de Ocorrências', value: String(summaryData.total) },
        { icon: <CompletedOccurrencesIcon />, title: 'Ocorrências Concluídas', value: String(summaryData.concluidas) },
        { icon: <InProgressOccurrencesIcon />, title: 'Ocorrências em Andamento', value: String(summaryData.emAndamento) },
        { icon: <ActionsInProgressIcon />, title: 'Ações em Andamento', value: String(summaryData.acoesEmAndamento) },
        { icon: <ActiveRoutesIcon />, title: 'Rotas Ativas', value: String(summaryData.rotasAtivas) },
        { icon: <MappedAreaIcon />, title: 'Extensão de Rotas (km)', value: summaryData.extensaoRotas.replace('.', ',') },
        { icon: <RecoveredAreaIcon />, title: 'Área Recuperada (m²)', value: summaryData.areaRecuperada },
    ];
    
    if (reportData) {
        return (
            <ReportPage
                occurrences={reportData}
                startDate={startDate}
                endDate={endDate}
                onBack={() => setReportData(null)}
            />
        );
    }

    if (loading) return <div className="text-center p-10"><p className="text-lg font-semibold text-gray-600">Carregando dados do dashboard...</p></div>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert"><p className="font-bold">Erro!</p><p>{error}</p></div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-800 flex-shrink-0">Dashboard Gerencial</h1>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                     <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">De:</span>
                        <input ref={startDateRef} className="bg-white border border-gray-300 rounded-md shadow-sm pl-8 pr-3 py-2 text-sm w-full md:w-auto focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="dd/mm/aaaa"/>
                         <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">Até:</span>
                        <input ref={endDateRef} className="bg-white border border-gray-300 rounded-md shadow-sm pl-9 pr-3 py-2 text-sm w-full md:w-auto focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="dd/mm/aaaa"/>
                        <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                     <select className="bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-auto">
                        <option>Todas as Unidades</option>
                    </select>
                    <Button onClick={handleGenerateReport} className="bg-slate-700 hover:bg-slate-600 !h-auto !py-2 !px-4 text-sm w-full md:w-auto flex items-center justify-center">
                        <DocumentDownloadIcon className="w-5 h-5 mr-2" />
                        Gerar Relatório
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                {summaryCards.slice(0, 4).map(item => (
                    <SummaryCard key={item.title} icon={item.icon} title={item.title} value={item.value} />
                ))}
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {summaryCards.slice(4).map(item => (
                    <SummaryCard key={item.title} icon={item.icon} title={item.title} value={item.value} />
                ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Ocorrências por Tipo de Irregularidade</h2>
                    <HorizontalBarChart data={chartData.irregularityData} percentages={chartData.irregularityPercentages} />
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Status das Ocorrências</h2>
                    <VerticalBarChart data={chartData.statusData} percentages={chartData.statusPercentages} />
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Ocorrências ao Longo do Tempo</h2>
                <LineChart data={chartData.timeSeriesData} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Ocorrências por Prioridade</h2>
                    <VerticalBarChart data={chartData.priorityData} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Ocorrências por Bairro</h2>
                    <HorizontalBarChart data={chartData.neighborhoodData} percentages={chartData.neighborhoodPercentages} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Mapa Geral de Ocorrências</h2>
                <MapChart occurrences={filteredOccurrences} />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <OccurrencesTable occurrences={filteredOccurrences} />
            </div>
        </div>
    );
};

export default ManagerialDashboard;