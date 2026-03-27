export interface Credentials {
  username: string;
  password: string;
}

export type OccurrenceType = 
  'Abordagem de suspeito' | 
  'Acidente de trânsito (sem vítima)' | 
  'Apoio a outros órgãos' | 
  'Atendimento para prestação de informações' | 
  'Conflito entre indivíduos' | 
  'PBF (Ponto Base Fixo)' | 
  'Verificação de invasão de imóvel' | 
  'Ocorrências envolvendo flanelinhas' | 
  'Operações conjuntas' | 
  'Outros (especificar nas observações)' | 
  'Prestação de socorro' | 
  'Separação de brigas';

export type OccurrenceStatus = 'A' | 'A Iniciar' | 'Em Andamento' | 'Concluído' | 'Cancelado';
export type OccurrencePriority = number;

export interface Acao {
    id: number;
    name: string;
    // other action properties
}

export interface Occurrence {
  id: number; // Changed to number for consistency
  protocolo: string; // Added to match spec
  responsavel: string;
  type: string;
  description: string;
  descricao_audio?: string;
  timestamp: string;
  address: {
    cep: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    complemento?: string;
  };
  latitude: number;
  longitude: number;
  status: OccurrenceStatus;
  priority: OccurrencePriority;
  da: string;
  acoesExecutadas: string;
  actionsCount: number;
  images?: string[]; // base64 or URL
  audio?: Blob;
  acoes?: Acao[]; // Added to match spec
}
export interface Unit {
    id: number;
    name: string;
    sigla: string;
}

export interface Profile {
    id: number;
    name: string;
}
export interface User {
    id: number;
    nome: string;
    cpf: string;
    matricula: string;
    email: string;
    celular?: string;
    perfil: string;
    unidade: string;
    perfilId: number;
    unidadeId: number;
}

export interface CustomPonto {
    id: string;
    nome: string;
    address: {
        logradouro?: string;
        numero?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
        pais?: string;
        cep?: string;
        fullAddress: string;
    };
    latitude: number;
    longitude: number;
}

export type RotaPonto = ((Occurrence & { pontoType: 'ocorrencia' }) | (CustomPonto & { pontoType: 'custom' })) & {
    estimatedArrivalTime?: string;
};

export type RotaStatus = 'Ativo' | 'Desabilitado';

export interface Rota {
    id: number;
    nome: string;
    dataPrevista: string; // start date
    fiscalId: number;
    fiscalNome: string;
    pontos: RotaPonto[]; // Combined list of points
    periodicidade: 'Nenhuma' | 'Diário' | 'Semanal' | 'Mensal';
    periodicidadeDetalhes?: { diaDaSemana?: number; diaDoMes?: number; };
    status: RotaStatus;
    createdBy: number;
}

export interface RotaCheckin {
    id: number;
    rotaId: number;
    pontoId: number | string; // number for occurrence, string for custom
    pontoType: 'ocorrencia' | 'custom';
    usuarioId: number;
    status: 'feito' | 'não feito';
    observacao: string;
    anexoUrls?: string[];
    dataCheckin: string;
    pontoNome?: string;
}

export interface Route {
  id: string;
  name: string;
  fiscal: string;
  points: number;
  periodicity: string;
  active: boolean;
  path?: [number, number][];
}