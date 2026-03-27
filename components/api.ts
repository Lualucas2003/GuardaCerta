

import { Rota, Occurrence, User, RotaCheckin, RotaPonto, CustomPonto, Unit, Profile, Credentials, OccurrenceStatus } from '../types';
import bcrypt from 'bcryptjs';

// --- MOCK DATABASE ---
// User data is now fetched from a live API. CUD operations are simulated but not persisted.

let mockUnits: Unit[] = [
    { id: 1, name: 'Administração', sigla: 'ADM' },
    { id: 2, name: 'Planejamento e Inteligência', sigla: 'PI' },
    { id: 3, name: 'Brigada', sigla: 'BRI' },
    { id: 4, name: 'Monitoramento', sigla: 'MON' },
    { id: 13, name: 'Unidade de Fiscalização', sigla: 'UF' },
    { id: 5, name: 'Rondas', sigla: 'RD' },
    { id: 6, name: 'Resposta Rápida', sigla: 'RR' },
];
let nextUnitId = Math.max(...mockUnits.map(u => u.id)) + 1;


let mockOccurrences: Occurrence[] = [
    { id: 101, protocolo: 'GC51426', responsavel: 'Fiscal', type: 'Construção Irregular', description: 'Construção em área de preservação', timestamp: '2025-10-13T10:52:00Z', address: { logradouro: 'Rua Biguaçu', numero: '100', bairro: 'Jiquiá', cidade: 'Recife', estado: 'PE', cep: '50865-040' }, latitude: -8.0615, longitude: -34.9280, status: 'A', priority: 3, da: 'DA-126', acoesExecutadas: '', actionsCount: 3, acoes: [] },
    { id: 102, protocolo: 'GC93323', responsavel: 'Fiscal', type: 'Aterro Ilegal', description: 'Aterro em margem de rio', timestamp: '2025-10-13T10:17:00Z', address: { logradouro: 'Rua das Azeitonas', numero: '50', bairro: 'Jiquiá', cidade: 'Recife', estado: 'PE', cep: '50865-050' }, latitude: -8.0610, longitude: -34.9250, status: 'A', priority: 4, da: 'DA-127', acoesExecutadas: '', actionsCount: 3, acoes: [] },
    { id: 103, protocolo: 'GC88781', responsavel: 'Fiscal', type: 'Desmatamento', description: 'Corte de árvores nativas', timestamp: '2025-10-09T10:40:00Z', address: { logradouro: 'Avenida Principal', numero: 'S/N', bairro: 'Várzea', cidade: 'Recife', estado: 'PE', cep: '50740-560' }, latitude: -8.0515, longitude: -34.9542, status: 'A', priority: 3, da: 'DA-128', acoesExecutadas: '', actionsCount: 2, acoes: [] },
];

let mockCheckins: RotaCheckin[] = [
    { id: 1, rotaId: 1, pontoId: 101, pontoType: 'ocorrencia', usuarioId: 2, status: 'feito', observacao: 'Tudo certo no local.', anexoUrls: ['https://via.placeholder.com/150'], dataCheckin: new Date().toISOString() }
];

let nextRotaId = 1;
let nextCheckinId = 2;

// --- API FUNCTIONS ---
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const formatAddressForOccurrence = (addr: Occurrence['address']): string => {
    let fullAddress = addr.logradouro || '';
    if (addr.numero && addr.numero !== '0' && addr.numero.toLowerCase() !== 's/n') {
        fullAddress += `, ${addr.numero}`;
    }
    if (addr.bairro) {
        fullAddress += ` - ${addr.bairro}`;
    }
    if (addr.cidade) {
        fullAddress += `, ${addr.cidade}`;
    }
    if (addr.estado) {
        fullAddress += ` - ${addr.estado}`;
    }
    if (addr.cep) {
        fullAddress += `, CEP: ${addr.cep}`;
    }
    return fullAddress.replace(/;/g, ','); // Ensure no semicolons are in the address part itself.
};

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

