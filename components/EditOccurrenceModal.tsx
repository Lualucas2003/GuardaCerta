import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Occurrence, OccurrenceType } from '../types';
import Input from './common/Input';
import Select from './common/Select';
import Button from './common/Button';
import CameraIcon from './icons/CameraIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import TrashIcon from './icons/TrashIcon';

declare const L: any;
declare const flatpickr: any;

interface EditOccurrenceModalProps {
  occurrence: Occurrence;
  onClose: () => void;
  onSave: () => void;
}

const occurrenceTypes: OccurrenceType[] = [
  'Abordagem de suspeito',
  'Acidente de trânsito (sem vítima)',
  'Apoio a outros órgãos',
  'Atendimento para prestação de informações',
  'Conflito entre indivíduos',
  'PBF (Ponto Base Fixo)',
  'Verificação de invasão de imóvel',
  'Ocorrências envolvendo flanelinhas',
  'Operações conjuntas',
  'Outros (especificar nas observações)',
  'Prestação de socorro',
  'Separação de brigas'
];

// Helper to get base64 and mime type from data URL
const dataUrlParts = (dataUrl: string) => {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    return {
        mimeType: mimeMatch[1],
        base64: parts[1]
    };
};

export const EditOccurrenceModal: React.FC<EditOccurrenceModalProps> = ({ occurrence, onClose, onSave }) => {
  const [formData, setFormData] = useState<Occurrence>({ ...occurrence });
  const [isSaving, setIsSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [fetchedMedia, setFetchedMedia] = useState<{ images: string[], audios: string[] }>({ images: [], audios: [] });
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dateTimeInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMedia = async () => {
      setIsLoadingMedia(true);
      try {
        const response = await fetch(`https://n8n-datalakepcr.recife.pe.gov.br/webhook/fotoocorrencia?id=${occurrence.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch media');
        }
        const data = await response.json();
        
        if (isMounted) {
          const images: string[] = [];
          const audios: string[] = [];

          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item.mimeType && item.data) {
                const dataUrl = `data:${item.mimeType};base64,${item.data}`;
                if (item.mimeType.startsWith('image/')) {
                  images.push(dataUrl);
                } else if (item.mimeType.startsWith('audio/')) {
                  audios.push(dataUrl);
                }
              }
            });
          }

          setFetchedMedia({ images, audios });
        }
      } catch (error) {
        console.error("Error fetching media:", error);
      } finally {
        if (isMounted) {
          setIsLoadingMedia(false);
        }
      }
    };

    fetchMedia();

    return () => {
      isMounted = false;
    };
  }, [occurrence.id]);

  useEffect(() => {
    let url = '';
    if (formData.audio && formData.audio instanceof Blob) {
      url = URL.createObjectURL(formData.audio);
      setAudioUrl(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [formData.audio]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file as data URL.'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises)
      .then(imgs => {
        setNewImages(prev => [...prev, ...imgs]);
      })
      .catch(error => {
        console.error("Error reading files:", error);
        alert("Ocorreu um erro ao carregar as imagens.");
      });

    event.target.value = '';
  };

  const handleDeleteNewImage = (indexToRemove: number) => {
    setNewImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'numero') {
      processedValue = value.replace(/\D/g, '');
    }
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [name]: processedValue }
    }));
  };

  const handleNumeroBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, numero: '0' }
      }));
    }
  };

  const handleMarkerDrag = useCallback(async (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
    }));

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            cep: addr.postcode || '',
            logradouro: addr.road || '',
            numero: addr.house_number || prev.address.numero,
            bairro: addr.suburb || addr.neighbourhood || '',
            cidade: addr.city || addr.town || addr.village || '',
            estado: addr.state || '',
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            cep: '',
            logradouro: '',
            bairro: '',
            cidade: '',
            estado: '',
          }
        }));
      }
    } catch (error) {
      console.error("Erro no reverse geocoding:", error);
      alert('Não foi possível obter o endereço para esta localização.');
    }
  }, []);

  useEffect(() => {
    let fp: any = null;
    if (dateTimeInputRef.current && typeof flatpickr !== 'undefined') {
      fp = flatpickr(dateTimeInputRef.current, {
        enableTime: true,
        dateFormat: "d/m/Y H:i",
        defaultDate: new Date(formData.timestamp),
        onChange: (selectedDates: Date[]) => {
          if (selectedDates[0]) {
            setFormData(prev => ({ ...prev, timestamp: selectedDates[0].toISOString() }));
          }
        }
      });
    }
    return () => fp?.destroy();
  }, [formData.timestamp]);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined' && formData.latitude && formData.longitude) {
      const coords: [number, number] = [formData.latitude, formData.longitude];

      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(coords, 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const marker = L.marker(coords, { draggable: true }).addTo(map);
      marker.on('dragend', (event: any) => {
        const { lat, lng } = event.target.getLatLng();
        handleMarkerDrag(lat, lng);
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 0);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [formData.latitude, formData.longitude, handleMarkerDrag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = new FormData();
    const date = new Date(formData.timestamp);
    const formattedDateTime = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    payload.append('protocolo', formData.protocolo);
    payload.append('responsavel', formData.responsavel);
    payload.append('tp_ocorrencia', formData.type);
    payload.append('descricao', formData.description);
    payload.append('descricao_audio', formData.descricao_audio || '');
    payload.append('cep', formData.address.cep.replace(/\D/g, ''));
    payload.append('logradouro', formData.address.logradouro);
    payload.append('numero', formData.address.numero || '0');
    payload.append('bairro', formData.address.bairro);
    payload.append('cidade', formData.address.cidade);
    payload.append('estado', formData.address.estado);
    payload.append('latitude', String(formData.latitude ?? 0));
    payload.append('longitude', String(formData.longitude ?? 0));
    payload.append('data_horario', formattedDateTime);

    try {
      const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postocorrencias', {
        method: 'POST',
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      console.log('Ocorrência atualizada com sucesso:', await response.json());
      
      // Step 2: Send new media attachments
      const mediaPromises = [];
      for (const imgDataUrl of newImages) {
          const parts = dataUrlParts(imgDataUrl);
          if (parts) {
              const mediaPayload = {
                  ocorrencia_id: formData.protocolo,
                  arquivo_base64: parts.base64,
                  tipo_imagem: parts.mimeType,
              };
              const promise = fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/anexocorrecia', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(mediaPayload),
              });
              mediaPromises.push(promise);
          }
      }
      
      if (mediaPromises.length > 0) {
          const mediaResponses = await Promise.all(mediaPromises);
          const failedUploads = mediaResponses.filter(res => !res.ok);
          if (failedUploads.length > 0) {
              alert(`${failedUploads.length} nova(s) foto(s) falharam ao enviar.`);
          }
      }

      onSave();
    } catch (error) {
      console.error("Erro ao atualizar ocorrência:", error);
      alert('Houve um erro ao salvar as alterações. Por favor, tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-4xl transform transition-all duration-300 scale-95 animate-scale-in"
      >
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="p-8 pb-4 border-b border-slate-700">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-100">Editar Ocorrência</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white text-3xl leading-none"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="p-8 pt-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="latitude-edit" label="Latitude" type="text" value={formData.latitude?.toFixed(6) || ''} readOnly />
              <Input id="longitude-edit" label="Longitude" type="text" value={formData.longitude?.toFixed(6) || ''} readOnly />
            </div>

            <fieldset className="border border-slate-600 rounded-lg p-4 pt-2 space-y-4">
              <legend className="px-2 text-slate-300 font-medium text-sm">Endereço Completo</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input id="logradouro-edit" name="logradouro" label="Logradouro" type="text" value={formData.address.logradouro} onChange={handleAddressChange} />
                </div>
                <Input id="numero-edit" name="numero" label="Número" type="text" value={formData.address.numero || ''} onChange={handleAddressChange} onBlur={handleNumeroBlur} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input id="bairro-edit" name="bairro" label="Bairro" type="text" value={formData.address.bairro} onChange={handleAddressChange} />
                <Input id="cidade-edit" name="cidade" label="Cidade" type="text" value={formData.address.cidade} onChange={handleAddressChange} />
                <Input id="cep-edit" name="cep" label="CEP" type="text" value={formData.address.cep} onChange={handleAddressChange} />
              </div>
            </fieldset>

            <div ref={mapContainerRef} className="w-full h-64 rounded-lg z-0" />

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.descricao_audio && (
              <div>
                <label htmlFor="transcription-edit-view" className="block text-sm font-medium text-slate-300 mb-2">
                  Transcrição do Áudio
                </label>
                <div id="transcription-edit-view" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 whitespace-pre-wrap">
                  {formData.descricao_audio}
                </div>
              </div>
            )}

            {(formData.images?.length || newImages.length || formData.audio || fetchedMedia.images.length > 0 || fetchedMedia.audios.length > 0) ? (
              <div className="space-y-4">
                {isLoadingMedia ? (
                  <div className="text-slate-400 text-sm">Carregando mídias existentes...</div>
                ) : (
                  <>
                    {(formData.images?.length || fetchedMedia.images.length > 0) ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400 uppercase tracking-wider">Fotos Existentes</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {formData.images?.map((image, index) => (
                            <div key={`form-${index}`} className="relative group">
                              <img
                                src={image}
                                alt={`Anexo ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-slate-600"
                              />
                            </div>
                          ))}
                          {fetchedMedia.images.map((image, index) => (
                            <div key={`fetched-${index}`} className="relative group">
                              <img
                                src={image}
                                alt={`Anexo Servidor ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-slate-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {newImages.length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-amber-400 uppercase tracking-wider">Novas Fotos (Aguardando Salvar)</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {newImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Nova Foto ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border-2 border-amber-500/50"
                              />
                              <button 
                                type="button" 
                                onClick={() => handleDeleteNewImage(index)} 
                                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(formData.audio && audioUrl) || fetchedMedia.audios.length > 0 ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-400 uppercase tracking-wider">Áudios</label>
                        {formData.audio && audioUrl && (
                          <div className="flex items-center space-x-3">
                            <MicrophoneIcon className="w-6 h-6 text-slate-300 flex-shrink-0" />
                            <div className="flex-grow bg-slate-700/50 p-2 rounded-lg">
                              <audio controls src={audioUrl} className="w-full h-10" />
                            </div>
                          </div>
                        )}
                        {fetchedMedia.audios.map((audio, index) => (
                          <div key={`fetched-audio-${index}`} className="flex items-center space-x-3">
                            <MicrophoneIcon className="w-6 h-6 text-slate-300 flex-shrink-0" />
                            <div className="flex-grow bg-slate-700/50 p-2 rounded-lg">
                              <audio controls src={audio} className="w-full h-10" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <div className="flex items-center space-x-4">
                <input 
                    type="file" 
                    ref={imageInputRef} 
                    onChange={handleImageSelect} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                />
                <Button 
                    type="button" 
                    onClick={() => imageInputRef.current?.click()} 
                    className="bg-slate-600 hover:bg-slate-500 flex items-center"
                >
                    <CameraIcon className="w-5 h-5 mr-2" />
                    Adicionar Fotos
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input id="responsavel-edit" name="responsavel" label="Responsável" type="text" value={formData.responsavel} onChange={handleInputChange} />
              <Select
                id="type"
                name="type"
                label="Tipo de Ocorrência"
                value={formData.type}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Selecione o tipo...' },
                  ...occurrenceTypes.map(opt => ({ value: opt, label: opt }))
                ]}
              />
            </div>

            <Input ref={dateTimeInputRef} id="datetime-edit" label="Data e Horário" type="text" placeholder="Selecione data e hora" />

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out forwards;
          }
        `}</style>
      </form>
    </div>
  );
};
