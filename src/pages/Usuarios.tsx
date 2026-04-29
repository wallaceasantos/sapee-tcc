import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Edit, Lock, Unlock, Key, Trash2, Filter, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth, Role, User as UserType } from '../services/AuthContext';
import { useToast } from '../components/ui/Toast';
import { ConfirmationModal } from '../components/ui';
import { cn } from '../utils';
import api from '../services/api';

interface UsuarioFormData {
  nome: string;
  email: string;
  senha?: string;
  role: Role;
  curso_id?: number;
  ativo: boolean;
}

export default function Usuarios() {
  const { addToast } = useToast();
  const { user: currentUser, token } = useAuth();
  const [usuarios, setUsuarios] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRole, setFiltroRole] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userParaExcluir, setUserParaExcluir] = useState<number | null>(null);

  // Carregar usuários da API
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setIsLoading(true);
      const data = await api.usuarios.list(token || '', 0, 1000);
      
      // Normalizar dados - role pode vir como objeto ou string
      const normalizedData = data.map((u: any) => ({
        ...u,
        role: typeof u.role === 'object' && u.role?.nome ? u.role.nome : u.role,
        curso_nome: u.curso?.nome || u.curso_nome,
      }));
      
      setUsuarios(normalizedData);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      addToast({
        type: 'error',
        title: 'Erro ao carregar',
        message: error.message || 'Não foi possível carregar os usuários',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = usuarios.filter(usuario => {
    const matchesSearch = usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filtroRole || usuario.role === filtroRole;
    const matchesStatus = !filtroStatus || 
      (filtroStatus === 'ativo' && usuario.ativo) ||
      (filtroStatus === 'inativo' && !usuario.ativo);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSave = async (formData: UsuarioFormData) => {
    try {
      if (editingUser) {
        // Editar usuário existente
        await api.usuarios.update(token || '', editingUser.id, {
          nome: formData.nome,
          email: formData.email,
          role_id: getRoleId(formData.role),
          curso_id: formData.curso_id,
          ativo: formData.ativo,
          ...(formData.senha ? { senha: formData.senha } : {}),
        });
        addToast({
          type: 'success',
          title: 'Usuário atualizado!',
          message: 'Dados atualizados com sucesso.',
        });
      } else {
        // Criar novo usuário
        if (!formData.senha) {
          addToast({
            type: 'error',
            title: 'Senha obrigatória',
            message: 'Informe uma senha para o novo usuário.',
          });
          return;
        }
        await api.usuarios.create(token || '', {
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          role_id: getRoleId(formData.role),
          curso_id: formData.curso_id,
          ativo: formData.ativo,
        });
        addToast({
          type: 'success',
          title: 'Usuário cadastrado!',
          message: 'Cadastro realizado com sucesso.',
        });
      }
      setIsModalOpen(false);
      setEditingUser(null);
      await carregarUsuarios();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      addToast({
        type: 'error',
        title: 'Erro ao salvar',
        message: error.message || 'Não foi possível salvar o usuário',
      });
    }
  };

  const handleToggleStatus = async (usuario: UserType) => {
    try {
      await api.usuarios.toggleStatus(token || '', usuario.id, !usuario.ativo);
      addToast({
        type: 'success',
        title: usuario.ativo ? 'Usuário inativado' : 'Usuário ativado',
        message: `Status de ${usuario.nome} foi alterado.`,
      });
      await carregarUsuarios();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      addToast({
        type: 'error',
        title: 'Erro ao alterar status',
        message: error.message || 'Não foi possível alterar o status',
      });
    }
  };

  const handleDelete = async () => {
    if (userParaExcluir) {
      try {
        await api.usuarios.delete(token || '', userParaExcluir);
        addToast({
          type: 'success',
          title: 'Usuário excluído',
          message: 'Registro removido com sucesso.',
        });
        setShowDeleteModal(false);
        setUserParaExcluir(null);
        await carregarUsuarios();
      } catch (error: any) {
        console.error('Erro ao excluir usuário:', error);
        addToast({
          type: 'error',
          title: 'Erro ao excluir',
          message: error.message || 'Não foi possível excluir o usuário',
        });
      }
    }
  };

  const getRoleId = (role: Role): number => {
    const roleMap: Record<Role, number> = {
      ADMIN: 1,
      COORDENADOR: 2,
      PEDAGOGO: 3,
      DIRETOR: 4,
    };
    return roleMap[role] || 1;
  };

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.ativo).length,
    inativos: usuarios.filter(u => !u.ativo).length,
    online: 1, // Mock
  };

  const roleColors = {
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    COORDENADOR: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    PEDAGOGO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    DIRETOR: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Gestão de Usuários</h2>
          <p className="text-gray-500 dark:text-slate-400">Gerencie os usuários e permissões do sistema.</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 
                     transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Novo Usuário
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase">Total</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Ativos</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.ativos}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
          <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Inativos</p>
          <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.inativos}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Online</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.online}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                       rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                       transition-all text-gray-900 dark:text-white"
          />
        </div>

        <select
          value={filtroRole}
          onChange={(e) => setFiltroRole(e.target.value)}
          className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                     rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                     text-gray-900 dark:text-white"
        >
          <option value="">Todos os Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="COORDENADOR">COORDENADOR</option>
          <option value="PEDAGOGO">PEDAGOGO</option>
          <option value="DIRETOR">DIRETOR</option>
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                     rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                     text-gray-900 dark:text-white"
        >
          <option value="">Todos os Status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm('');
            setFiltroRole('');
            setFiltroStatus('');
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-800 
                     text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 
                     dark:hover:bg-slate-700 transition-colors"
        >
          <Filter className="w-4 h-4" /> Limpar
        </button>
      </div>

      {/* Tabela de Usuários */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum usuário encontrado</h3>
          <p className="text-gray-500 dark:text-slate-400">Tente ajustar seus filtros de busca.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Curso</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Último Acesso</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredUsers.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{usuario.nome}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">{usuario.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", roleColors[usuario.role])}>
                        {usuario.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {usuario.curso_nome || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 w-fit",
                        usuario.ativo 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-400"
                      )}>
                        {usuario.ativo ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                      {(usuario as any).ultimo_acesso
                        ? new Date((usuario as any).ultimo_acesso).toLocaleString('pt-BR')
                        : 'Nunca acessou'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(usuario)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            usuario.ativo 
                              ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          )}
                          title={usuario.ativo ? 'Inativar' : 'Ativar'}
                        >
                          {usuario.ativo ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(usuario);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUserParaExcluir(usuario.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Usuário */}
      {isModalOpen && (
        <UsuarioModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSave}
          usuario={editingUser || undefined}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Excluir usuário?"
        description="Esta ação não pode ser desfeita. O usuário será removido permanentemente do sistema."
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
}

// Modal de Cadastro/Edição de Usuário
function UsuarioModal({
  isOpen,
  onClose,
  onSave,
  usuario,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  usuario?: UserType;
}) {
  const [formData, setFormData] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    senha: '',
    role: usuario?.role || 'COORDENADOR' as Role,
    curso_id: usuario?.curso_id,
    ativo: usuario?.ativo ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email) {
      return;
    }

    if (!usuario && !formData.senha) {
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-emerald-600 to-emerald-700">
          <h3 className="text-xl font-bold text-white">
            {usuario ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                         text-gray-900 dark:text-white"
              placeholder="Ex: João da Silva"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Email Institucional
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                         text-gray-900 dark:text-white"
              placeholder="exemplo@ifam.edu.br"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {usuario ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
            </label>
            <input
              type="password"
              value={formData.senha}
              onChange={(e) => setFormData({...formData, senha: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                         text-gray-900 dark:text-white"
              placeholder={usuario ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
              required={!usuario}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 
                         rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 
                         text-gray-900 dark:text-white"
            >
              <option value="ADMIN">ADMIN - Administrador do Sistema</option>
              <option value="COORDENADOR">COORDENADOR - Coordenador de Curso</option>
              <option value="PEDAGOGO">PEDAGOGO - Pedagogo/Psicólogo</option>
              <option value="DIRETOR">DIRETOR - Diretor Geral</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.ativo}
                  onChange={() => setFormData({...formData, ativo: true})}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.ativo}
                  onChange={() => setFormData({...formData, ativo: false})}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700 dark:text-slate-300 font-medium">Inativo</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 
                         rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold 
                         hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
            >
              {usuario ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
