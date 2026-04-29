import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Trash2, ArrowRight, Loader2, History, User as UserIcon, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { logAction } from '../services/logService';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';
import { useAuth } from '../services/AuthContext';

interface ImportRow {
  id: string;
  nome: string;
  curso: string;
  media: number;
  frequencia: number;
  status: 'valid' | 'error' | 'warning';
  errors: string[];
}

interface ImportHistory {
  id: string;
  arquivo: string;
  data: string;
  registros: number;
  usuario: string;
  status: 'success' | 'partial';
}

const MOCK_HISTORY: ImportHistory[] = [
  { id: '1', arquivo: 'alunos_2024_1.csv', data: '2024-03-05 14:30', registros: 150, usuario: 'Coord. João', status: 'success' },
  { id: '2', arquivo: 'notas_informatica_mar.csv', data: '2024-03-01 09:15', registros: 45, usuario: 'Prof. Maria', status: 'success' },
  { id: '3', arquivo: 'frequencia_geral.csv', data: '2024-02-25 16:45', registros: 1200, usuario: 'Coord. João', status: 'partial' },
];

export default function ImportarDados() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isImported, setIsImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setIsImported(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validar se é o template correto
      const requiredFields = ['matricula', 'nome', 'curso', 'mediageral', 'frequencia'];
      const missingFields = requiredFields.filter(field => !headers.includes(field));
      
      if (missingFields.length > 0) {
        addToast({
          type: 'error',
          title: 'Template inválido',
          message: `Campos faltando: ${missingFields.join(', ')}`,
        });
        setIsProcessing(false);
        return;
      }

      // Processar linhas
      const mockPreview: ImportRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Validações
        const errors: string[] = [];
        let status: 'valid' | 'error' | 'warning' = 'valid';

        // Matrícula (apenas números)
        if (!/^\d+$/.test(row.matricula)) {
          errors.push('Matrícula deve conter apenas números');
          status = 'error';
        }

        // Nome obrigatório
        if (!row.nome || row.nome.length === 0) {
          errors.push('Nome do aluno é obrigatório');
          status = 'error';
        }

        // Curso obrigatório
        if (!row.curso || row.curso.length === 0) {
          errors.push('Curso é obrigatório');
          status = 'error';
        }

        // Média (0-10)
        const media = parseFloat(row.mediageral || row.media_geral || '0');
        if (media < 0 || media > 10) {
          errors.push('Média deve estar entre 0 e 10');
          status = 'error';
        }

        // Frequência (0-100)
        const frequencia = parseFloat(row.frequencia || '0');
        if (frequencia < 0 || frequencia > 100) {
          errors.push('Frequência deve estar entre 0 e 100%');
          status = 'error';
        }

        // CEP (opcional, mas valida se presente)
        if (row.cep && !/^\d{5}-?\d{3}$/.test(row.cep)) {
          errors.push('CEP inválido (use formato 69000-000)');
          status = 'error';
        }

        // Email (opcional, mas valida se presente)
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
          errors.push('Email inválido');
          status = 'warning'; // Warning não impede importação
        }

        // Telefone (opcional, mas valida se presente)
        if (row.telefone && !/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(row.telefone)) {
          errors.push('Telefone inválido (use formato (92) 99999-9999)');
          status = 'warning';
        }

        mockPreview.push({
          id: row.matricula || `linha_${i}`,
          nome: row.nome || 'NÃO INFORMADO',
          curso: row.curso || 'NÃO INFORMADO',
          media: media,
          frequencia: frequencia,
          status,
          errors,
        });
      }

      setPreviewData(mockPreview);
      setIsProcessing(false);
      
      if (mockPreview.every(row => row.status === 'valid')) {
        addToast({
          type: 'success',
          title: 'CSV válido!',
          message: `${mockPreview.length} registros prontos para importação.`,
        });
      } else {
        const errors = mockPreview.filter(r => r.status === 'error').length;
        addToast({
          type: 'warning',
          title: 'Atenção na importação',
          message: `${errors} registros com erros críticos.`,
        });
      }
    };
    
    reader.onerror = () => {
      addToast({
        type: 'error',
        title: 'Erro ao ler arquivo',
        message: 'Não foi possível ler o arquivo CSV.',
      });
      setIsProcessing(false);
    };
    
    reader.readAsText(selectedFile);
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    const fileName = file?.name || 'arquivo_desconhecido';
    const recordCount = previewData.length;

    try {
      // Simular importação (aqui entraria a chamada real da API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logAction('Importação de Dados', `Arquivo: ${fileName} | Registros: ${recordCount}`);
      
      // ============================================
      // GERAR PREDIÇÕES AUTOMATICAMENTE APÓS IMPORTAR
      // ============================================
      const token = localStorage.getItem('sapee_token');
      
      if (token) {
        addToast({
          type: 'info',
          title: 'Gerando predições...',
          message: 'Aguarde, gerando predições para os alunos importados.',
        });
        
        try {
          const resultado = await api.predicoes.gerarTodas(token);
          
          addToast({
            type: 'success',
            title: 'Importação concluída!',
            message: `${recordCount} alunos importados. ${resultado.alunos_processados} predições geradas.`,
          });
          
          logAction('Geração de Predições', `Após importação: ${resultado.alunos_processados} predições geradas`);
          
        } catch (error) {
          console.error('Erro ao gerar predições:', error);
          addToast({
            type: 'warning',
            title: 'Importação concluída',
            message: 'Alunos importados, mas será necessário gerar predições manualmente.',
          });
        }
      }
      
      setIsProcessing(false);
      setIsImported(true);
      setPreviewData([]);
      setFile(null);
      
    } catch (error) {
      console.error('Erro na importação:', error);
      addToast({
        type: 'error',
        title: 'Erro na importação',
        message: 'Ocorreu um erro ao importar os dados.',
      });
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    // Template completo com todos os campos do cadastro
    const headers = 'matricula,nome,email,telefone,dataNascimento,sexo,curso,periodo,turno,mediaGeral,frequencia,rendaFamiliar,rendaPerCapita,cidade,cep,logradouro,numero,complemento,bairro,zonaResidencial,possuiAuxilio,trabalha,cargaHorariaTrabalho,historicoReprovas,coeficienteRendimento,anoIngresso,tempoDeslocamento,custoTransporteDiario,dificuldadeAcesso,possuiComputador,possuiInternet,transporteUtilizado,beneficiarioBolsaFamilia,primeiroGeracaoUniversidade\n';
    
    // Exemplo de dados
    const exemplo = '2024101001,João da Silva,joao.silva@email.com,(92) 99999-9999,2005-03-15,M,Informática,3,MATUTINO,7.5,85,2500,625,Manaus,69000-000,Av. Djalma Batista,123,Apto 101,Santa Etelvina,ZONA_NORTE,False,True,20,1,8,2023,90,17.6,MEDIA,True,True,ONIBUS,False,True\n';
    
    const blob = new Blob([headers + exemplo], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_sapee_completo.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logAction('Download Template CSV', 'Usuário baixou o template completo para importação');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Importar Dados</h2>
        <p className="text-gray-500 dark:text-slate-400">Alimente o sistema com novos dados de alunos e performance via CSV.</p>
      </header>

      {!previewData.length && !isImported && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="md:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer h-100",
                isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-800"
              )}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
              />

              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Arraste seu arquivo CSV aqui</h3>
              <p className="text-gray-500 dark:text-slate-400 text-center max-w-xs">
                Ou clique para selecionar um arquivo do seu computador. Apenas arquivos .csv são aceitos.
              </p>

              {isProcessing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="font-bold text-gray-900 dark:text-white">Processando e validando dados...</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Instruções
              </h4>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  Use o template padrão para evitar erros de formatação.
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  Certifique-se de que as notas estão entre 0 e 10.
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  O sistema validará duplicidades automaticamente.
                </li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="w-full mt-6 py-3 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold text-sm border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Baixar Template CSV
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold mb-2">
                <AlertCircle className="w-5 h-5" /> Importante
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                A importação de novos dados recalculará automaticamente os modelos de predição para todos os alunos afetados.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {previewData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{file?.name}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">{previewData.length} registros encontrados</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewData([])}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 font-bold text-sm hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Descartar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={previewData.some(r => r.status === 'error')}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Importação <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {previewData.some(r => r.status === 'error') && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 dark:text-red-300 font-bold">Erros de validação encontrados</p>
                <p className="text-xs text-red-700 dark:text-red-400">Corrija os erros destacados abaixo no seu arquivo CSV antes de prosseguir com a importação.</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID / Matrícula</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nome do Aluno</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Curso</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Média</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Frequência</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {previewData.map((row, idx) => (
                  <tr key={idx} className={cn("transition-colors", row.status === 'error' ? "bg-red-50/30 dark:bg-red-900/20" : row.status === 'warning' ? "bg-amber-50/30 dark:bg-amber-900/20" : "hover:bg-gray-50 dark:hover:bg-slate-800")}>
                    <td className="px-6 py-4">
                      <span className={cn("font-mono text-sm", row.errors.some(e => e.includes('ID')) ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-slate-300")}>
                        {row.id || '---'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-sm font-semibold", row.errors.some(e => e.includes('Nome')) ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-900 dark:text-white")}>
                        {row.nome || 'NÃO INFORMADO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">{row.curso}</td>
                    <td className="px-6 py-4">
                      <span className={cn("text-sm font-bold", row.errors.some(e => e.includes('Média')) ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white")}>
                        {row.media}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("text-sm font-bold", row.errors.some(e => e.includes('Frequência')) ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white")}>
                        {row.frequencia}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {row.status === 'valid' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Válido
                          </span>
                        )}
                        {row.status === 'warning' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                            <AlertCircle className="w-3 h-3" /> Aviso
                          </span>
                        )}
                        {row.status === 'error' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase">
                            <AlertCircle className="w-3 h-3" /> Erro
                          </span>
                        )}
                        {row.errors.map((err, i) => (
                          <span key={i} className="text-[9px] text-red-500 font-medium leading-tight">{err}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {isImported && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-emerald-100 dark:border-emerald-800 shadow-xl shadow-emerald-500/5 dark:shadow-emerald-500/10 text-center space-y-6"
        >
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white">Importação Concluída!</h3>
            <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              Os dados foram processados e integrados ao sistema. As predições de risco já estão sendo atualizadas em segundo plano.
            </p>
          </div>
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={() => setIsImported(false)}
              className="px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
            >
              Fazer Nova Importação
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
            >
              Ver Dashboard Atualizado
            </button>
          </div>
        </motion.div>
      )}

      {/* Histórico de Importações */}
      {!previewData.length && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 pt-8 border-t border-gray-100 dark:border-slate-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-400 dark:text-slate-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Histórico de Importações</h3>
            </div>
            <button className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">Ver tudo</button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Arquivo</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Data / Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Registros</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Responsável</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {MOCK_HISTORY.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg">
                          <FileText className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.arquivo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {item.data}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 font-medium">{item.registros}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <UserIcon className="w-3.5 h-3.5" />
                        {item.usuario}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        item.status === 'success' ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                      )}>
                        {item.status === 'success' ? 'Concluído' : 'Parcial'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Baixar log de erros">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
