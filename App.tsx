




import React, { useState, useEffect, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { Credentials, User } from './types';
import Toast from './components/Toast';
import ApoioAlertModal from './components/ApoioAlertModal';
import { api } from './components/api';

// A simple icon for the banner, similar to the main logo but simplified
const BannerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect width="40" height="40" rx="8" fill="white"/>
        <g transform="scale(0.2) translate(15, 20)">
            <circle cx="100" cy="100" r="95" fill="#2E6031"/>
            <g transform="translate(0, -10)">
                <path d="M100 50 C 90 70, 90 90, 100 100 C 110 90, 110 70, 100 50 Z" fill="#90C393" />
                <path d="M85 55 C 75 75, 75 95, 85 105 C 95 95, 95 75, 85 55 Z" fill="#A8D5A0" />
                <path d="M115 55 C 125 75, 125 95, 115 105 C 105 95, 105 75, 115 55 Z" fill="#A8D5A0" />
            </g>
        </g>
    </svg>
);


interface BioFarolInstallBannerProps {
  onDismiss: () => void;
}

const BioFarolInstallBanner: React.FC<BioFarolInstallBannerProps> = ({ onDismiss }) => {
  const handleInstallClick = () => {
    alert("Para instalar, use a opção 'Adicionar à tela inicial' no seu navegador.");
    onDismiss();
  };

  return (
    <div className="w-full bg-slate-800 text-white p-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between shadow-lg text-center sm:text-left gap-4">
      <div className="flex items-center">
        <BannerIcon className="h-12 w-12 mr-4 flex-shrink-0" />
        <div>
            <p className="font-bold">Instale o BioFarol</p>
            <p className="text-sm text-slate-300">Acesso rápido e fácil na sua tela inicial.</p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center space-x-4">
        <button 
            onClick={onDismiss} 
            className="font-semibold text-slate-300 hover:text-white transition-colors"
        >
            Dispensar
        </button>
        <button 
            onClick={handleInstallClick} 
            className="bg-white text-slate-800 font-bold py-2 px-6 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap"
        >
            Instalar
        </button>
      </div>
    </div>
  );
};

// Helper function for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

