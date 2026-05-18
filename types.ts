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
    escopo?: 'global' | 'local';
}

export interface Permissao {
    id: string;       // e.g. 'ocorrencias.visualizar'
    descricao: string;
    modulo: string;
    acao: string;
}

export interface ModuloPermissao {
    key: string;
    label: string;
    colorClass: string;
    bgClass: string;
    permissoes: Permissao[];
}

export const MODULOS_PERMISSOES: ModuloPermissao[] = [
    {
        key: 'ocorrencias',
        label: 'Ocorrências',
        colorClass: 'text-blue-700',
        bgClass: 'bg-blue-50 border-blue-200',
        permissoes: [
            { id: 'ocorrencias.visualizar', descricao: 'Visualizar lista', modulo: 'ocorrencias', acao: 'visualizar' },
            { id: 'ocorrencias.criar',      descricao: 'Registrar nova',   modulo: 'ocorrencias', acao: 'criar' },
            { id: 'ocorrencias.editar',     descricao: 'Editar',           modulo: 'ocorrencias', acao: 'editar' },
            { id: 'ocorrencias.excluir',    descricao: 'Excluir',          modulo: 'ocorrencias', acao: 'excluir' },
        ],
    },
    {
        key: 'monitoramento',
        label: 'Monitoramento',
        colorClass: 'text-green-700',
        bgClass: 'bg-green-50 border-green-200',
        permissoes: [
            { id: 'monitoramento.visualizar', descricao: 'Visualizar mapa em tempo real', modulo: 'monitoramento', acao: 'visualizar' },
        ],
    },
    {
        key: 'roteirizacao',
        label: 'Roteirização',
        colorClass: 'text-purple-700',
        bgClass: 'bg-purple-50 border-purple-200',
        permissoes: [
            { id: 'roteirizacao.visualizar', descricao: 'Visualizar rotas', modulo: 'roteirizacao', acao: 'visualizar' },
            { id: 'roteirizacao.criar',      descricao: 'Criar rota',       modulo: 'roteirizacao', acao: 'criar' },
            { id: 'roteirizacao.editar',     descricao: 'Editar rota',      modulo: 'roteirizacao', acao: 'editar' },
            { id: 'roteirizacao.excluir',    descricao: 'Excluir rota',     modulo: 'roteirizacao', acao: 'excluir' },
        ],
    },
    {
        key: 'dashboard',
        label: 'Dashboard',
        colorClass: 'text-orange-700',
        bgClass: 'bg-orange-50 border-orange-200',
        permissoes: [
            { id: 'dashboard.visualizar', descricao: 'Ver dashboard gerencial', modulo: 'dashboard', acao: 'visualizar' },
        ],
    },
    {
        key: 'relatorios',
        label: 'Relatórios',
        colorClass: 'text-amber-700',
        bgClass: 'bg-amber-50 border-amber-200',
        permissoes: [
            { id: 'relatorios.visualizar', descricao: 'Ver relatórios', modulo: 'relatorios', acao: 'visualizar' },
        ],
    },
    {
        key: 'configuracoes',
        label: 'Configurações',
        colorClass: 'text-red-700',
        bgClass: 'bg-red-50 border-red-200',
        permissoes: [
            { id: 'configuracoes.usuarios',  descricao: 'Gerenciar usuários',          modulo: 'configuracoes', acao: 'usuarios' },
            { id: 'configuracoes.unidades',  descricao: 'Gerenciar unidades',          modulo: 'configuracoes', acao: 'unidades' },
            { id: 'configuracoes.perfis',    descricao: 'Gerenciar perfis de acesso',  modulo: 'configuracoes', acao: 'perfis' },
        ],
    },
];
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