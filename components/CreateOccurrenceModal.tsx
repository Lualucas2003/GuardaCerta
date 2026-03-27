

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Occurrence, OccurrenceType } from '../types';
import Input from './common/Input';
import Button from './common/Button';
import CameraIcon from './icons/CameraIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import LocationMarkerIcon from './icons/LocationMarkerIcon';
import Select from './common/Select';
import TrashIcon from './icons/TrashIcon';
import { GoogleGenAI } from '@google/genai';

// Let TypeScript know that 'L' from Leaflet is a global variable
declare const L: any;
declare const flatpickr: any;

interface CreateOccurrenceModalProps {
  onClose: () => void;
  onSaveSuccess: () => void;
  username: string;
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

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result !== 'string') {
            return reject(new Error("Failed to read blob as data URL."));
        }
        const base64String = reader.result;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};


export const CreateOccurrenceModal: React.FC<CreateOccurrenceModalProps> = ({ onClose, onSaveSuccess, username }) => {
  const [responsavel, setResponsavel] = useState(username);
  const [type, setType] = useState<OccurrenceType | ''>('');
  const [occurrenceDateTime, setOccurrenceDateTime] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState({
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
  });
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(undefined);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dateTimeInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<any>(null); // To hold map instance
  const markerRef = useRef<any>(null); // To hold marker instance
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);


  // Set the occurrence date and time when the modal opens
  useEffect(() => {
    const now = new Date();
    const formattedNow = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setOccurrenceDateTime(formattedNow);

    let fp: any = null;
    if (dateTimeInputRef.current && typeof flatpickr !== 'undefined') {
        fp = flatpickr(dateTimeInputRef.current, {
            enableTime: true,
            dateFormat: "d/m/Y H:i",
            defaultDate: now,
            onChange: (selectedDates: any, dateStr: string) => {
                setOccurrenceDateTime(dateStr);
            }
        });
    }

    return () => {
        fp?.destroy();
    }
  }, []);

  // Effect to manage audio object URL for preview
  useEffect(() => {
    if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        return () => {
            URL.revokeObjectURL(url);
            setAudioUrl('');
        };
    }
  }, [audioBlob]);
  
    // Effect to transcribe audio
    useEffect(() => {
        if (!audioBlob) {
            setTranscription('');
            return;
        }

        const transcribeAudio = async () => {
            setIsTranscribing(true);
            setTranscription('');
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
                
                const audioBase64 = await blobToBase64(audioBlob);

                const audioPart = {
                    inlineData: {
                        mimeType: audioBlob.type,
                        data: audioBase64,
                    },
                };

                const textPart = {
                    text: "Transcreva este áudio. A transcrição deve ser em português.",
                };

                // FIX: The `contents` property for a single multi-part request should be an object, not an array.
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: { parts: [audioPart, textPart] },
                });
                
                setTranscription(response.text ?? "");
            } catch (error) {
                console.error("Erro na transcrição de áudio:", error);
                setTranscription("Não foi possível transcrever o áudio. Tente novamente.");
            } finally {
                setIsTranscribing(false);
            }
        };

        transcribeAudio();
    }, [audioBlob]);


  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cep') {
        // Remove all non-digits, then apply formatting
        const digitsOnly = value.replace(/\D/g, '');
        let formattedCep = digitsOnly;
        if (digitsOnly.length > 5) {
            formattedCep = `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 8)}`;
        }
        setAddress(prev => ({ ...prev, cep: formattedCep }));
    } else if (name === 'numero') {
        const digitsOnly = value.replace(/\D/g, ''); // Allow only numbers
        setAddress(prev => ({ ...prev, numero: digitsOnly }));
    } else {
        setAddress(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleNumeroBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!e.target.value) {
          setAddress(prev => ({ ...prev, numero: '0' }));
      }
  };

  const handleCepBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setAddress(prev => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
        }));
        // Focus the number input after auto-filling
        numeroInputRef.current?.focus();
      } else {
        alert('CEP não encontrado.');
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      alert('Não foi possível buscar o CEP.');
    }
  }, []);

  const handleMarkerDrag = useCallback(async (lat: number, lng: number) => {
    setLatitude(parseFloat(lat.toFixed(6)));
    setLongitude(parseFloat(lng.toFixed(6)));

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
        const data = await response.json();
        if (data && data.address) {
            const addr = data.address;
            setAddress(prev => ({
                ...prev,
                cep: addr.postcode || '',
                logradouro: addr.road || '',
                numero: addr.house_number || prev.numero,
                bairro: addr.suburb || addr.neighbourhood || '',
                cidade: addr.city || addr.town || addr.village || '',
                estado: addr.state || '',
            }));
        } else {
             setAddress(prev => ({
                ...prev,
                cep: '',
                logradouro: '',
                bairro: '',
                cidade: '',
                estado: '',
            }));
        }
    } catch (error) {
        console.error("Erro no reverse geocoding:", error);
        alert('Não foi possível obter o endereço para esta localização.');
    }
  }, []);
  
  const reverseGeocodeAndFill = useCallback(async (lat: number, lng: number) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
        const data = await response.json();
        if (data && data.address) {
            const addr = data.address;
            setAddress(prev => ({
                ...prev,
                cep: prev.cep || addr.postcode || '',
                logradouro: prev.logradouro || addr.road || '',
                bairro: prev.bairro || addr.suburb || addr.neighbourhood || '',
                cidade: prev.cidade || addr.city || addr.town || addr.village || '',
                estado: prev.estado || addr.state || '',
            }));
        }
    } catch (error) {
        console.error("Erro no reverse geocoding (fill):", error);
        // Silently fail is okay here, as it's an enhancement.
    }
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada por este navegador.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await handleMarkerDrag(latitude, longitude);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Erro ao obter a geolocalização:", error);
        alert(`Não foi possível obter sua localização: ${error.message}`);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [handleMarkerDrag]);


  // Effect to initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      // Recife coordinates - used as a fallback
      const initialCoords: [number, number] = [-8.047562, -34.877002];
      
      const map = L.map(mapContainerRef.current).setView(initialCoords, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      const marker = L.marker(initialCoords, { draggable: true }).addTo(map);
      marker.on('dragend', (event: any) => {
          const { lat, lng } = event.target.getLatLng();
          handleMarkerDrag(lat, lng);
      });
      
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        handleMarkerDrag(lat, lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      
      setTimeout(() => map.invalidateSize(), 100);
    }

    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, [handleMarkerDrag]);

  // Effect to sync map with lat/lng state changes (e.g., from geocoding or initial load)
  useEffect(() => {
    if (latitude && longitude && mapRef.current && markerRef.current) {
        const newLatLng = L.latLng(latitude, longitude);
        markerRef.current.setLatLng(newLatLng);
        
        const currentCenter = mapRef.current.getCenter();
        // Only zoom if the new point is far from the current center (e.g., > 500m)
        // This prevents zooming on small drags or local clicks.
        if (currentCenter.distanceTo(newLatLng) > 500) {
            mapRef.current.setView(newLatLng, 17); // Zoom in closer
        } else {
            mapRef.current.panTo(newLatLng); // Just move the map center
        }
    }
  }, [latitude, longitude]);

  const handleGeocode = useCallback(async () => {
    const { logradouro, numero, cidade, estado } = address;
    if (!logradouro || !cidade || !estado) {
        alert('Preencha o endereço (logradouro, cidade, estado) para buscar as coordenadas.');
        return;
    }
    const fullAddress = `${logradouro}, ${numero}, ${cidade}, ${estado}, Brasil`;
    setIsGeocoding(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            // State update will trigger the map update effect
            setLatitude(lat);
            setLongitude(lon);
            // After finding coordinates, reverse geocode to fill in any missing address fields
            await reverseGeocodeAndFill(lat, lon);
        } else {
            alert('Coordenadas não encontradas para este endereço.');
            setLatitude(null);
            setLongitude(null);
        }
    } catch (error) {
        console.error("Erro de geocoding:", error);
        alert('Ocorreu um erro ao buscar as coordenadas.');
    } finally {
        setIsGeocoding(false);
    }
  }, [address, reverseGeocodeAndFill]);

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
      .then(newImages => {
        setImages(prevImages => [...prevImages, ...newImages]);
      })
      .catch(error => {
        console.error("Error reading files:", error);
        alert("Ocorreu um erro ao carregar as imagens.");
      });

    // Clear the input so the user can select the same file(s) again
    event.target.value = '';
  };

  const handleDeleteImage = (indexToRemove: number) => {
    setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
  };


  const handleToggleRecording = async () => {
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        streamRef.current?.getTracks().forEach(track => track.stop()); // Release the microphone
        setIsRecording(false);
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorderRef.current.onstop = () => {
                // FIX: Added an explicit Blob type annotation to help TypeScript's type inference, resolving a downstream error where `audioBlob` was incorrectly typed as `unknown`.
                const completeBlob: Blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(completeBlob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Erro ao iniciar a gravação:", error);
            alert("Não foi possível acessar o microfone.");
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      alert('Por favor, selecione o tipo de ocorrência.');
      return;
    }
    if (!latitude || !longitude) {
      alert('Por favor, defina uma localização no mapa.');
      return;
    }
    setIsSubmitting(true);

    // Generate a unique protocol ID on the client side
    const newProtocolo = `GC${Date.now()}`;

    const dateTimeParts = occurrenceDateTime.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
    let formattedDateTimeForApi = occurrenceDateTime;
    if (dateTimeParts) {
      formattedDateTimeForApi = `${dateTimeParts[1]}/${dateTimeParts[2]}/${dateTimeParts[3]} ${dateTimeParts[4]}:${dateTimeParts[5]}`;
    }

    const occurrencePayload = {
        protocolo: newProtocolo,
        responsavel: responsavel,
        tp_ocorrencia: type,
        descricao: description,
        descricao_audio: transcription || '',
        cep: address.cep.replace(/\D/g, ''),
        logradouro: address.logradouro,
        numero: address.numero || '0',
        bairro: address.bairro,
        cidade: address.cidade,
        estado: address.estado,
        latitude: String(latitude ?? 0),
        longitude: String(longitude ?? 0),
        data_horario: formattedDateTimeForApi
    };

    try {
      // Step 1: Send main form data
      const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postocorrencias', {
        method: 'POST',
        // FIX: Send data as JSON instead of FormData to align with media upload requests.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(occurrencePayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API principal: ${response.statusText} - ${errorText}`);
      }
      
      const occurrenceResult = await response.json();
      console.log("Occurrence creation response:", occurrenceResult);

      // Step 2: Send all media attachments using the client-generated protocol ID
      const mediaPromises = [];

      // Handle images
      for (const imgDataUrl of images) {
          const parts = dataUrlParts(imgDataUrl);
          if (parts) {
              const mediaPayload = {
                  ocorrencia_id: newProtocolo,
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

      // Handle audio
      if (audioBlob) {
          const audioBase64 = await blobToBase64(audioBlob);
          const mediaPayload = {
              ocorrencia_id: newProtocolo,
              base64_audio: audioBase64,
              tipo_imagem: audioBlob.type,
          };
          const promise = fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/anexocorrecia', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mediaPayload),
          });
          mediaPromises.push(promise);
      }
      
      const mediaResponses = await Promise.all(mediaPromises);
      const failedUploads = mediaResponses.filter(res => !res.ok);

      if (failedUploads.length > 0) {
          alert(`Ocorrência registrada com protocolo ${newProtocolo}, mas ${failedUploads.length} anexo(s) falharam ao enviar. Por favor, tente editar a ocorrência para adicioná-los.`);
      }
      
      onSaveSuccess();

    } catch (error) {
      console.error("Erro ao criar ocorrência:", error);
      alert(`Houve um erro ao registrar a ocorrência. Por favor, tente novamente. Detalhes: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      <div className="bg-slate-800 border border-slate-700 shadow-2xl w-full max-w-4xl transform transition-all duration-300 scale-95 animate-scale-in">
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
            <form onSubmit={handleSubmit}>
                <div className="p-4 md:p-6 pb-4 border-b border-slate-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-slate-100">Registrar Nova Ocorrência</h2>
                        { !isSubmitting &&
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                        }
                    </div>
                </div>

                <div className="p-4 md:p-6 pt-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id="latitude" label="Latitude" type="text" value={latitude?.toFixed(6) || ''} readOnly placeholder="Gerado automaticamente" />
                        <Input id="longitude" label="Longitude" type="text" value={longitude?.toFixed(6) || ''} readOnly placeholder="Gerado automaticamente" />
                    </div>
                    
                    <fieldset className="border border-slate-600 rounded-lg p-4 pt-2 space-y-4">
                        <legend className="px-2 text-slate-300 font-medium text-sm">Endereço Completo</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input id="cep" name="cep" label="CEP" type="text" value={address.cep} onChange={handleAddressChange} onBlur={handleCepBlur} maxLength={9} />
                            <div className="md:col-span-2">
                            <Input id="logradouro" name="logradouro" label="Logradouro" type="text" value={address.logradouro} onChange={handleAddressChange} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input ref={numeroInputRef} id="numero" name="numero" label="Número" type="text" value={address.numero} onChange={handleAddressChange} onBlur={handleNumeroBlur} />
                            <Input id="bairro" name="bairro" label="Bairro" type="text" value={address.bairro} onChange={handleAddressChange} />
                            <Input id="cidade" name="cidade" label="Cidade" type="text" value={address.cidade} onChange={handleAddressChange} />
                        </div>
                        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                            <Button type="button" onClick={handleUseCurrentLocation} disabled={isGettingLocation} className="bg-slate-600 hover:bg-slate-500 !py-2 !px-4 text-sm flex items-center justify-center">
                                <LocationMarkerIcon className="w-5 h-5 mr-2" />
                                {isGettingLocation ? 'Obtendo...' : 'Usar Localização Atual'}
                            </Button>
                            <Button type="button" onClick={handleGeocode} disabled={isGeocoding} className="bg-blue-600 hover:bg-blue-700 !py-2 !px-4 text-sm">
                                {isGeocoding ? 'Buscando...' : 'Buscar Coordenadas pelo Endereço'}
                            </Button>
                        </div>
                    </fieldset>

                    <div ref={mapContainerRef} className="w-full h-64 rounded-lg bg-slate-900 border border-slate-600" />

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Anexos</label>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                            <Button type="button" onClick={() => imageInputRef.current?.click()} className="bg-slate-600 hover:bg-slate-500 flex items-center justify-center">
                                <CameraIcon className="w-5 h-5 mr-2" />
                                Adicionar Foto(s)
                            </Button>
                            <input type="file" accept="image/*" multiple ref={imageInputRef} onChange={handleImageSelect} className="hidden" />

                            <Button type="button" onClick={handleToggleRecording} className={`flex items-center justify-center ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-500'}`}>
                                <MicrophoneIcon className="w-5 h-5 mr-2" />
                                {isRecording ? 'Parar Gravação' : 'Gravar Áudio'}
                            </Button>
                        </div>
                        
                        {images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {images.map((image, index) => (
                            <div key={index} className="relative group">
                                <img src={image} alt={`Anexo ${index + 1}`} className="w-full h-24 object-cover rounded-lg border-2 border-slate-600" />
                                <button type="button" onClick={() => handleDeleteImage(index)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            ))}
                        </div>
                        )}

                        {audioUrl && (
                            <div className="bg-slate-700/50 p-2 rounded-lg">
                                <audio controls src={audioUrl} className="w-full h-10">Seu navegador não suporta o elemento de áudio.</audio>
                            </div>
                        )}
                        {isTranscribing && <p className="text-slate-300 mt-2 text-center">Transcrevendo áudio, por favor aguarde...</p>}
                        {transcription && !isTranscribing && (
                            <div className="mt-2">
                                <label htmlFor="transcription-output" className="block text-sm font-medium text-slate-300 mb-1">Transcrição</label>
                                <div id="transcription-output" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 whitespace-pre-wrap">
                                    {transcription}
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input id="responsavel" label="Responsável" type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} readOnly />
                        <Select
                            id="type"
                            label="Tipo de Ocorrência"
                            value={type}
                            onChange={e => setType(e.target.value as OccurrenceType)}
                            options={[
                                { value: '', label: 'Selecione o tipo...' },
                                ...occurrenceTypes.map(opt => ({ value: opt, label: opt }))
                            ]}
                        />
                    </div>
                    
                    <Input ref={dateTimeInputRef} id="datetime" label="Data e Horário da Ocorrência" type="text" placeholder="Selecione data e hora" />

                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
                        <Button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-700">Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Registrando...' : 'Registrar Ocorrência'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
       <style>{`
        /* Modal scale in animation */
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  </div>
);
};