export const api = {
    async login(credentials: Credentials): Promise<{ id: number; username: string } | null> {
        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getusuarios');
        if (!response.ok) {
            console.error("Failed to fetch users:", response.statusText);
            throw new Error('Não foi possível buscar os dados de usuário para autenticação.');
        }

        const users: any[] = await response.json();
        
        const foundUser = users.find(user =>
            (user.cpf === credentials.username || String(user.matricula) === credentials.username) &&
            user.ativo === 1
        );
        
        if (foundUser) {
            if (credentials.password && foundUser.senha_hash) {
                try {
                    const isValid = bcrypt.compareSync(credentials.password, foundUser.senha_hash);
                    if (isValid) {
                        return { id: foundUser.id, username: foundUser.nome };
                    } else {
                        throw new Error('Senha incorreta.');
                    }
                } catch (error) {
                    console.error("Error verifying password:", error);
                    throw new Error('Erro ao verificar a senha.');
                }
            } else if (!foundUser.senha_hash) {
                // Fallback if no hash is present in the API response (e.g. legacy users)
                if (credentials.password) {
                    return { id: foundUser.id, username: foundUser.nome };
                }
            }
        }
        
        return null;
    },

    async getRotas(user: User): Promise<Rota[]> {
        await delay(500);
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getroterizacao');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const apiData = await response.json();
            
            if (!Array.isArray(apiData)) {
                console.error("Fetched routes data is not an array:", apiData);
                return [];
            }

            const mappedRotas: Rota[] = apiData.map((apiRota: any): Rota => {
                const lats = String(apiRota.latitudes || '').split(';').filter(Boolean);
                const lngs = String(apiRota.longitudes || '').split(';').filter(Boolean);
                const addrs = String(apiRota.enderecos || '').split(';').filter(Boolean);
                const nomes = String(apiRota.pontos_rotas || apiRota.nomes_pontos || '').split(';').filter(Boolean);
                const horarios = String(apiRota.horarios_previstos || '').split(';').filter(Boolean);

                const pontos: RotaPonto[] = [];
                const pointCount = Number(apiRota.quantidade_pontos) || 0;

                for (let i = 0; i < pointCount; i++) {
                    const lat = parseFloat(lats[i]);
                    const lng = parseFloat(lngs[i]);

                    // Skip points with invalid coordinates to prevent routing errors.
                    if (isNaN(lat) || isNaN(lng)) {
                        continue;
                    }

                    pontos.push({
                        id: `custom_${apiRota.id}_${i}`,
                        nome: nomes[i] || 'Ponto sem nome',
                        latitude: lat,
                        longitude: lng,
                        address: {
                            fullAddress: addrs[i] || 'Endereço não disponível'
                        },
                        pontoType: 'custom',
                        estimatedArrivalTime: horarios[i],
                    });
                }

                return {
                    id: parseInt(apiRota.id, 10),
                    nome: apiRota.nome_rota || 'Rota sem nome',
                    dataPrevista: apiRota.data_inicio,
                    fiscalId: 0, // Not provided by API
                    fiscalNome: apiRota.fiscal_responsavel || 'N/A',
                    pontos: pontos,
                    periodicidade: apiRota.periodicidade || 'Nenhuma',
                    status: apiRota.status === 'Desabilitado' ? 'Desabilitado' : 'Ativo',
                    createdBy: 0, // Not provided by API
                };
            });
            
            if (mappedRotas.length > 0) {
                const maxId = Math.max(...mappedRotas.map(r => r.id));
                nextRotaId = maxId + 1;
            }

            return mappedRotas;
        } catch (error) {
            console.error("Error fetching routes:", error);
            return [];
        }
    },

    async getOccurrencesForUser(user: User): Promise<Occurrence[]> {
        await delay(300);
        return JSON.parse(JSON.stringify(mockOccurrences));
    },

    async getAllOccurrences(): Promise<Occurrence[]> {
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getocorrencia');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let data = await response.json();
            
            if (!Array.isArray(data)) {
                 if(typeof data === 'object' && data !== null) {
                    data = [data];
                } else {
                    console.error("Fetched occurrences data is not an array or object:", data);
                    return [];
                }
            }

            const parseTimestamp = (dateString: string): string => {
                if (!dateString) return new Date().toISOString();
                const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4}|\d{2}) (\d{2}):(\d{2})/);
                if (!parts) {
                    // Try parsing ISO or other formats that Date.parse can handle
                    const parsedDate = Date.parse(dateString);
                    return isNaN(parsedDate) ? new Date().toISOString() : new Date(parsedDate).toISOString();
                }
                let year = parseInt(parts[3]);
                if (year < 100) year += 2000;
                return new Date(year, parseInt(parts[2]) - 1, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5])).toISOString();
            };

            const mappedData: Occurrence[] = data.map((item: any, index: number): Occurrence => {
                const numericId = parseInt(item.id_ocorrencia?.replace('NVM', '') || '0', 10);
                return {
                    id: !isNaN(numericId) && numericId > 0 ? numericId : Date.now() + index,
                    protocolo: item.id_ocorrencia ? String(item.id_ocorrencia).replace(/^NVM/, 'GC') : `GC${Date.now() + index}`,
                    responsavel: String(item.responsavel || 'N/A'),
                    type: item.tp_ocorrencia || 'Não especificado',
                    description: item.descricao || '',
                    descricao_audio: item.descricao_audio || '',
                    timestamp: parseTimestamp(item.data_horario),
                    address: {
                        cep: String(item.cep || ''),
                        logradouro: item.logradouro || '',
                        numero: String(item.numero || 'S/N'),
                        bairro: item.bairro || 'Não informado',
                        cidade: item.cidade || '',
                        estado: item.estado || '',
                    },
                    latitude: parseFloat(item.latitude) || 0,
                    longitude: parseFloat(item.longitude) || 0,
                    status: (item.status || 'A Iniciar') as OccurrenceStatus,
                    priority: parseInt(item.prioridade) || 3,
                    da: item.da || 'N/A',
                    acoesExecutadas: item.acoesExecutadas || 'Nenhuma',
                    actionsCount: parseInt(item.actionsCount) || 0,
                };
            });
            
            return mappedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        } catch (e) {
            console.error("Failed to fetch all occurrences:", e);
            return [];
        }
    },

    async getAllUsers(): Promise<User[]> {
        await delay(300);
        try {
            const [usersResponse, profiles, units] = await Promise.all([
                fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getusuarios'),
                this.getProfiles(),
                this.getUnits()
            ]);

            if (!usersResponse.ok) {
                console.error("Failed to fetch users:", usersResponse.statusText);
                return [];
            }

            const apiUsers = await usersResponse.json();
            
            if (!Array.isArray(apiUsers)) {
                console.error("Fetched user data is not an array:", apiUsers);
                return [];
            }

            const mappedUsers: User[] = apiUsers
                .filter((apiUser: any) => apiUser.ativo === 1)
                .map((apiUser: any): User => {
                    const perfilId = apiUser.perfis_ids?.[0] || 0;
                    const unidadeId = apiUser.unidades_ids?.[0] || 0;

                    const perfil = profiles.find(p => p.id === perfilId)?.name || 'N/A';
                    const unidade = units.find(u => u.id === unidadeId)?.name || 'N/A';

                    return {
                        id: apiUser.id,
                        nome: apiUser.nome || '',
                        cpf: apiUser.cpf || '',
                        matricula: apiUser.matricula ? String(apiUser.matricula) : '',
                        email: apiUser.email || '',
                        celular: apiUser.celular ? String(apiUser.celular) : '',
                        perfil: perfil,
                        unidade: unidade,
                        perfilId: perfilId,
                        unidadeId: unidadeId,
                    };
                });
            return mappedUsers;
        } catch (error) {
            console.error("Error in getAllUsers:", error);
            return [];
        }
    },

    async createUser(data: Omit<User, 'id'> & { senha?: string }): Promise<User> {
        let hashedPassword = undefined;
        if (data.senha) {
            const salt = bcrypt.genSaltSync(10);
            hashedPassword = bcrypt.hashSync(data.senha, salt);
        }

        const payload = {
            nome: data.nome,
            cpf: data.cpf,
            matricula: data.matricula,
            email: data.email,
            celular: data.celular,
            sistemas_ids: [], // Added as requested
            perfis_ids: [data.perfilId],
            unidades_ids: [data.unidadeId],
            senha_hash: hashedPassword,
            ativo: 1,
        };

        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postusuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
        
        // Assuming API returns the created user, if not we construct one to update UI optimistically
        const responseData = await response.json();
        
        const createdUser: User = {
            id: responseData.id || Date.now(), // Use returned ID or a temp one
            nome: data.nome,
            cpf: data.cpf,
            matricula: data.matricula,
            email: data.email,
            celular: data.celular,
            perfil: data.perfil,
            unidade: data.unidade,
            perfilId: data.perfilId,
            unidadeId: data.unidadeId,
        };
        
        return createdUser;
    },

    async updateUser(id: number, data: Partial<User>): Promise<User> {
        await delay(500);
        console.log("Simulating user update (no-op as API is read-only):", id, data);
        // This change will not persist. The UI will refetch and changes will be reverted.
        const placeholderUser: User = { id: 0, nome: '', cpf: '', matricula: '', email: '', perfil: '', unidade: '', perfilId: 0, unidadeId: 0 };
        return Promise.resolve({ ...placeholderUser, ...data, id });
    },

    async deleteUser(id: number): Promise<void> {
        await delay(500);
        console.log("Simulating user deletion (no-op as API is read-only):", id);
         // This change will not persist. The UI will refetch and the user will reappear.
        return Promise.resolve();
    },

    async getUnits(): Promise<Unit[]> {
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getunidade');
            if (!response.ok) {
                console.error('Failed to fetch units, falling back to mock data:', response.statusText);
                return mockUnits; // FALLBACK TO MOCK
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                console.error('Fetched units data is not an array, falling back to mock data:', data);
                return mockUnits; // FALLBACK TO MOCK
            }
            // Map API response to the Unit interface
            const units = data.map((item: any) => ({
                id: item.id,
                name: item.nome, // 'nome' from API maps to 'name' in our type
                sigla: item.sigla || '',
            }));
            if (units.length > 0) {
                 const maxId = Math.max(...units.map(u => Number(u.id)).filter(id => !isNaN(id)));
                 if (isFinite(maxId)) {
                    nextUnitId = maxId + 1;
                 }
                 mockUnits = units; // Update mock data cache
            }
            return units;
        } catch (error) {
            console.error('Error fetching units, falling back to mock data:', error);
            return mockUnits; // FALLBACK TO MOCK
        }
    },
    
    async createUnit(name: string, sigla: string): Promise<Unit> {
        const payload = {
            id: nextUnitId,
            nome: name,
            sigla: sigla,
        };
        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postunidades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }

        const responseData = await response.json();
        const createdUnit = {
            id: responseData.id || nextUnitId,
            name: responseData.nome || name,
            sigla: responseData.sigla || sigla,
        };
        nextUnitId++;
        return createdUnit;
    },

    async updateUnit(id: number, name: string, sigla: string): Promise<Unit> {
        const payload = {
            id: id,
            nome: name,
            sigla: sigla,
        };
         const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postunidades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }

        const responseData = await response.json();
        return {
            id: id,
            name: responseData.nome || name,
            sigla: responseData.sigla || sigla,
        };
    },

    async deleteUnit(id: number): Promise<void> {
        await delay(400);
        mockUnits = mockUnits.filter(u => u.id !== id);
    },

    async getProfiles(): Promise<Profile[]> {
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/getperfis');
            if (!response.ok) {
                console.error('Failed to fetch profiles:', response.statusText);
                return [];
            }
            const data = await response.json();
            if (!Array.isArray(data)) {
                console.error('Fetched profiles data is not an array:', data);
                return [];
            }
            // Map API response to the Profile interface
            return data.map((item: any) => ({
                id: item.id,
                name: item.nome, // 'nome' from API maps to 'name' in our type
            }));
        } catch (error) {
            console.error('Error fetching profiles:', error);
            return [];
        }
    },

    async createProfile(name: string): Promise<Profile> {
        const payload = { nome: name };
        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postperfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }

        const responseData = await response.json();
        return {
            id: responseData.id || Date.now(),
            name: responseData.nome || name
        };
    },
    
    async updateProfile(id: number, name: string): Promise<Profile> {
        const payload = { id: id, nome: name };
        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postperfil', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }

        const responseData = await response.json();
        return {
            id: responseData.id || id,
            name: responseData.nome || name
        };
    },

    async deleteProfile(id: number): Promise<void> {
        // To delete a profile, the API expects a POST request with the profile ID.
        const payload = { perfil_id: id };
        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postperfil', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
    },

    async createRota(data: Partial<Rota> & { fiscalIds?: number[] }): Promise<void> {
        const users = await this.getAllUsers();
        const selectedFiscais = users.filter(u => data.fiscalIds?.includes(u.id));
        const fiscalNames = selectedFiscais.map(u => u.nome).join(';') || 'N/A';
        const idForApi = nextRotaId++;

        const latitudes = data.pontos?.map(p => p.latitude).join(';') || '';
        const longitudes = data.pontos?.map(p => p.longitude).join(';') || '';
        const enderecos = data.pontos?.map(p =>
            p.pontoType === 'ocorrencia'
                ? formatAddressForOccurrence(p.address)
                : p.address.fullAddress.replace(/;/g, ',')
        ).join(';') || '';
        const pontos_rotas = data.pontos?.map(p => p.pontoType === 'ocorrencia' ? p.protocolo : p.nome.replace(/ /g, '-')).join(';') || '';
        const quantidade_pontos = data.pontos?.length || 0;
        const horarios_previstos = data.pontos?.map(p => p.estimatedArrivalTime || '').join(';') || '';

        const payload = {
            id: String(idForApi).padStart(4, '0'),
            nome_rota: data.nome?.replace(/ /g, '-'),
            fiscal_responsavel: fiscalNames || 'N/A',
            data_inicio: data.dataPrevista,
            periodicidade: data.periodicidade,
            status: data.status,
            latitudes,
            longitudes,
            enderecos,
            pontos_rotas,
            quantidade_pontos,
            horarios_previstos,
        };

        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postroterizacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            nextRotaId--;
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
    },

    async updateRota(id: number, data: Partial<Rota> & { fiscalIds?: number[] }): Promise<void> {
        const payload: any = { id: String(id).padStart(4, '0') };

        if (data.nome !== undefined) payload.nome_rota = data.nome.replace(/ /g, '-');
        if (data.dataPrevista !== undefined) payload.data_inicio = data.dataPrevista;
        if (data.periodicidade !== undefined) payload.periodicidade = data.periodicidade;
        if (data.status !== undefined) payload.status = data.status;

        if (data.fiscalIds !== undefined) {
            const users = await this.getAllUsers();
            const selectedFiscais = users.filter(u => data.fiscalIds!.includes(u.id));
            payload.fiscal_responsavel = selectedFiscais.map(u => u.nome).join(';') || 'N/A';
        } else if (data.fiscalNome !== undefined) {
            payload.fiscal_responsavel = data.fiscalNome;
        }
        
        if (data.pontos !== undefined) {
            payload.latitudes = data.pontos.map(p => p.latitude).join(';') || '';
            payload.longitudes = data.pontos.map(p => p.longitude).join(';') || '';
            payload.enderecos = data.pontos.map(p => 
                p.pontoType === 'ocorrencia' 
                    ? formatAddressForOccurrence(p.address)
                    : p.address.fullAddress.replace(/;/g, ',')
            ).join(';') || '';
            payload.pontos_rotas = data.pontos.map(p => p.pontoType === 'ocorrencia' ? p.protocolo : p.nome.replace(/ /g, '-')).join(';') || '';
            payload.quantidade_pontos = data.pontos.length;
            payload.horarios_previstos = data.pontos.map(p => p.estimatedArrivalTime || '').join(';') || '';
        }

        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postroterizacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
    },

    async deleteRota(id: number): Promise<void> {
        await delay(500);
        // mockRotas = mockRotas.filter(r => r.id !== id);
        console.log(`Simulating delete for rota ${id}. Not implemented on mock backend.`);
    },

    async createRotaCheckin(data: Omit<RotaCheckin, 'id' | 'anexoUrls'>, files: File[] | null, rotaNome: string, pontoNome: string): Promise<void> {
        const anexoUrls: string[] = [];
        const basePayload: any = {
            rota_id: String(data.rotaId).padStart(4, '0'),
            ponto_id: String(data.pontoId),
            observacao_checkin: data.observacao,
            usuario_id: String(data.usuarioId),
            status: data.status,
            data_checkin: data.dataCheckin,
            rota_nome: rotaNome.replace(/ /g, '-'),
            ponto_nome: pontoNome.replace(/ /g, '-'),
        };

        if (files && files.length > 0) {
            const uploadPromises = files.map(async (file) => {
                const filePayload = { ...basePayload };
                const base64Data = await blobToBase64(file);
                filePayload.arquivo_base64 = base64Data;
                filePayload.tipo_arquivo = file.type;
                filePayload.nome_arquivo = file.name;

                const dataUrl = `data:${file.type};base64,${base64Data}`;
                anexoUrls.push(dataUrl);

                return fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/anexocheckin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(filePayload),
                });
            });

            const responses = await Promise.all(uploadPromises);
            const failedResponses = responses.filter(res => !res.ok);

            if (failedResponses.length > 0) {
                // For simplicity, we throw an error on the first failure.
                // A more robust implementation might report partial success.
                const firstError = await failedResponses[0].text().catch(() => 'Erro desconhecido');
                throw new Error(`Falha ao enviar ${failedResponses.length} anexo(s). Primeiro erro: ${firstError}`);
            }
        } else {
            // Check-in without attachments
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/anexocheckin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(basePayload),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Não foi possível obter detalhes do erro.');
                throw new Error(`Falha ao enviar check-in sem anexos. Status: ${response.status}. Detalhes: ${errorText}`);
            }
        }

        const newCheckin: RotaCheckin = {
            id: nextCheckinId++,
            ...data,
            anexoUrls: anexoUrls,
        };
        mockCheckins.push(newCheckin);
    },

    async getAllCheckins(): Promise<RotaCheckin[]> {
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/c6253430-0dce-4e69-a519-16882f265285');
            if (!response.ok) {
                console.error('Failed to fetch check-in history:', response.statusText);
                return [];
            }
            const allCheckinData = await response.json();
    
            if (!Array.isArray(allCheckinData)) {
                console.error('Check-in history data is not an array:', allCheckinData);
                return [];
            }
    
            const groupedByCheckin = new Map<string, RotaCheckin>();
    
            allCheckinData.forEach(item => {
                const dateValue = item.data_checkin || item.upload_img;
                if (!dateValue) return;
                
                const checkinDate = new Date(dateValue);
                if (isNaN(checkinDate.getTime())) return;
                
                // A key to group multiple attachments for the same check-in event
                const key = `${item.id_rota}-${item.ponto_nome}-${checkinDate.toISOString()}-${item.observacao_checkin}`;
                
                if (!groupedByCheckin.has(key)) {
                    const pointNameRaw = item.ponto_nome || item.pontos_rotas;
                    groupedByCheckin.set(key, {
                        id: item.id,
                        rotaId: item.id_rota,
                        pontoNome: pointNameRaw?.replace(/-/g, ' ') || 'Ponto não identificado',
                        observacao: item.observacao_checkin || '',
                        dataCheckin: checkinDate.toISOString(),
                        anexoUrls: [],
                        pontoId: item.ponto_id || item.id,
                        pontoType: 'custom', // Cannot be determined from API
                        usuarioId: item.usuario_id || 0,
                        status: item.status || 'feito', // Assume 'feito' if status is missing
                    });
                }
    
                if (item.url_arquivo) {
                    groupedByCheckin.get(key)!.anexoUrls!.push(item.url_arquivo);
                }
            });
    
            return Array.from(groupedByCheckin.values());
    
        } catch (error) {
            console.error('Error in getAllCheckins:', error);
            return [];
        }
    },

    async getCheckinsForRota(rotaId: number): Promise<RotaCheckin[]> {
        try {
            const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/c6253430-0dce-4e69-a519-16882f265285');
            if (!response.ok) {
                console.error('Failed to fetch check-in history:', response.statusText);
                return [];
            }
            const allCheckinMedia = await response.json();
    
            if (!Array.isArray(allCheckinMedia)) {
                console.error('Check-in history data is not an array:', allCheckinMedia);
                return [];
            }
    
            const routeMedia = allCheckinMedia.filter(item => item.id_rota === rotaId);
    
            // Group media items by a composite key of timestamp and observation,
            // as multiple photos can belong to the same check-in event.
            const groupedByCheckin = new Map<string, {
                id: number;
                rotaId: number;
                pontoNome: string;
                observacao: string;
                dataCheckin: string;
                anexoUrls: string[];
            }>();
    
            routeMedia.forEach(item => {
                if (!item.upload_img || !item.url_arquivo) return;
    
                // FIX: Add a guard to ensure item.upload_img is a valid value for new Date()
                const dateValue = item.upload_img;
                if (typeof dateValue !== 'string' && typeof dateValue !== 'number') {
                    return;
                }
                const checkinDate = new Date(dateValue);
                if (isNaN(checkinDate.getTime())) {
                    return; // Skip invalid dates
                }

                const key = `${item.upload_img}-${item.observacao_checkin}`;
                if (!groupedByCheckin.has(key)) {
                    const pointNameRaw = item.ponto_nome || item.pontos_rotas;
                    groupedByCheckin.set(key, {
                        id: item.id,
                        rotaId: item.id_rota,
                        pontoNome: pointNameRaw?.replace(/-/g, ' ') || 'Ponto não identificado',
                        observacao: item.observacao_checkin,
                        dataCheckin: checkinDate.toISOString(),
                        anexoUrls: [],
                    });
                }
                groupedByCheckin.get(key)!.anexoUrls.push(item.url_arquivo);
            });
    
            // Map the grouped data to the RotaCheckin type
            return Array.from(groupedByCheckin.values()).map((groupedItem): RotaCheckin => ({
                ...groupedItem,
                // Fill in missing properties with dummy data as the API doesn't provide them.
                pontoId: groupedItem.id, // Using the checkin ID as a stand-in for a unique key
                pontoType: 'custom',
                usuarioId: 0, // Not provided
                status: 'feito', // Assumed 'feito' because a photo exists
            }));
    
        } catch (error) {
            console.error('Error in getCheckinsForRota:', error);
            return [];
        }
    },

    async uploadFiles(files: File[]): Promise<string[]> {
        await delay(1000);
        // Simulate upload and return mock URLs
        return files.map(file => `https://fake-storage.com/${Date.now()}-${file.name}`);
    },

    async changePassword(user: User, novaSenha: string): Promise<void> {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(novaSenha, salt);

        const payload = {
            id: user.id,
            nome: user.nome,
            cpf: user.cpf,
            matricula: user.matricula,
            email: user.email,
            celular: user.celular,
            sistemas_ids: [],
            perfis_ids: [user.perfilId],
            unidades_ids: [user.unidadeId],
            senha_hash: hashedPassword,
            ativo: 1,
        };

        const response = await fetch('https://n8n-datalakepcr.recife.pe.gov.br/webhook/postusuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error! status: ${response.status}, message: ${errorText}`);
        }
    }
};