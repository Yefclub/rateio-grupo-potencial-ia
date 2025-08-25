import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, DollarSign, MessageSquare, Zap, List } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConversationCost } from "@/types/conversation";
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";

interface SectorReportProps {
  conversations: ConversationCost[];
  systemFilter?: string;
}

interface SectorData {
  setor: string;
  usuarios: {
    username: string;
    email: string;
    conversas: number;
    tokens_total: number;
    custo_total: number;
  }[];
  resumo: {
    total_conversas: number;
    total_tokens: number;
    custo_total: number;
    usuarios_unicos: number;
  };
}

export const SectorReport = ({ conversations, systemFilter = "all" }: SectorReportProps) => {
  const navigate = useNavigate();
  
  // Filtrar conversas por sistema
  const filteredConversations = useMemo(() => {
    if (systemFilter === "all") return conversations;
    return conversations.filter(conv => conv.sistema === systemFilter);
  }, [conversations, systemFilter]);

  const sectorData = useMemo(() => {
    const sectors: Record<string, SectorData> = {};

    filteredConversations.forEach(conv => {
      if (!conv.setor) return;

      if (!sectors[conv.setor]) {
        sectors[conv.setor] = {
          setor: conv.setor,
          usuarios: [],
          resumo: {
            total_conversas: 0,
            total_tokens: 0,
            custo_total: 0,
            usuarios_unicos: 0
          }
        };
      }

      const sector = sectors[conv.setor];

      // Atualizar resumo do setor
      sector.resumo.total_conversas++;
      sector.resumo.total_tokens += conv.tokens_entrada + conv.tokens_saida;
      sector.resumo.custo_total += conv.custo_total;

      // Encontrar ou criar usuário
      let usuario = sector.usuarios.find(u => u.username === conv.username);
      if (!usuario) {
        usuario = {
          username: conv.username,
          email: conv.email,
          conversas: 0,
          tokens_total: 0,
          custo_total: 0
        };
        sector.usuarios.push(usuario);
        sector.resumo.usuarios_unicos++;
      }

      // Atualizar dados do usuário
      usuario.conversas++;
      usuario.tokens_total += conv.tokens_entrada + conv.tokens_saida;
      usuario.custo_total += conv.custo_total;
    });

    return Object.values(sectors);
  }, [filteredConversations]);

  // Resumo compacto: apenas nome do setor e custo total, ordenado por maior gasto
  const sectorSummary = useMemo(() => {
    return sectorData
      .map(s => ({ setor: s.setor, custo: s.resumo.custo_total }))
      .sort((a, b) => b.custo - a.custo);
  }, [sectorData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 8
    }).format(value);
  };

  const generateDocument = (sector: SectorData) => {
    // Preparar dados para a planilha
    const worksheetData = [
      // Cabeçalho da planilha
      ['RELATÓRIO POR SETOR - ' + sector.setor],
      [''],
      ['RESUMO GERAL'],
      ['Total de Conversas', sector.resumo.total_conversas],
      ['Total de Tokens', sector.resumo.total_tokens],
      ['Custo Total (USD)', sector.resumo.custo_total.toFixed(8)],
      ['Usuários Únicos', sector.resumo.usuarios_unicos],
      [''],
      ['DETALHAMENTO POR USUÁRIO'],
      ['Nome de Usuário', 'Email', 'Conversas', 'Tokens Total', 'Custo Total (USD)', 'Custo por Conversa (USD)'],
      // Dados dos usuários
      ...sector.usuarios
        .sort((a, b) => b.custo_total - a.custo_total)
        .map(usuario => [
          usuario.username,
          usuario.email,
          usuario.conversas,
          usuario.tokens_total,
          usuario.custo_total.toFixed(8),
          (usuario.custo_total / usuario.conversas).toFixed(8)
        ]),
      [''],
      ['Relatório gerado em', new Date().toLocaleString('pt-BR')]
    ];

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Nome de Usuário
      { wch: 30 }, // Email
      { wch: 12 }, // Conversas
      { wch: 15 }, // Tokens Total
      { wch: 18 }, // Custo Total
      { wch: 20 }  // Custo por Conversa
    ];
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, sector.setor.substring(0, 31)); // Max 31 chars para nome da aba

    // Gerar e baixar o arquivo
    const fileName = `relatorio_setor_${sector.setor.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (sectorData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum setor encontrado nos dados de conversas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerar Relatórios dos Setores</h2>
          <p className="text-muted-foreground">
            Análise detalhada de custos e uso por setor organizacional
          </p>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {sectorData.map(sector => (
        <Card key={sector.setor}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {sector.setor}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateDocument(sector)}
              >
                <Download className="h-4 w-4 mr-2" />
                Gerar Documento
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumo do setor */}
            <div>
              <h4 className="font-semibold mb-3">Resumo do Setor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-medium">Usuários</span>
                  </div>
                  <p className="text-lg font-bold text-blue-800">
                    {sector.resumo.usuarios_unicos}
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Conversas</span>
                  </div>
                  <p className="text-lg font-bold text-green-800">
                    {sector.resumo.total_conversas.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">Tokens</span>
                  </div>
                  <p className="text-lg font-bold text-yellow-800">
                    {sector.resumo.total_tokens.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-medium">Custo</span>
                  </div>
                  <p className="text-lg font-bold text-red-800">
                    {formatCurrency(sector.resumo.custo_total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de usuários */}
            <div>
              <h4 className="font-semibold mb-3">Usuários do Setor</h4>
              <div className="space-y-3">
                {sector.usuarios
                  .sort((a, b) => b.custo_total - a.custo_total)
                  .map(usuario => (
                  <div key={usuario.username} className="bg-muted/50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Usuário</span>
                        <p className="font-medium">{usuario.username}</p>
                        <p className="text-sm text-muted-foreground">{usuario.email}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Conversas</span>
                        <p className="text-lg font-semibold">{usuario.conversas.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Tokens</span>
                        <p className="text-lg font-semibold">{usuario.tokens_total.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Custo Total</span>
                        <p className="text-lg font-semibold">{formatCurrency(usuario.custo_total)}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Custo/Conversa</span>
                        <p className="text-lg font-semibold">
                          {formatCurrency(usuario.custo_total / usuario.conversas)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};