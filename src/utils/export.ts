/**
 * Utilitários de Exportação
 * SAPEE DEWAS - Sistema de Exportação
 * 
 * Nota: Este módulo usa apenas APIs nativas do navegador
 * para evitar dependências externas.
 */

/**
 * Exportar dados para CSV
 */
export const exportToCSV = (data: any[], filename: string, headers?: Record<string, string>) => {
  if (!data || data.length === 0) {
    console.error('Nenhum dado para exportar');
    return;
  }

  // Se não tiver headers, usa as chaves do primeiro objeto
  const fieldNames = headers 
    ? Object.keys(headers)
    : Object.keys(data[0]);

  const fieldLabels = headers 
    ? headers
    : Object.fromEntries(fieldNames.map(key => [key, key]));

  // Criar cabeçalho CSV
  const csvHeaders = fieldNames.map(key => fieldLabels[key]).join(',');

  // Criar linhas CSV
  const csvRows = data.map(row => {
    return fieldNames.map(fieldName => {
      const value = row[fieldName];
      // Escapar vírgulas e aspas
      const escaped = String(value ?? '').replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  // Juntar tudo
  const csvContent = [csvHeaders, ...csvRows].join('\n');

  // Criar blob e download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  return true;
};

/**
 * Exportar dados para Excel (XLSX) - Versão simplificada
 * Cria um arquivo HTML que o Excel consegue abrir
 */
export const exportToExcel = (data: any[], filename: string, sheetName?: string) => {
  if (!data || data.length === 0) {
    console.error('Nenhum dado para exportar');
    return;
  }

  // Obter colunas
  const columns = Object.keys(data[0]);
  
  // Criar tabela HTML
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
</head>
<body>
  <table border="1">
    <thead>
      <tr style="background-color: #4CAF50; color: white;">
        ${columns.map(col => `<th>${col}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${columns.map(col => `<td>${row[col] ?? ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`.trim();

  // Criar blob e download
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  
  return true;
};

/**
 * Exportar relatório para PDF usando impressão do navegador
 */
export const exportReportToPDF = (options: {
  title: string;
  subtitle?: string;
  headers: string[];
  data: any[][];
  filename: string;
  stats?: Array<{ label: string; value: string | number }>;
}) => {
  const { title, subtitle, headers, data, filename, stats } = options;

  // Criar janela de impressão
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Não foi possível abrir janela de impressão');
    return false;
  }

  // Montar HTML do relatório
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8">
  <style>
    @media print {
      body { 
        print-color-adjust: exact; 
        -webkit-print-color-adjust: exact;
        font-family: Arial, sans-serif;
      }
      @page { margin: 20mm; }
    }
    body { 
      font-family: Arial, sans-serif; 
      padding: 40px;
      color: #333;
    }
    .header {
      margin-bottom: 30px;
      border-bottom: 3px solid #2980B9;
      padding-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #2980B9;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #7F8C8D;
    }
    .meta {
      font-size: 11px;
      color: #95A5A6;
      margin-top: 10px;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin: 30px 0;
      flex-wrap: wrap;
    }
    .stat-box {
      background: #2980B9;
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      min-width: 120px;
    }
    .stat-label {
      font-size: 11px;
      opacity: 0.9;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
      font-size: 12px;
    }
    th {
      background-color: #2980B9;
      color: white;
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #F8F9FA;
    }
    tr:hover {
      background-color: #E8F4F8;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #95A5A6;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${title}</div>
    ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    <div class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
  </div>
  
  ${stats && stats.length > 0 ? `
  <div class="stats">
    ${stats.map(stat => `
      <div class="stat-box">
        <div class="stat-label">${stat.label}</div>
        <div class="stat-value">${stat.value}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(row => `
        <tr>
          ${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    SAPEE DEWAS - Sistema de Alerta de Predição de Evasão Escolar<br>
    Página 1 de 1
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`.trim();

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  
  return true;
};

/**
 * Exportar gráfico para imagem (PNG)
 */
export const exportChartToImage = (chartElement: HTMLElement, filename: string) => {
  // Capturar o elemento do gráfico
  const canvas = chartElement.querySelector('canvas');
  if (!canvas) {
    console.error('Gráfico não encontrado');
    return false;
  }

  // Converter para imagem e download
  const image = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = image;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
  link.click();
  
  return true;
};

/**
 * Imprimir relatório (usa diálogo de impressão do navegador)
 */
export const printReport = (elementId: string, title: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Elemento não encontrado');
    return false;
  }

  // Criar janela de impressão
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Não foi possível abrir janela de impressão');
    return false;
  }

  // Copiar estilos
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules)
          .map(rule => rule.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  // Montar HTML
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          ${styles}
          @media print {
            body { 
              print-color-adjust: exact; 
              -webkit-print-color-adjust: exact; 
            }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
  
  return true;
};