const App: React.FC = () => {
  const [user, setUser] = useState<{ id: number; username: string } | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [supportStatus, setSupportStatus] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silentOscillatorRef = useRef<OscillatorNode | null>(null);
  const [supportAlert, setSupportAlert] = useState<any | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const usersCache = useRef<User[]>([]);

  // Request Wake Lock to keep the screen on and prevent the app from suspending
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock is active');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock was released');
        });
      }
    } catch (err: any) {
      console.error(`${err.name}, ${err.message}`);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current !== null) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Start a silent audio loop to prevent the browser from suspending the app in the background
  const startSilentAudio = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!silentOscillatorRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Set gain to 0 (silent)
        gain.gain.value = 0;
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        silentOscillatorRef.current = osc;
        console.log('Silent audio loop started for background execution');
      }
    } catch (e) {
      console.warn("Silent audio play failed:", e);
    }
  };

  const stopSilentAudio = () => {
    if (silentOscillatorRef.current) {
      silentOscillatorRef.current.stop();
      silentOscillatorRef.current.disconnect();
      silentOscillatorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    console.log('Silent audio loop stopped');
  };

  // Re-request wake lock when visibility changes (e.g., user comes back to the tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    // Dummy logic to show install banner
    // In a real PWA, you'd listen for the 'beforeinstallprompt' event
    const timer = setTimeout(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (!isStandalone) {
            setShowInstallBanner(true);
        }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
        releaseWakeLock();
        stopSilentAudio();
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        return;
    }

    // Request wake lock when user logs in
    requestWakeLock();
    // Start silent audio to keep app alive in background
    startSilentAudio();

    const sendLocationUpdate = async (latitude: number, longitude: number) => {
        const payload = {
            usuario_id: user.id,
            latitude,
            longitude,
            bt_apoio_status: supportStatus ? 1 : 0,
        };

        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/7d10a79b-9b34-463e-b945-8d589901025d', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error('Failed to send periodic location data:', response.statusText);
            } else {
                console.log('Periodic location data sent successfully.', payload);
            }
        } catch (error) {
            console.error('Error sending periodic location data:', error);
        }
    };

    if (navigator.geolocation) {
        // Use watchPosition for continuous, background-friendly tracking
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                sendLocationUpdate(latitude, longitude);
            },
            (error) => {
                console.error('Error getting geolocation:', error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 30000
            }
        );
    } else {
        console.warn("Geolocation is not supported by this browser.");
    }

    // Cleanup function
    return () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };
  }, [user, supportStatus]);
  
  // New useEffect for support alert polling
    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        let intervalId: number | null = null;
        
        const checkSupportRequests = async () => {
            if (!isMounted || supportAlert) return;

            try {
                // Cache users if not already cached
                if (usersCache.current.length === 0) {
                    usersCache.current = await api.getAllUsers();
                }

                const locationsResponse = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/c89b536d-49fd-4895-89d5-ff722579f271');
                if (!locationsResponse.ok) {
                    console.error('Failed to poll locations for support check.');
                    return;
                }

                const allLocations = await locationsResponse.json();
                if (!Array.isArray(allLocations)) return;
                
                // Get latest location for each user
                const latestLocations = new Map<number, any>();
                allLocations.forEach(loc => {
                    const existing = latestLocations.get(loc.usuario_id);
                    if (!existing || new Date(loc.ultimo_update) > new Date(existing.ultimo_update)) {
                        latestLocations.set(loc.usuario_id, loc);
                    }
                });

                const currentUserLocation = latestLocations.get(user.id);
                if (!currentUserLocation) return;

                const usersRequestingSupport = Array.from(latestLocations.values()).filter(loc => {
                    const isRequesting = loc.bt_apoio_status === 1;
                    const isRecent = (new Date().getTime() - new Date(loc.ultimo_update).getTime()) < 60000;
                    return isRequesting && isRecent;
                });
                
                // Cleanup dismissed alerts for users who are no longer requesting support
                const activeSupportIds = new Set(usersRequestingSupport.map(u => u.usuario_id));
                setDismissedAlerts(prev => {
                    const newDismissed = new Set(prev);
                    let changed = false;
                    for (const id of newDismissed) {
                        if (!activeSupportIds.has(id)) {
                            newDismissed.delete(id);
                            changed = true;
                        }
                    }
                    return changed ? newDismissed : prev;
                });

                for (const requesterLoc of usersRequestingSupport) {
                    if (requesterLoc.usuario_id === user.id || dismissedAlerts.has(requesterLoc.usuario_id)) {
                        continue;
                    }

                    const distance = getDistance(
                        currentUserLocation.latitude,
                        currentUserLocation.longitude,
                        requesterLoc.latitude,
                        requesterLoc.longitude
                    );
                    
                    if (distance <= 50) {
                        const requesterDetails = usersCache.current.find(u => u.id === requesterLoc.usuario_id);
                        if (requesterDetails) {
                            setSupportAlert({
                                usuario_id: requesterLoc.usuario_id,
                                nome: requesterDetails.nome,
                                unidade: requesterDetails.unidade,
                                latitude: requesterLoc.latitude,
                                longitude: requesterLoc.longitude,
                            });
                            break; // Show one alert at a time
                        }
                    }
                }

            } catch (error) {
                console.error('Error during support check polling:', error);
            }
        };

        checkSupportRequests();
        intervalId = window.setInterval(checkSupportRequests, 10000); // Check every 10 seconds

        return () => {
            isMounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [user, dismissedAlerts, supportAlert]);

  const handleLogin = (loggedInUser: { id: number; username: string }) => {
    if (loggedInUser && loggedInUser.username) {
      setUser(loggedInUser);
      setSupportStatus(false); // Reset support status on new login
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSupportStatus(false);
  };

  const handleInstallDismiss = () => {
    setShowInstallBanner(false);
  }
  
  const showToast = (message: string) => {
    setToastMessage(message);
  };
  
  const handleCloseToast = () => {
    setToastMessage(null);
  };
  
   const handleDismissAlert = () => {
        if (supportAlert) {
            setDismissedAlerts(prev => new Set(prev).add(supportAlert.usuario_id));
            setSupportAlert(null);
        }
    };

  if (!user) {
    return (
      <div className="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans">
        <main className="flex-grow flex items-center justify-center p-4">
            <LoginScreen onLogin={handleLogin} />
        </main>
        {showInstallBanner && <BioFarolInstallBanner onDismiss={handleInstallDismiss} />}
      </div>
    );
  }

  return (
     <>
      {toastMessage && <Toast message={toastMessage} onClose={handleCloseToast} />}
      {supportAlert && <ApoioAlertModal requester={supportAlert} onClose={handleDismissAlert} />}
      <Dashboard 
          username={user.username} 
          onLogout={handleLogout} 
          showToast={showToast}
          supportStatus={supportStatus}
          setSupportStatus={setSupportStatus}
          userId={user.id}
      />
    </>
  );
};

export default App;