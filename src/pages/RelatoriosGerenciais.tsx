/**
 * Página de Relatórios Gerenciais - SAPEE DEWAS
 * 
 * Funcionalidades:
 * - Relatório de Alunos em Risco (Exportação Excel/PDF)
 * - Mapa de Calor de Risco por Zona Residencial (Gráfico + Exportação)
 * - Relatório de Eficácia de Intervenções
 */

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, Download, AlertTriangle, Map, BarChart3, TrendingUp, Activity, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';
import ResponsiveTable from '../components/ResponsiveTable';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

// --- Dependências externas (npm install xlsx jspdf jspdf-autotable) ---
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import jsPDF from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';

const CORES_ZONA: Record<string, string> = {
    'Norte': '#EF4444',
    'Sul': '#3B82F6',
    'Leste': '#10B981',
    'Oeste': '#F59E0B',
    'Centro': '#8B5CF6',
    'Não informada': '#9CA3AF',
};

export default function RelatoriosGerenciais() {
    const { token } = useAuth();
    const { addToast } = useToast();

    const [abaAtiva, setAbaAtiva] = useState<'risco' | 'mapa' | 'eficacia'>('risco');
    
    // Estados de Dados
    const [alunosRisco, setAlunosRisco] = useState<any[]>([]);
    const [mapaCalor, setMapaCalor] = useState<any[]>([]);
    const [eficacia, setEficacia] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [filtroNivel, setFiltroNivel] = useState<string>('ALTO'); // ALTO, MUITO_ALTO, TODOS

    useEffect(() => {
        carregarDados();
    }, [filtroNivel]);

    const carregarDados = async () => {
        if (!token) return;
        setLoading(true);
        try {
            // 1. Alunos em Risco
            const risco = await api.relatorios.getAlunosRisco(token, filtroNivel);
            setAlunosRisco(risco);

            // 2. Mapa de Calor
            const mapa = await api.relatorios.getMapaCalor(token);
            setMapaCalor(mapa);

            // 3. Eficácia
            const efic = await api.relatorios.getEficacia(token);
            setEficacia(efic);
        } catch (error: any) {
            addToast({ type: 'error', title: 'Erro', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    // --- Funções de Exportação ---

    const exportarAlunosRiscoExcel = () => {
        const dadosFormatados = alunosRisco.map(a => ({
            Matrícula: a.matricula,
            Nome: a.nome,
            Curso: a.curso,
            Turno: a.turno,
            "Nível de Risco": a.nivel_risco,
            "Score": a.score_risco + '%',
            "Fatores": a.fatores,
            "Data Predição": new Date(a.ultima_predicao).toLocaleDateString('pt-BR')
        }));

        const ws = XLSX.utils.json_to_sheet(dadosFormatados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alunos em Risco");
        XLSX.writeFile(wb, `Relatorio_Alunos_Risco_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast({ type: 'success', title: 'Sucesso', message: 'Excel gerado com sucesso' });
    };

    const exportarAlunosRiscoPDF = () => {
        const doc = new jsPDF();
        doc.text("Relatório de Alunos em Risco - SAPEE DEWAS", 14, 15);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | Filtro: ${filtroNivel}`, 14, 22);

        const colunas = ["Nome", "Matrícula", "Curso", "Risco", "Score", "Fatores"];
        const dados = alunosRisco.map(a => [
            a.nome,
            a.matricula,
            a.curso,
            a.nivel_risco,
            a.score_risco + '%',
            a.fatores ? (a.fatores.length > 40 ? a.fatores.substring(0, 40) + '...' : a.fatores) : '-'
        ]);

        // @ts-ignore
        doc.autoTable({
            head: [colunas],
            body: dados,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [239, 68, 68] } // Vermelho
        });
        doc.save(`Relatorio_Alunos_Risco_${new Date().toISOString().split('T')[0]}.pdf`);
        addToast({ type: 'success', title: 'Sucesso', message: 'PDF gerado com sucesso' });
    };

    const exportarMapaExcel = () => {
        const dadosFormatados = mapaCalor.map(m => ({
            Zona: m.zona,
            "Total Alunos em Risco": m.total_alunos,
            "Média de Risco (%)": m.media_risco + '%'
        }));

        const ws = XLSX.utils.json_to_sheet(dadosFormatados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mapa de Calor");
        XLSX.writeFile(wb, `Relatorio_Mapa_Calor_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast({ type: 'success', title: 'Sucesso', message: 'Excel gerado com sucesso' });
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" />
                        Relatórios Gerenciais
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Análise de dados para tomada de decisão estratégica
                    </p>
                </div>
            </div>

            {/* Seletor de Abas */}
            <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto pb-1">
                <button
                    onClick={() => setAbaAtiva('risco')}
                    className={cn(
                        "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap",
                        abaAtiva === 'risco'
                            ? "border-red-600 text-red-600 dark:text-red-400"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <AlertTriangle className="w-4 h-4 inline mr-2" /> Alunos em Risco
                </button>
                <button
                    onClick={() => setAbaAtiva('mapa')}
                    className={cn(
                        "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap",
                        abaAtiva === 'mapa'
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <Map className="w-4 h-4 inline mr-2" /> Mapa de Calor (Zonas)
                </button>
                <button
                    onClick={() => setAbaAtiva('eficacia')}
                    className={cn(
                        "px-4 py-3 font-bold text-sm transition-all border-b-2 -mb-[2px] whitespace-nowrap",
                        abaAtiva === 'eficacia'
                            ? "border-green-600 text-green-600 dark:text-green-400"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <TrendingUp className="w-4 h-4 inline mr-2" /> Eficácia Intervenções
                </button>
            </div>

            {/* Conteúdo das Abas */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    
                    {/* ABA ALUNOS EM RISCO */}
                    {abaAtiva === 'risco' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    Lista de Alunos ({alunosRisco.length})
                                </h3>
                                <div className="flex gap-2">
                                    <select 
                                        value={filtroNivel} 
                                        onChange={(e) => setFiltroNivel(e.target.value)}
                                        className="px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm min-h-[44px]"
                                    >
                                        <option value="ALTO">Risco ALTO</option>
                                        <option value="MUITO_ALTO">Risco MUITO ALTO</option>
                                        <option value="TODOS">Todos</option>
                                    </select>
                                    <button onClick={exportarAlunosRiscoExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 min-h-[44px]">
                                        <FileSpreadsheet className="w-4 h-4" /> Excel
                                    </button>
                                    <button onClick={exportarAlunosRiscoPDF} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 min-h-[44px]">
                                        <FileText className="w-4 h-4" /> PDF
                                    </button>
                                </div>
                            </div>

                            <ResponsiveTable
                                data={alunosRisco}
                                keyExtractor={(a, i) => `${i}-${a.matricula || a.id}`}
                                emptyMessage="Nenhum aluno encontrado com este filtro."
                                columns={[
                                    {
                                        header: "Aluno",
                                        render: (a) => (
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{a.nome}</div>
                                                <div className="text-xs text-gray-500">{a.matricula}</div>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Curso",
                                        render: (a) => (
                                            <span className="text-sm">{a.curso}</span>
                                        )
                                    },
                                    {
                                        header: "Score",
                                        className: "text-center",
                                        render: (a) => (
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-bold",
                                                a.score_risco >= 85 ? "bg-red-100 text-red-800" :
                                                a.score_risco >= 60 ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"
                                            )}>
                                                {a.score_risco}%
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Fatores",
                                        render: (a) => (
                                            <span className="text-xs text-gray-500 line-clamp-2">{a.fatores || '-'}</span>
                                        )
                                    }
                                ]}
                            />
                        </div>
                    )}

                    {/* ABA MAPA DE CALOR */}
                    {abaAtiva === 'mapa' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Map className="w-5 h-5 text-blue-600" />
                                    Risco Médio por Zona Residencial
                                </h3>
                                <button onClick={exportarMapaExcel} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">
                                    <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Gráfico */}
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-slate-800">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-2 md:mb-4">Média de Risco (%)</h4>
                                    <div className="h-48 md:h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={mapaCalor}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                                                <XAxis dataKey="zona" stroke="#9CA3AF" />
                                                <YAxis stroke="#9CA3AF" />
                                                <Tooltip />
                                                <Bar dataKey="media_risco" radius={[4, 4, 0, 0]}>
                                                    {mapaCalor.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={CORES_ZONA[entry.zona] || '#6B7280'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Tabela Resumo */}
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-4">Resumo por Zona</h4>
                                    <div className="space-y-3">
                                        {mapaCalor.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES_ZONA[m.zona] || '#6B7280' }}></div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{m.zona}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-bold text-gray-900 dark:text-white">{m.media_risco}% Risco</div>
                                                    <div className="text-[10px] text-gray-500">{m.total_alunos} alunos</div>
                                                </div>
                                            </div>
                                        ))}
                                        {mapaCalor.length === 0 && <p className="text-xs text-gray-500 text-center">Sem dados de localização.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ABA EFICÁCIA */}
                    {abaAtiva === 'eficacia' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800">
                                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-green-600" />
                                    Análise de Intervenções Realizadas
                                </h3>
                            </div>

                            <ResponsiveTable
                                data={eficacia}
                                keyExtractor={(e, i) => e.id_intervencao.toString()}
                                emptyMessage="Nenhuma intervenção registrada."
                                columns={[
                                    {
                                        header: "Aluno",
                                        render: (e) => (
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{e.aluno}</div>
                                                <div className="text-xs text-gray-500">{e.matricula}</div>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Tipo",
                                        render: (e) => <span className="text-sm">{e.tipo_intervencao}</span>
                                    },
                                    {
                                        header: "Status",
                                        render: (e) => (
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                {e.status}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Risco Atual",
                                        className: "text-center",
                                        render: (e) => (
                                            e.risco_atual !== null ? (
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    e.risco_atual >= 80 ? "text-red-600" :
                                                    e.risco_atual >= 50 ? "text-orange-600" : "text-green-600"
                                                )}>
                                                    {e.risco_atual}%
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">N/A</span>
                                            )
                                        )
                                    }
                                ]}
                            />
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
