
import React, { useState, useEffect, useCallback } from 'react';
import { Profile, MODULOS_PERMISSOES } from '../types';
import { api } from './api';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';

// ─── Ícones inline ───────────────────────────────────────────────
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
    </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 1.5l8 3v6c0 5.25-3.5 10.15-8 11.5C7.5 20.65 4 15.75 4 10.5v-6l8-3z" clipRule="evenodd" />
    </svg>
);

// ─── Toggle Switch ────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
            checked ? 'bg-blue-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

// ─── Modal: Novo Perfil ───────────────────────────────────────────
interface NewProfileModalProps {
    onClose: () => void;
    onSave: (profile: Profile) => void;
}

const NewProfileModal: React.FC<NewProfileModalProps> = ({ onClose, onSave }) => {
    const [nome, setNome] = useState('');
    const [escopo, setEscopo] = useState<'local' | 'global'>('local');
    const [permissoesSelecionadas, setPermissoesSelecionadas] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    const togglePermissao = (id: string) => {
        setPermissoesSelecionadas(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleModulo = (ids: string[]) => {
        const allChecked = ids.every(id => permissoesSelecionadas.has(id));
        setPermissoesSelecionadas(prev => {
            const next = new Set(prev);
            ids.forEach(id => allChecked ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) { alert('Informe o nome do perfil.'); return; }
        setIsSaving(true);
        try {
            const created = await api.createProfile(nome.trim(), escopo);
            if (permissoesSelecionadas.size > 0) {
                await api.savePerfilPermissoes(created.id, Array.from(permissoesSelecionadas));
            }
            onSave(created);
            onClose();
        } catch (err) {
            alert(`Erro ao criar perfil: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                            <ShieldIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Novo Perfil</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                        {/* Nome */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Perfil *</label>
                            <input
                                id="novo-perfil-nome"
                                value={nome}
                                onChange={e => setNome(e.target.value)}
                                placeholder="Ex: Supervisor de Campo"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        {/* Escopo */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Escopo</label>
                            <div className="flex gap-3">
                                {(['local', 'global'] as const).map(op => (
                                    <button
                                        key={op}
                                        type="button"
                                        onClick={() => setEscopo(op)}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                            escopo === op
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                        }`}
                                    >
                                        {op.charAt(0).toUpperCase() + op.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Permissões iniciais */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">Permissões Iniciais</label>
                            <div className="space-y-3">
                                {MODULOS_PERMISSOES.map(modulo => {
                                    const allChecked = modulo.permissoes.every(p => permissoesSelecionadas.has(p.id));
                                    return (
                                        <div key={modulo.key} className={`rounded-xl border p-3 ${modulo.bgClass}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-sm font-bold ${modulo.colorClass}`}>{modulo.label}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleModulo(modulo.permissoes.map(p => p.id))}
                                                    className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                                                        allChecked
                                                            ? 'bg-gray-200 text-gray-600 border-gray-300'
                                                            : `${modulo.colorClass} border-current opacity-70 hover:opacity-100`
                                                    }`}
                                                >
                                                    {allChecked ? 'Desmarcar tudo' : 'Marcar tudo'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {modulo.permissoes.map(p => (
                                                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={permissoesSelecionadas.has(p.id)}
                                                            onChange={() => togglePermissao(p.id)}
                                                            className="w-4 h-4 rounded text-blue-600"
                                                        />
                                                        <span className="text-sm text-gray-700">{p.descricao}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                        <Button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-700">Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Criando...' : 'Criar Perfil'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Tela principal ───────────────────────────────────────────────
const ProfileSettings: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [activePermissoes, setActivePermissoes] = useState<Set<string>>(new Set());
    const [originalPermissoes, setOriginalPermissoes] = useState<Set<string>>(new Set());
    const [loadingProfiles, setLoadingProfiles] = useState(true);
    const [loadingPermissoes, setLoadingPermissoes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isNewProfileOpen, setIsNewProfileOpen] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const hasChanges = () => {
        if (activePermissoes.size !== originalPermissoes.size) return true;
        for (const id of activePermissoes) {
            if (!originalPermissoes.has(id)) return true;
        }
        return false;
    };

    const fetchProfiles = useCallback(async () => {
        setLoadingProfiles(true);
        try {
            const data = await api.getProfiles();
            setProfiles(data);
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
        } finally {
            setLoadingProfiles(false);
        }
    }, []);

    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const handleSelectProfile = async (profile: Profile) => {
        setSelectedProfile(profile);
        setLoadingPermissoes(true);
        setSaveSuccess(false);
        try {
            const ids = await api.getPerfilPermissoes(profile.id);
            const set = new Set(ids);
            setActivePermissoes(set);
            setOriginalPermissoes(new Set(ids));
        } catch {
            setActivePermissoes(new Set());
            setOriginalPermissoes(new Set());
        } finally {
            setLoadingPermissoes(false);
        }
    };

    const togglePermissao = (id: string) => {
        setActivePermissoes(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleModulo = (ids: string[]) => {
        const allChecked = ids.every(id => activePermissoes.has(id));
        setActivePermissoes(prev => {
            const next = new Set(prev);
            ids.forEach(id => allChecked ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedProfile) return;
        setIsSaving(true);
        try {
            await api.savePerfilPermissoes(selectedProfile.id, Array.from(activePermissoes));
            setOriginalPermissoes(new Set(activePermissoes));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            alert(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProfile = async (profile: Profile) => {
        if (!window.confirm(`Excluir o perfil "${profile.name}"? Esta ação não pode ser desfeita.`)) return;
        try {
            await api.deleteProfile(profile.id);
            if (selectedProfile?.id === profile.id) {
                setSelectedProfile(null);
                setActivePermissoes(new Set());
            }
            fetchProfiles();
        } catch (err) {
            alert(`Erro ao excluir: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const handleNewProfileSaved = (profile: Profile) => {
        fetchProfiles();
        // Auto-seleciona o perfil criado após reload
        setTimeout(async () => {
            await handleSelectProfile(profile);
        }, 500);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Perfis e Permissões</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os perfis de acesso e suas permissões no sistema</p>
                </div>
                <Button id="btn-novo-perfil" onClick={() => setIsNewProfileOpen(true)} className="flex items-center gap-2 self-start sm:self-auto">
                    <PlusIcon />
                    Novo Perfil
                </Button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* ── Painel Esquerdo: Lista de Perfis ── */}
                <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Perfis do Sistema</h2>
                        </div>

                        {loadingProfiles ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Carregando perfis...</div>
                        ) : profiles.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Nenhum perfil encontrado.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {profiles.map(profile => (
                                    <li key={profile.id}>
                                        <div
                                            onClick={() => handleSelectProfile(profile)}
                                            className={`flex items-center justify-between px-4 py-3.5 cursor-pointer group transition-colors ${
                                                selectedProfile?.id === profile.id
                                                    ? 'bg-blue-50 border-l-4 border-blue-600'
                                                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    selectedProfile?.id === profile.id ? 'bg-blue-100' : 'bg-gray-100'
                                                }`}>
                                                    <ShieldIcon className={`w-4 h-4 ${selectedProfile?.id === profile.id ? 'text-blue-600' : 'text-gray-400'}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-semibold truncate ${selectedProfile?.id === profile.id ? 'text-blue-700' : 'text-gray-800'}`}>
                                                        {profile.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{profile.escopo === 'global' ? 'Global' : 'Local'}</p>
                                                </div>
                                            </div>
                                            <button
                                                id={`btn-delete-perfil-${profile.id}`}
                                                onClick={e => { e.stopPropagation(); handleDeleteProfile(profile); }}
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 rounded transition-opacity flex-shrink-0"
                                                title="Excluir perfil"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* ── Painel Direito: Permissões ── */}
                <div className="flex-1 min-w-0">
                    {!selectedProfile ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 flex flex-col items-center justify-center p-16 text-center">
                            <ShieldIcon className="w-12 h-12 text-gray-200 mb-4" />
                            <p className="text-gray-500 font-medium">Selecione um perfil</p>
                            <p className="text-sm text-gray-400 mt-1">Clique em um perfil à esquerda para editar suas permissões</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Header do painel */}
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{selectedProfile.name}</h2>
                                    <p className="text-xs text-gray-500">Escopo: {selectedProfile.escopo === 'global' ? 'Global' : 'Local'} · ID: {selectedProfile.id}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {saveSuccess && (
                                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Salvo!
                                        </span>
                                    )}
                                    <Button
                                        id="btn-salvar-permissoes"
                                        onClick={handleSave}
                                        disabled={isSaving || !hasChanges()}
                                        className={`!py-2 !px-5 text-sm transition-all ${!hasChanges() && !isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSaving ? 'Salvando...' : 'Salvar Permissões'}
                                    </Button>
                                </div>
                            </div>

                            {/* Grade de permissões */}
                            <div className="p-6">
                                {loadingPermissoes ? (
                                    <div className="text-center text-gray-400 py-8">Carregando permissões...</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {MODULOS_PERMISSOES.map(modulo => {
                                            const allChecked = modulo.permissoes.every(p => activePermissoes.has(p.id));
                                            const someChecked = modulo.permissoes.some(p => activePermissoes.has(p.id));

                                            return (
                                                <div key={modulo.key} className={`rounded-xl border p-4 ${modulo.bgClass}`}>
                                                    {/* Cabeçalho do módulo */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className={`font-bold text-sm ${modulo.colorClass}`}>{modulo.label}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleModulo(modulo.permissoes.map(p => p.id))}
                                                            className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold transition-all ${
                                                                allChecked
                                                                    ? `${modulo.colorClass} border-current`
                                                                    : `text-gray-500 border-gray-300 hover:border-gray-400`
                                                            }`}
                                                        >
                                                            {allChecked ? 'Desmarcar tudo' : someChecked ? 'Marcar tudo' : 'Marcar tudo'}
                                                        </button>
                                                    </div>

                                                    {/* Lista de permissões */}
                                                    <div className="space-y-2.5">
                                                        {modulo.permissoes.map(p => (
                                                            <div key={p.id} className="flex items-center justify-between">
                                                                <span className="text-sm text-gray-700">{p.descricao}</span>
                                                                <Toggle
                                                                    checked={activePermissoes.has(p.id)}
                                                                    onChange={() => togglePermissao(p.id)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Rodapé com contagem */}
                            {!loadingPermissoes && (
                                <div className="px-6 pb-5">
                                    <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            <strong className="text-gray-700">{activePermissoes.size}</strong> de{' '}
                                            <strong className="text-gray-700">
                                                {MODULOS_PERMISSOES.reduce((acc, m) => acc + m.permissoes.length, 0)}
                                            </strong>{' '}
                                            permissões ativas
                                        </span>
                                        {hasChanges() && (
                                            <span className="text-xs text-amber-600 font-medium">● Alterações não salvas</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal novo perfil */}
            {isNewProfileOpen && (
                <NewProfileModal
                    onClose={() => setIsNewProfileOpen(false)}
                    onSave={handleNewProfileSaved}
                />
            )}
        </div>
    );
};

export default ProfileSettings;