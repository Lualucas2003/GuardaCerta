

import React, { useState, useMemo } from 'react';
import { Rota } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface CalendarViewProps {
    routes: Rota[];
    onRouteClick: (route: Rota) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ routes, onRouteClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    const isRouteScheduledOnDate = (route: Rota, date: Date): boolean => {
        if (route.status === 'Desabilitado') return false;
        
        const startDate = new Date(route.dataPrevista);
        startDate.setHours(0, 0, 0, 0);
        
        if (date < startDate) return false;
        
        switch (route.periodicidade) {
            case 'Nenhuma':
                return date.toDateString() === startDate.toDateString();
            case 'Diário':
                return true;
            case 'Semanal': {
                const routeDay = startDate.getDay(); // 0=Sun, 1=Mon...
                return date.getDay() === routeDay;
            }
            case 'Mensal': {
                const routeDate = startDate.getDate();
                return date.getDate() === routeDate;
            }
            default:
                return false;
        }
    }


    const { monthName, year, calendarGrid, scheduledRoutes } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
        const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grid: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
        
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            grid.push({ day, isCurrentMonth: false, date: new Date(year, month - 1, day) });
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        }
        
        const gridEndIndex = grid.length;
        const nextMonthPadding = 7 - (gridEndIndex % 7);
        if (nextMonthPadding < 7) {
            for (let i = 1; i <= nextMonthPadding; i++) {
                grid.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
            }
        }
        
        const scheduled = new Map<string, Rota[]>();
        grid.forEach(cell => {
            const dateKey = cell.date.toDateString();
            const routesForDay = routes.filter(r => isRouteScheduledOnDate(r, cell.date));
            if (routesForDay.length > 0) {
                 scheduled.set(dateKey, routesForDay);
            }
        });
        
        return { 
            monthName: capitalizedMonthName, 
            year: year, 
            calendarGrid: grid,
            scheduledRoutes: scheduled
        };
    }, [currentDate, routes]);

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100" aria-label="Mês anterior">
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <h3 className="text-xl font-bold text-gray-800">
                    {monthName} de {year}
                </h3>
                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100" aria-label="Próximo mês">
                    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-gray-500 mb-2">
                {weekdays.map(day => <div key={day} className="py-2">{day}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {calendarGrid.map((cell, index) => {
                    const routesForDay = scheduledRoutes.get(cell.date.toDateString());
                    const isCurrentDay = cell.isCurrentMonth && isToday(cell.date);

                    return (
                        <div key={index} className={`border border-gray-200 rounded-md p-1.5 h-40 flex flex-col ${cell.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}`}>
                            <span className={`font-semibold mb-1 self-start text-sm ${isCurrentDay ? 'bg-slate-800 text-white rounded-full h-6 w-6 flex items-center justify-center' : cell.isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>
                                {cell.day}
                            </span>
                            {routesForDay && routesForDay.length > 0 && (
                                <div className="space-y-1 overflow-y-auto text-xs pr-1">
                                    {routesForDay.map(route => (
                                        <button key={route.id} onClick={() => onRouteClick(route)} className="w-full text-left bg-blue-100 text-blue-900 p-1 rounded-sm truncate font-medium border-l-4 border-blue-500 hover:bg-blue-200">
                                            {route.nome}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;