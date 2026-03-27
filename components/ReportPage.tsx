

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Occurrence } from '../types';
import { GoogleGenAI } from '@google/genai';
import Button from './common/Button';
import PrinterIcon from './icons/PrinterIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import CalendarIcon from './icons/CalendarIcon';

interface ReportPageProps {
  occurrences: Occurrence[];
  startDate: Date | null;
  endDate: Date | null;
  onBack: () => void;
}

const ReportPage: React.FC<ReportPageProps> = ({ occurrences: allOccurrences, startDate, endDate, onBack }) => {
    const [summary, setSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(true);
    const [mediaMap, setMediaMap] = useState<Map<string, { images: string[] }>>(new Map());
    const [isLoadingMedia, setIsLoadingMedia] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    const [currentStartDate, setCurrentStartDate] = useState(startDate);
    const [currentEndDate, setCurrentEndDate] = useState(endDate);

    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let fpStart: any = null;
        let fpEnd: any = null;
        if (typeof window.flatpickr !== 'undefined' && startDateRef.current && endDateRef.current) {
            fpStart = window.flatpickr(startDateRef.current, {
                dateFormat: "d/m/Y",
                defaultDate: currentStartDate,
                onChange: (selectedDates: Date[]) => {
                    setCurrentStartDate(selectedDates[0] || null);
                    if (fpEnd) fpEnd.set('minDate', selectedDates[0]);
                },
            });
            fpEnd = window.flatpickr(endDateRef.current, {
                dateFormat: "d/m/Y",
                defaultDate: currentEndDate,
                minDate: currentStartDate,
                onChange: (selectedDates: Date[]) => setCurrentEndDate(selectedDates[0] || null),
            });
        }
        return () => {
            fpStart?.destroy();
            fpEnd?.destroy();
        };
    }, [currentStartDate, currentEndDate]);

    const filteredOccurrences = useMemo(() => {
        if (!currentStartDate || !currentEndDate) return allOccurrences;

        const start = new Date(currentStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(currentEndDate);
        end.setHours(23, 59, 59, 999);

        return allOccurrences.filter(occ => {
            const occDate = new Date(occ.timestamp);
            return occDate >= start && occDate <= end;
        });
    }, [allOccurrences, currentStartDate, currentEndDate]);


    useEffect(() => {
        const generateSummary = async () => {
            if (filteredOccurrences.length === 0) {
                setSummary('Nenhuma ocorrência no período selecionado para gerar um resumo.');
                setIsGeneratingSummary(false);
                return;
            }
            setIsGeneratingSummary(true);

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

                const simplifiedOccurrences = filteredOccurrences.map(o => ({
                    tipo: o.type,
                    bairro: o.address.bairro,
                    data: new Date(o.timestamp).toLocaleDateString('pt-BR'),
                    descricao: o.description.substring(0, 100)
                }));

                const prompt = `Você é um analista de segurança pública. Com base na seguinte lista de ocorrências em formato JSON, gere um resumo gerencial conciso em português (máximo de 3 parágrafos). Destaque os tipos de ocorrências mais comuns, as áreas (bairros) mais afetadas e quaisquer padrões ou tendências notáveis no período. Seja direto e objetivo, focando em insights para gestão.\n\nDados:\n${JSON.stringify(simplifiedOccurrences, null, 2)}`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [{ text: prompt }] },
                });
                
                setSummary(response.text ?? "Não foi possível gerar o resumo.");

            } catch (error) {
                console.error("Erro ao gerar resumo com IA:", error);
                setSummary("Ocorreu um erro ao gerar o resumo. Verifique a conexão e a chave de API.");
            } finally {
                setIsGeneratingSummary(false);
            }
        };

        generateSummary();
    }, [filteredOccurrences]);

    useEffect(() => {
        const fetchAllMedia = async () => {
            setIsLoadingMedia(true);
            try {
                const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/fotoocorrencia');
                if (!response.ok) throw new Error('Falha ao buscar mídias');
                const allMedia: any[] = await response.json();

                if (Array.isArray(allMedia)) {
                    const newMediaMap = new Map<string, { images: string[] }>();
                    allMedia.forEach(media => {
                        const id = media.ocorrencia_id;
                        if (!id) return;
                        
                        const mediaType = (media.tipoArquivo || '').toLowerCase();
                        const isImage = mediaType.startsWith('image/');
                        
                        if (isImage && media.url_arquivo) {
                            if (!newMediaMap.has(id)) {
                                newMediaMap.set(id, { images: [] });
                            }
                            newMediaMap.get(id)!.images.push(media.url_arquivo);
                        }
                    });
                    setMediaMap(newMediaMap);
                }
            } catch (error) {
                console.error('Erro ao buscar mídias das ocorrências:', error);
            } finally {
                setIsLoadingMedia(false);
            }
        };
        fetchAllMedia();
    }, [filteredOccurrences]);

    const handleGeneratePdf = async () => {
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            alert('Erro: As bibliotecas para gerar PDF não foram carregadas. Tente recarregar a página.');
            return;
        }
    
        const reportContent = document.getElementById('report-page-content');
        if (!reportContent) {
            alert('Erro: Não foi possível encontrar o conteúdo do relatório para gerar o PDF.');
            return;
        }
    
        setIsGeneratingPdf(true);
    
        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidthMM = pdf.internal.pageSize.getWidth();
            const pdfHeightMM = pdf.internal.pageSize.getHeight();
            const reportContentWidth = reportContent.offsetWidth;
    
            const renderElementsToCanvas = async (elements: HTMLElement[]): Promise<HTMLCanvasElement> => {
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.width = reportContentWidth + 'px';
                container.className = reportContent.className;
                container.style.margin = '0';
    
                elements.forEach(el => container.appendChild(el.cloneNode(true)));
                document.body.appendChild(container);

                // Convert all images to data URLs to handle potential CORS issues with html2canvas
                const images = Array.from(container.getElementsByTagName('img'));
                const imagePromises = images.map(async (img) => {
                    if (img.src && img.src.startsWith('http')) {
                        try {
                            const response = await fetch(img.src);
                            if (!response.ok) {
                                console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                                return;
                            }
                            const blob = await response.blob();
                            return new Promise<void>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    img.src = reader.result as string;
                                    resolve();
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                        } catch (error) {
                            console.error('Could not convert image to data URL:', img.src, error);
                        }
                    }
                });
                await Promise.all(imagePromises);
                
                const canvas = await window.html2canvas(container, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                });
                document.body.removeChild(container);
                return canvas;
            };
    
            const addCanvasToPdf = (canvas: HTMLCanvasElement, isFirstPage: boolean) => {
                if (!isFirstPage) {
                    pdf.addPage();
                }
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * pdfWidthMM) / canvas.width;
    
                if (imgHeight <= pdfHeightMM) {
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMM, imgHeight);
                } else {
                    let position = 0;
                    let heightLeft = imgHeight;
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidthMM, imgHeight);
                    heightLeft -= pdfHeightMM;
                    while (heightLeft > 0) {
                        position -= pdfHeightMM;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, pdfWidthMM, imgHeight);
                        heightLeft -= pdfHeightMM;
                    }
                }
            };
    
            const headerEl = reportContent.querySelector('section:nth-child(1)');
            const summaryEl = reportContent.querySelector('section:nth-child(2)');
            const occurrencesHeaderEl = reportContent.querySelector('.occurrence-details-container > h2');
    
            if (headerEl && summaryEl && occurrencesHeaderEl) {
                const firstPageCanvas = await renderElementsToCanvas([headerEl as HTMLElement, summaryEl as HTMLElement, occurrencesHeaderEl as HTMLElement]);
                addCanvasToPdf(firstPageCanvas, true);
            }
    
            const occurrenceItems = Array.from(reportContent.querySelectorAll('.occurrence-details-item')) as HTMLElement[];
            for (let i = 0; i < occurrenceItems.length; i += 2) {
                const pageElements: HTMLElement[] = [];
                if (occurrenceItems[i]) {
                    pageElements.push(occurrenceItems[i]);
                }
                if (occurrenceItems[i + 1]) {
                    pageElements.push(occurrenceItems[i + 1]);
                }
                
                if (pageElements.length > 0) {
                    const occurrenceCanvas = await renderElementsToCanvas(pageElements);
                    addCanvasToPdf(occurrenceCanvas, false);
                }
            }
    
            const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            pdf.save(`relatorio-guardacerta-${dateStr}.pdf`);
    
        } catch (error) {
            console.error("Erro ao gerar o PDF:", error);
            alert("Ocorreu um erro inesperado ao tentar gerar o PDF. Por favor, tente novamente.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('pt-BR') : 'N/A';

    const fullAddress = (addr: Occurrence['address']) => {
        return `${addr.logradouro || ''}, ${addr.numero || 'S/N'} - ${addr.bairro || ''}, ${addr.cidade || ''} - ${addr.estado || ''}`;
    };

    return (
        <div className="bg-gray-100 min-h-screen">
            <style>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background-color: #fff;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .report-page {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .occurrence-details-container {
                        page-break-inside: avoid;
                    }
                    .occurrence-details-item {
                         page-break-inside: avoid;
                    }
                    img {
                        max-width: 100% !important;
                    }
                }
            `}</style>

            <header className="bg-white p-4 shadow-md sticky top-0 z-10 no-print">
                <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800">Visualização de Relatório</h1>
                    
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative">
                            <input ref={startDateRef} className="bg-gray-100 border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm w-full sm:w-36 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Data de Início"/>
                            <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                        <span className="text-gray-500 hidden sm:inline">até</span>
                         <div className="relative">
                            <input ref={endDateRef} className="bg-gray-100 border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-sm w-full sm:w-36 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Data de Fim"/>
                            <CalendarIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button onClick={onBack} className="bg-slate-600 hover:bg-slate-700 !py-2 !px-4 text-sm flex items-center">
                           <ArrowLeftIcon className="w-5 h-5 mr-2" /> Voltar
                        </Button>
                        <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="!py-2 !px-4 text-sm flex items-center min-w-[150px] justify-center">
                           {isGeneratingPdf ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Gerando...
                                </>
                           ) : (
                                <>
                                    <PrinterIcon className="w-5 h-5 mr-2" /> Gerar PDF
                                </>
                           )}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="py-8">
                <div id="report-page-content" className="max-w-5xl mx-auto bg-white p-8 md:p-12 shadow-lg report-page">
                    <section className="text-center border-b pb-6 mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Relatório de Ocorrências</h1>
                        <p className="text-gray-600 mt-2">Período de {formatDate(currentStartDate)} a {formatDate(currentEndDate)}</p>
                    </section>
                    
                    <section className="mb-10">
                        <h2 className="text-2xl font-semibold text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">Resumo Gerencial</h2>
                        {isGeneratingSummary ? (
                           <div className="space-y-3 animate-pulse">
                               <div className="h-4 bg-gray-200 rounded w-full"></div>
                               <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                               <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                           </div>
                        ) : (
                            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">{summary}</div>
                        )}
                    </section>

                    <section className="occurrence-details-container">
                        <h2 className="text-2xl font-semibold text-gray-800 border-b-2 border-gray-200 pb-2 mb-6">Detalhes das Ocorrências ({filteredOccurrences.length})</h2>
                        <div className="space-y-10">
                             {filteredOccurrences.length === 0 && <p className="text-center text-gray-500 py-8">Nenhuma ocorrência encontrada para o período selecionado.</p>}
                            {filteredOccurrences.map(occ => {
                                const media = mediaMap.get(occ.protocolo);
                                return (
                                <div key={occ.protocolo} className="border-t-4 border-gray-200 pt-6 occurrence-details-item">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                        {/* Left Column */}
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Data e Horário</h4>
                                                <p className="text-gray-800">{new Date(occ.timestamp).toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Tipo de Ocorrência</h4>
                                                <p className="text-gray-800">{occ.type}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Descrição</h4>
                                                <p className="text-gray-800 whitespace-pre-wrap">{occ.description || 'Nenhuma descrição fornecida.'}</p>
                                            </div>
                                            {occ.descricao_audio && (
                                                <div>
                                                    <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Transcrição do Áudio</h4>
                                                    <p className="text-gray-800 bg-gray-50 p-3 rounded-md border italic">"{occ.descricao_audio}"</p>
                                                </div>
                                            )}
                                        </div>
                                         {/* Right Column */}
                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm">Local</h4>
                                                <p className="text-gray-800">{fullAddress(occ.address)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Photos Section (below the grid) */}
                                    {media && media.images.length > 0 && (
                                        <div className="mt-6">
                                            <h4 className="font-semibold text-gray-500 uppercase tracking-wider text-sm mb-2">Fotos</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                {media.images.map((img, index) => (
                                                    <img key={index} src={img} alt={`Foto da ocorrência ${occ.protocolo}`} className="rounded-lg border shadow-sm" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ReportPage;
