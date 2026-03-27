import React from 'react';

interface SummaryCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value }) => {
    return (
        <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center space-x-4">
            <div className="flex-shrink-0 bg-slate-100 rounded-full p-3">
                <div className="h-6 w-6 text-slate-800">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
};

export default SummaryCard;