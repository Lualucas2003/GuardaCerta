import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface HorizontalBarChartProps {
    data: {
        labels: string[];
        datasets: any[];
    };
    percentages?: number[];
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, percentages }) => {
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
                    type: 'bar',
                    data: data,
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: {
                                    display: true,
                                    drawBorder: false,
                                    color: '#e5e7eb'
                                },
                                ticks: {
                                    display: false
                                }
                            },
                            y: {
                                grid: {
                                    display: false,
                                    drawBorder: false,
                                },
                                ticks: {
                                    color: '#4b5563',
                                    font: {
                                        size: 12
                                    },
                                     // Truncate labels
                                    callback: function(value: any, index: number, values: any) {
                                        const label = data.labels[index];
                                        if (label.length > 25) {
                                            return label.substring(0, 25) + '...';
                                        }
                                        return label;
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                enabled: false
                            },
                        }
                    },
                     // Register a custom plugin to draw the labels
                    plugins: [{
                        id: 'customDatalabels',
                        afterDatasetsDraw(chart: any) {
                            const { ctx, data, scales: { x, y } } = chart;
                            ctx.save();
                            
                            const dataset = data.datasets[0];
                            const meta = chart.getDatasetMeta(0);

                            meta.data.forEach((element: any, index: number) => {
                                const value = dataset.data[index];
                                let labelText = `${value}`;

                                if (percentages && percentages[index] !== undefined) {
                                    const percentage = percentages[index].toFixed(1);
                                    labelText = `${value} (${percentage}%)`;
                                }
                                
                                ctx.font = 'bold 12px sans-serif';
                                ctx.fillStyle = '#374151';
                                ctx.textAlign = 'left';
                                ctx.textBaseline = 'middle';
                                
                                const xPos = element.x + 8;
                                const yPos = element.y;
                                
                                ctx.fillText(labelText, xPos, yPos);
                            });

                            ctx.restore();
                        }
                    }]
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

export default HorizontalBarChart;