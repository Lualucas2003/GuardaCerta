import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface VerticalBarChartProps {
    data: {
        labels: string[];
        datasets: any[];
    };
    percentages?: number[];
}

const VerticalBarChart: React.FC<VerticalBarChartProps> = ({ data, percentages }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        if (chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }
                const customPlugins = [];
                if (percentages) {
                    customPlugins.push({
                        id: 'customDatalabelsTop',
                        afterDatasetsDraw(chart: any) {
                            const { ctx, data, scales: { x, y } } = chart;
                            ctx.save();

                            const dataset = data.datasets[0];
                            const meta = chart.getDatasetMeta(0);

                            meta.data.forEach((element: any, index: number) => {
                                const value = dataset.data[index];
                                const percentage = percentages[index].toFixed(1);
                                const label = `${value} (${percentage}%)`;

                                ctx.font = 'bold 12px sans-serif';
                                ctx.fillStyle = '#374151';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';

                                const xPos = element.x;
                                const yPos = element.y - 5;

                                ctx.fillText(label, xPos, yPos);
                            });

                            ctx.restore();
                        }
                    });
                }
                
                chartInstance.current = new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    display: true,
                                    drawBorder: false,
                                    color: '#e5e7eb'
                                },
                                ticks: {
                                    // Allow chart.js to determine step size automatically unless it's the status chart
                                    stepSize: data.labels.length === 3 ? 7 : undefined,
                                    color: '#4b5563',
                                }
                            },
                            x: {
                                grid: {
                                    display: false,
                                    drawBorder: false,
                                },
                                ticks: {
                                    color: '#4b5563',
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                             tooltip: {
                                enabled: true
                            },
                        }
                    },
                    plugins: customPlugins
                });
            }
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, percentages]);

    return <div style={{ height: '350px' }}><canvas ref={chartRef} /></div>;
};

export default VerticalBarChart;