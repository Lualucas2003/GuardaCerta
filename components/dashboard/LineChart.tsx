import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface LineChartProps {
    data: {
        labels: string[];
        datasets: any[];
    };
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        if (chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
                chartInstance.current = new Chart(ctx, {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 3,
                                    color: '#4b5563',
                                },
                                grid: {
                                    color: '#e5e7eb',
                                    borderDash: [5, 5],
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#4b5563',
                                },
                                grid: {
                                    display: false,
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    pointStyle: 'line',
                                    color: '#4b5563',
                                    font: {
                                        size: 14,
                                    }
                                }
                            },
                            tooltip: {
                                enabled: true,
                                mode: 'index',
                                intersect: false,
                                backgroundColor: '#fff',
                                titleColor: '#334155',
                                bodyColor: '#334155',
                                borderColor: '#e2e8f0',
                                borderWidth: 1,
                                padding: 10,
                                displayColors: false,
                                callbacks: {
                                    title: function(context) {
                                        return context[0].label;
                                    },
                                    label: function(context) {
                                        return `${context.dataset.label}: ${context.parsed.y}`;
                                    }
                                }
                            }
                        },
                        interaction: {
                            mode: 'nearest',
                            axis: 'x',
                            intersect: false
                        }
                    },
                });
            }
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    return <div style={{ height: '350px' }}><canvas ref={chartRef} /></div>;
};

export default LineChart;