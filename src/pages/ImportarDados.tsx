import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import { logAction } from '../services/logService';
import { useToast } from '../components/ui/Toast';
import api from '../services/api';

interface ImportRow {
  id: string;
  nome: string;
  curso: string;
  media: number;
  frequencia: number;
  status: 'valid' | 'error' | 'warning';
  errors: string[];
}

export default function ImportarDados() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isImported, setIsImported] = useState(false);
  const [progress, setProgress] = useState<{ processados: number; total: number; importados: number; erros: number; status: string } | null>(null);
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
      
      // Auto-detectar delimitador: verifica qual aparece mais na primeira linha
      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ';' : ',';
      
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
      
      // Validar se é o template correto
      const requiredFields = ['matricula', 'nome', 'curso', 'media_geral', 'frequencia'];
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
        const values = lines[i].split(delimiter).map(v => v.trim());
        if (values.length < 2 || values.every(v => !v)) continue;
        const row: Record<string, string> = {};
        
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
    setProgress(null);
    const fileName = file?.name || 'arquivo_desconhecido';
    const recordCount = previewData.length;

    try {
      const token = localStorage.getItem('sapee_token');
      if (!token) throw new Error('Token de autenticacao nao encontrado');

      const resultado = await api.alunos.importCSV(token, file!);
      const jobId = resultado?.job_id;

      if (!jobId) {
        // Modo antigo - backend nao foi reiniciado, aguarda resposta sincrona
        setIsProcessing(false);
        const importados = resultado?.alunos_importados || recordCount;
        logAction('Importacao de Dados', `Arquivo: ${fileName} | Importados: ${importados}`);
        setIsImported(true);
        setPreviewData([]);
        setFile(null);
        addToast({
          type: importados > 0 ? 'success' : 'warning',
          title: 'Importacao concluida',
          message: `${importados} alunos importados. Reinicie o backend (uvicorn) para ver a barra de progresso.`,
        });
        return;
      }

      // Poll progress
      const pollInterval = setInterval(async () => {
        try {
          const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const resp = await fetch(`${API}/alunos/importar-csv/progress/${jobId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (resp.ok) {
            const p = await resp.json();
            setProgress(p);
            if (p.status === 'concluido' || p.status === 'erro') {
              clearInterval(pollInterval);
              setIsProcessing(false);
              if (p.status === 'concluido') {
                logAction('Importacao de Dados', `Arquivo: ${fileName} | Importados: ${p.importados} | Erros: ${p.erros}`);
                setIsImported(true);
                setPreviewData([]);
                setFile(null);
                addToast({
                  type: p.importados > 0 ? 'success' : 'warning',
                  title: 'Importacao concluida',
                  message: `${p.importados} alunos importados, ${p.erros} erros, ${p.predicoes || 0} predicoes.`,
                });
              } else {
                addToast({ type: 'error', title: 'Erro na importacao', message: p.mensagem || 'Erro desconhecido' });
              }
            }
          }
        } catch { /* ignora erro de poll */ }
      }, 1500);

    } catch (error) {
      console.error('Erro na importacao:', error);
      addToast({ type: 'error', title: 'Erro na importacao', message: error instanceof Error ? error.message : 'Ocorreu um erro.' });
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const separator = ';';
    const lineEnd = '\r\n';

    // BOM para Excel reconhecer UTF-8
    const BOM = '\uFEFF';

    // Template completo com todos os campos do cadastro (snake_case = formato do backend)
    const headers = 'matricula;nome;email;telefone;data_nascimento;idade;sexo;curso;periodo;turno;media_geral;frequencia;renda_familiar;renda_per_capita;cidade;cep;logradouro;numero;complemento;bairro;zona_residencial;possui_auxilio;tipo_auxilio;trabalha;carga_horaria_trabalho;historico_reprovas;coeficiente_rendimento;ano_ingresso;tempo_deslocamento;custo_transporte_diario;dificuldade_acesso;possui_computador;possui_internet;transporte_utilizado;usa_transporte_alternativo;beneficiario_bolsa_familia;primeiro_geracao_universidade';

    // Exemplo de dados (valores que serao lidos pelo backend)
    const exemplo = '2024101001;Joao da Silva;joao.silva@email.com;(92) 99999-9999;2005-03-15;19;M;Informatica;3;MATUTINO;7.5;85;2500;625;Manaus;69000-000;Av. Djalma Batista;123;Apto 101;Santa Etelvina;ZONA_NORTE;False;BOLSA_MONITORIA;True;20;1;8;2023;90;17.6;MEDIA;True;True;ONIBUS;False;False;True';

    const csvContent = BOM + headers + lineEnd + exemplo + lineEnd;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
                disabled={isProcessing || previewData.some(r => r.status === 'error')}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                ) : (
                  <>Confirmar Importação <ArrowRight className="w-4 h-4" /></>
                )}
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

      {progress && progress.status === 'processando' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-bold text-gray-900 dark:text-white">
                Importando dados...
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {progress.processados} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((progress.processados / progress.total) * 100)}%` }}
            />
          </div>
          <div className="flex gap-6 text-xs text-gray-500">
            <span className="text-green-600 font-bold">{progress.importados} importados</span>
            {progress.erros > 0 && <span className="text-red-500 font-bold">{progress.erros} erros</span>}
            {(progress as any).predicoes > 0 && <span className="text-indigo-500 font-bold">{(progress as any).predicoes} predicoes</span>}
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

    </div>
  );
}
