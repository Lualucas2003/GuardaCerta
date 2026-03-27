
import React, { useRef, useEffect, useState } from 'react';
import { Occurrence } from '../types';
import Input from './common/Input';
import Select from './common/Select';
import CameraIcon from './icons/CameraIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

declare const L: any;

interface ViewOccurrenceModalProps {
  occurrence: Occurrence;
  onClose: () => void;
}

// FIX: Changed to a named export to resolve module import issues.
export const ViewOccurrenceModal: React.FC<ViewOccurrenceModalProps> = ({ occurrence, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [fetchedMedia, setFetchedMedia] = useState<{ images: string[], audios: string[] }>({ images: [], audios: [] });
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    let url = '';
    if (occurrence.audio) {
      if (occurrence.audio instanceof Blob) {
        url = URL.createObjectURL(occurrence.audio);
        setAudioUrl(url);
      }
    }
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
        setAudioUrl('');
      }
    };
  }, [occurrence.audio]);

  useEffect(() => {
    const fetchMedia = async () => {
      if (!occurrence.protocolo) {
        setIsLoadingMedia(false);
        return;
      }
      setIsLoadingMedia(true);
      try {
        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/fotoocorrencia');
        if (!response.ok) throw new Error('Failed to fetch media');
        const allMedia: any[] = await response.json();

        if (Array.isArray(allMedia)) {
          const occurrenceMedia = allMedia.filter(media => media.ocorrencia_id === occurrence.protocolo);

          const images: string[] = [];
          const audios: string[] = [];

          occurrenceMedia.forEach(media => {
            const mediaType = (media.tipoArquivo || '').toLowerCase();
            const isAudio =
              mediaType.startsWith('audio/') ||
              ['webm', 'mp3', 'ogg', 'wav', 'm4a'].some(ext => mediaType.includes(ext));

            if (isAudio) audios.push(media.url_arquivo);
            else images.push(media.url_arquivo);
          });

          setFetchedMedia({ images, audios });
        }
      } catch (error) {
        console.error('Error fetching occurrence media:', error);
      } finally {
        setIsLoadingMedia(false);
      }
    };
    fetchMedia();
  }, [occurrence.protocolo]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined' && occurrence.latitude && occurrence.longitude) {
      const coords: [number, number] = [occurrence.latitude, occurrence.longitude];

      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(coords, 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker(coords).addTo(map);
      L.control.zoom({ position: 'topleft' }).addTo(map);

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 0);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [occurrence]);

  const formattedTimestamp = new Date(occurrence.timestamp)
    .toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', '');

  const allImages = [...(occurrence.images || []), ...fetchedMedia.images];
  const allAudios = fetchedMedia.audios;

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-4xl transform transition-all duration-300 scale-95 animate-scale-in">
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto relative">
          {lightboxImage && (
            <div
              className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[70]"
              onClick={() => setLightboxImage(null)}
            >
              <div className="relative p-4">
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-0 right-0 m-4 text-white text-3xl leading-none"
                >
                  &times;
                </button>
                <img
                  src={lightboxImage}
                  alt="Visualização ampliada"
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="p-8 pb-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-100">Visualizar Ocorrência</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">
              &times;
            </button>
          </div>

          <div className="p-8 pt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="latitude-view"
                label="Latitude"
                type="text"
                value={occurrence.latitude?.toFixed(6) || 'N/A'}
                readOnly
                placeholder="Gerado automaticamente"
              />
              <Input
                id="longitude-view"
                label="Longitude"
                type="text"
                value={occurrence.longitude?.toFixed(6) || 'N/A'}
                readOnly
                placeholder="Gerado automaticamente"
              />
            </div>

            <fieldset className="border border-slate-600 rounded-lg p-4 pt-2 space-y-4">
              <legend className="px-2 text-slate-300 font-medium text-sm">Endereço Completo</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input id="logradouro-view" label="Logradouro" type="text" value={occurrence.address.logradouro} readOnly />
                </div>
                <Input id="numero-view" label="Número" type="text" value={occurrence.address.numero || 'S/N'} readOnly />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input id="bairro-view" label="Bairro" type="text" value={occurrence.address.bairro} readOnly />
                <Input id="cidade-view" label="Cidade" type="text" value={occurrence.address.cidade} readOnly />
                <Input id="cep-view" label="CEP" type="text" value={occurrence.address.cep} readOnly />
              </div>
              {occurrence.address.complemento && (
                <Input id="complemento-view" label="Complemento" type="text" value={occurrence.address.complemento} readOnly />
              )}
            </fieldset>

            <div ref={mapContainerRef} className="w-full h-64 rounded-lg z-0" />

            <div>
              <label htmlFor="description-view" className="block text-sm font-medium text-slate-300 mb-2">
                Descrição
              </label>
              <textarea
                id="description-view"
                value={occurrence.description}
                rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 read-only:bg-slate-800 read-only:cursor-default read-only:text-slate-400"
                readOnly
              />
            </div>

            {occurrence.descricao_audio && (
                <div>
                    <label htmlFor="transcription-view" className="block text-sm font-medium text-slate-300 mb-2">
                        Transcrição do Áudio
                    </label>
                    <div id="transcription-view" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 whitespace-pre-wrap">
                        {occurrence.descricao_audio}
                    </div>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Anexos</label>
              {isLoadingMedia ? (
                <div className="text-slate-400">Carregando anexos...</div>
              ) : (
                <div className="space-y-4">
                  {allImages.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <CameraIcon className="w-6 h-6 text-slate-300 flex-shrink-0 mt-1" />
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 flex-grow">
                        {allImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <a
                              href={image}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.preventDefault();
                                setLightboxImage(image);
                              }}
                            >
                              <img
                                src={image}
                                alt={`Anexo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-slate-600 cursor-pointer transition-transform duration-200 group-hover:scale-105"
                              />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allAudios.length > 0 && (
                    <div className="flex items-start space-x-3 pt-2">
                      <MicrophoneIcon className="w-6 h-6 text-slate-300 flex-shrink-0 mt-1" />
                      <div className="flex-grow space-y-2">
                        {allAudios.map((audioSrc, index) => (
                          <div key={index} className="bg-slate-700/50 p-2 rounded-lg">
                            <audio controls src={audioSrc} className="w-full h-10">
                              Seu navegador não suporta o elemento de áudio.
                            </audio>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {occurrence.audio && audioUrl && (
                    <div className="flex items-center space-x-3">
                      <MicrophoneIcon className="w-6 h-6 text-slate-300 flex-shrink-0" />
                      <div className="flex-grow bg-slate-700/50 p-2 rounded-lg">
                        <audio controls src={audioUrl} className="w-full h-10">
                          Seu navegador não suporta o elemento de áudio.
                        </audio>
                      </div>
                    </div>
                  )}

                  {allImages.length === 0 && allAudios.length === 0 && !occurrence.audio && (
                    <div className="text-slate-400 text-sm">Nenhum anexo encontrado.</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="responsavel-view" label="Responsável" type="text" value={occurrence.responsavel} readOnly />
              <Select
                id="type-view"
                label="Tipo de Ocorrência"
                value={occurrence.type}
                options={[{ value: occurrence.type, label: occurrence.type }]}
                disabled
              />
            </div>

            <Input id="datetime-view" label="Data e Horário" type="text" value={formattedTimestamp} readOnly />
          </div>
        </div>

        {/* CSS dentro do container */}
        <style>{`
          @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};