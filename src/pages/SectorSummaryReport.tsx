import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SystemFilter } from "@/components/SystemFilter";
import { usePagination } from "@/hooks/usePagination";
import { VirtualizedList } from "@/components/VirtualizedList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Printer, ArrowLeft, Building2, Users, MessageSquare, Zap, DollarSign } from "lucide-react";
import * as XLSX from 'xlsx';
import { ConversationCost } from "@/types/conversation";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "./LoginPage";
import { usePricingWebhooks } from "@/hooks/usePricingWebhooks";
import { useWebhookData } from "@/hooks/useWebhookData";

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

const SectorSummaryReport = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { conversations?: ConversationCost[] } };
  const { isAuthenticated } = useAuth();
  const { pricingConfigs, datedPricingConfigs } = usePricingWebhooks();
  const { conversationCosts, loading, error } = useWebhookData(pricingConfigs, datedPricingConfigs);
  
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [pageSize, setPageSizeState] = useState(50);
  const [useVirtualization, setUseVirtualization] = useState(false);

  if (!isAuthenticated) return <LoginPage />;

  const dataSource: ConversationCost[] = (location.state?.conversations && location.state.conversations.length > 0)
    ? location.state.conversations
    : (conversationCosts || []);

  // Aplicar filtro de sistema
  const filteredDataSource = useMemo(() => {
    if (systemFilter === "all") return dataSource;
    return dataSource.filter(conv => conv.sistema === systemFilter);
  }, [dataSource, systemFilter]);

  // Extrair sistemas disponíveis
  const availableSystems = useMemo(() => {
    return [...new Set(dataSource.map(conv => conv.sistema))].filter(Boolean).sort();
  }, [dataSource]);

  const { sectorData, totals, usersFlat, monthlyOverall, monthlyBySector, monthsOrder } = useMemo(() => {
    const sectors: Record<string, SectorData> = {};
    const userKey = (c: ConversationCost) => (c.email || c.username || '').toLowerCase();
    const uniqueUsers = new Set<string>();

    let total_conversas = 0;
    let total_tokens = 0;
    let custo_total = 0;

    // Helpers de mês
    const getMonthKey = (dateStr?: string): string => {
      if (!dateStr) return 'unknown';
      // Possíveis formatos: YYYY-MM-DD ou DD/MM/YYYY
      if (dateStr.includes('-')) {
        const [y, m] = dateStr.split('-');
        if (y && m) return `${y}-${m.padStart(2, '0')}`;
      }
      if (dateStr.includes('/')) {
        const [dd, mm, yyyy] = dateStr.split('/');
        if (yyyy && mm) return `${yyyy}-${mm.padStart(2, '0')}`;
      }
      return 'unknown';
    };

    const monthlyOverall: Record<string, { conversas: number; tokens: number; custo: number }> = {};
    const monthlyBySector: Record<string, Record<string, { conversas: number; tokens: number; custo: number }>> = {};

    (filteredDataSource || []).forEach((conv) => {
      total_conversas += 1;
      total_tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      custo_total += (conv.custo_total || 0);
      if (userKey(conv)) uniqueUsers.add(userKey(conv));

      const setor = conv.setor || 'Sem Setor';
      if (!sectors[setor]) {
        sectors[setor] = {
          setor,
          usuarios: [],
          resumo: {
            total_conversas: 0,
            total_tokens: 0,
            custo_total: 0,
            usuarios_unicos: 0,
          },
        };
      }

      const s = sectors[setor];
      s.resumo.total_conversas += 1;
      s.resumo.total_tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      s.resumo.custo_total += (conv.custo_total || 0);

      // Agregação mensal (geral e por setor)
      const mk = getMonthKey(conv.data);
      if (!monthlyOverall[mk]) monthlyOverall[mk] = { conversas: 0, tokens: 0, custo: 0 };
      monthlyOverall[mk].conversas += 1;
      monthlyOverall[mk].tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      monthlyOverall[mk].custo += (conv.custo_total || 0);

      if (!monthlyBySector[setor]) monthlyBySector[setor] = {};
      if (!monthlyBySector[setor][mk]) monthlyBySector[setor][mk] = { conversas: 0, tokens: 0, custo: 0 };
      monthlyBySector[setor][mk].conversas += 1;
      monthlyBySector[setor][mk].tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      monthlyBySector[setor][mk].custo += (conv.custo_total || 0);

      let usuario = s.usuarios.find((u) => u.username === conv.username);
      if (!usuario) {
        usuario = {
          username: conv.username || '—',
          email: conv.email || '—',
          conversas: 0,
          tokens_total: 0,
          custo_total: 0,
        };
        s.usuarios.push(usuario);
        s.resumo.usuarios_unicos += 1;
      }
      usuario.conversas += 1;
      usuario.tokens_total += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      usuario.custo_total += (conv.custo_total || 0);
    });

    const sectorData = Object.values(sectors).sort((a, b) => b.resumo.custo_total - a.resumo.custo_total);

    const usersFlat = sectorData
      .flatMap((s) => s.usuarios.map((u) => ({ setor: s.setor, ...u })))
      .sort((a, b) => b.custo_total - a.custo_total);

    // Ordenação cronológica dos meses (ignora 'unknown')
    const monthsOrder = Object.keys(monthlyOverall)
      .filter((k) => k !== 'unknown')
      .sort();

    return {
      sectorData,
      usersFlat,
      totals: {
        total_setores: sectorData.length,
        usuarios_unicos: uniqueUsers.size,
        total_conversas,
        total_tokens,
        custo_total,
      },
      monthlyOverall,
      monthlyBySector,
      monthsOrder,
    };
  }, [filteredDataSource]);

  // Decidir automaticamente usar virtualização baseado no tamanho dos dados
  const shouldUseVirtualization = filteredDataSource.length > 1000;

  // Paginação para tabelas grandes
  const usersPagination = usePagination({
    data: usersFlat,
    pageSize,
    initialPage: 1
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 6, maximumFractionDigits: 8 }).format(value || 0);

  const formatMonthLabel = (mk: string) => {
    if (!mk || mk === 'unknown') return mk || '';
    const [y, m] = mk.split('-');
    if (y && m) return `${m}/${y}`;
    return mk;
  };

  const exportExcelConsolidado = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumo por Setor
    const setoresSheetData = [
      ['Setor', 'Usuários Únicos', 'Conversas', 'Tokens', 'Custo Total (USD)'],
      ...sectorData.map((s) => [
        s.setor,
        s.resumo.usuarios_unicos,
        s.resumo.total_conversas,
        s.resumo.total_tokens,
        Number(s.resumo.custo_total.toFixed(8)),
      ]),
    ];
    const wsSetores = XLSX.utils.aoa_to_sheet(setoresSheetData);
    wsSetores['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSetores, 'Resumo Setores');

    // Sheet 2: Usuários por Setor
    const usersSheetData = [
      ['Setor', 'Usuário', 'Email', 'Conversas', 'Tokens', 'Custo Total (USD)', 'Custo/Conversa (USD)'],
      ...usersFlat.map((u) => [
        u.setor,
        u.username,
        u.email,
        u.conversas,
        u.tokens_total,
        Number(u.custo_total.toFixed(8)),
        Number((u.custo_total / Math.max(1, u.conversas)).toFixed(8)),
      ]),
    ];
    const wsUsers = XLSX.utils.aoa_to_sheet(usersSheetData);
    wsUsers['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Usuários por Setor');

    // Sheet 3: Mensal (Geral)
    const mensalGeralData: (string | number)[][] = [
      ['Mês', 'Conversas', 'Tokens', 'Custo Total (USD)'],
      ...monthsOrder.map((mk) => [
        mk,
        monthlyOverall[mk]?.conversas || 0,
        monthlyOverall[mk]?.tokens || 0,
        Number((monthlyOverall[mk]?.custo || 0).toFixed(8)),
      ]),
    ];
    const wsMensalGeral = XLSX.utils.aoa_to_sheet(mensalGeralData);
    wsMensalGeral['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsMensalGeral, 'Mensal Geral');

    // Sheet 4: Mensal por Setor
    const mensalPorSetorData: (string | number)[][] = [
      ['Setor', 'Mês', 'Conversas', 'Tokens', 'Custo Total (USD)'],
    ];
    Object.keys(monthlyBySector)
      .sort()
      .forEach((setor) => {
        monthsOrder.forEach((mk) => {
          const v = monthlyBySector[setor][mk] || { conversas: 0, tokens: 0, custo: 0 };
          mensalPorSetorData.push([
            setor,
            mk,
            v.conversas,
            v.tokens,
            Number((v.custo || 0).toFixed(8)),
          ]);
        });
      });
    const wsMensalSetor = XLSX.utils.aoa_to_sheet(mensalPorSetorData);
    wsMensalSetor['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsMensalSetor, 'Mensal por Setor');

    // Metadata sheet (opcional)
    const meta = [
      ['Relatório Consolidado de Setores'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Total de Setores', totals.total_setores],
      ['Usuários Únicos', totals.usuarios_unicos],
      ['Total de Conversas', totals.total_conversas],
      ['Total de Tokens', totals.total_tokens],
      ['Custo Total (USD)', Number((totals.custo_total || 0).toFixed(8))],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(meta);
    wsMeta['!cols'] = [{ wch: 28 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Resumo Geral');

    XLSX.writeFile(wb, `relatorio_consolidado_setores.xlsx`);
  };

  const printPage = () => window.print();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatório Consolidado de Setores</h1>
            <p className="text-muted-foreground">Resumo de setores, pessoas e gastos para a controladoria</p>
            <p className="text-xs text-muted-foreground mt-1">
              Atualizado em {new Date().toLocaleString('pt-BR')} • 
              Sistema: {systemFilter === "all" ? "Todos" : systemFilter} • 
              {filteredDataSource.length.toLocaleString()} registros
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button variant="outline" onClick={printPage}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={exportExcelConsolidado} disabled={loading || (sectorData?.length ?? 0) === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filtros e Controles de Performance */}
        <div className="print:hidden space-y-4">
          <SystemFilter 
            systems={availableSystems} 
            selectedSystem={systemFilter} 
            onSystemChange={setSystemFilter} 
          />
          
          {/* Controles de Performance */}
          {filteredDataSource.length > 100 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">⚡ Controles de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span>Itens por página:</span>
                    <Select value={pageSize.toString()} onValueChange={(value) => setPageSizeState(Number(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="250">250</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {shouldUseVirtualization && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <span>🚀 Virtualização ativa para {filteredDataSource.length.toLocaleString()} registros</span>
                    </div>
                  )}
                  
                  <div className="text-muted-foreground">
                    Performance: {filteredDataSource.length < 1000 ? '🟢 Ótima' : 
                                 filteredDataSource.length < 10000 ? '🟡 Boa' : '🔴 Use filtros'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive">Erro ao carregar dados: {error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Setores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.total_setores.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" /> Usuários Únicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.usuarios_unicos.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Conversas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.total_conversas.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" /> Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totals.total_tokens.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Custo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.custo_total)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Setor</th>
                    <th className="py-2 pr-3">Usuários</th>
                    <th className="py-2 pr-3">Conversas</th>
                    <th className="py-2 pr-3">Tokens</th>
                    <th className="py-2 pr-3">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                    </tr>
                  )}
                  {sectorData.map((s) => (
                    <tr key={s.setor} className="border-t">
                      <td className="py-2 pr-3 font-medium">{s.setor}</td>
                      <td className="py-2 pr-3">{s.resumo.usuarios_unicos.toLocaleString()}</td>
                      <td className="py-2 pr-3">{s.resumo.total_conversas.toLocaleString()}</td>
                      <td className="py-2 pr-3">{s.resumo.total_tokens.toLocaleString()}</td>
                      <td className="py-2 pr-3 font-mono">{formatCurrency(s.resumo.custo_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Blocos por mês: Resumo por Setor (Todos os setores) */}
        {monthsOrder.map((mk) => {
          // Monta linhas por setor para este mês, incluindo setores sem movimento
          const setores = Array.from(new Set([
            ...sectorData.map((s) => s.setor),
            ...Object.keys(monthlyBySector),
          ])).sort();
          const rows = setores.map((setor) => {
            const v = monthlyBySector[setor][mk] || { conversas: 0, tokens: 0, custo: 0 };
            return { setor, ...v };
          }).sort((a, b) => b.custo - a.custo);

          return (
            <Card key={`mes-${mk}`}>
              <CardHeader>
                <div>
                  <CardTitle>Resumo por Setor — Mês {formatMonthLabel(mk)}</CardTitle>
                  <p className="text-sm text-muted-foreground">Todos os setores</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3">Setor</th>
                        <th className="py-2 pr-3">Conversas</th>
                        <th className="py-2 pr-3">Tokens</th>
                        <th className="py-2 pr-3">Custo Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                        </tr>
                      )}
                      {rows.map((r) => (
                        <tr key={`${mk}-${r.setor}`} className="border-t">
                          <td className="py-2 pr-3">{r.setor}</td>
                          <td className="py-2 pr-3">{r.conversas.toLocaleString()}</td>
                          <td className="py-2 pr-3">{r.tokens.toLocaleString()}</td>
                          <td className="py-2 pr-3 font-mono">{formatCurrency(r.custo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal (Geral)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Mês</th>
                    <th className="py-2 pr-3">Conversas</th>
                    <th className="py-2 pr-3">Tokens</th>
                    <th className="py-2 pr-3">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthsOrder.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                    </tr>
                  )}
                  {monthsOrder.map((mk) => (
                    <tr key={mk} className="border-t">
                      <td className="py-2 pr-3">{mk}</td>
                      <td className="py-2 pr-3">{(monthlyOverall[mk]?.conversas || 0).toLocaleString()}</td>
                      <td className="py-2 pr-3">{(monthlyOverall[mk]?.tokens || 0).toLocaleString()}</td>
                      <td className="py-2 pr-3 font-mono">{formatCurrency(monthlyOverall[mk]?.custo || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-3">Setor</th>
                    <th className="py-2 pr-3">Mês</th>
                    <th className="py-2 pr-3">Conversas</th>
                    <th className="py-2 pr-3">Tokens</th>
                    <th className="py-2 pr-3">Custo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(monthlyBySector).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                    </tr>
                  )}
                  {Object.keys(monthlyBySector).sort().map((setor) => (
                    monthsOrder.map((mk) => {
                      const v = monthlyBySector[setor][mk] || { conversas: 0, tokens: 0, custo: 0 };
                      return (
                        <tr key={`${setor}-${mk}`} className="border-t">
                          <td className="py-2 pr-3">{setor}</td>
                          <td className="py-2 pr-3">{mk}</td>
                          <td className="py-2 pr-3">{v.conversas.toLocaleString()}</td>
                          <td className="py-2 pr-3">{v.tokens.toLocaleString()}</td>
                          <td className="py-2 pr-3 font-mono">{formatCurrency(v.custo)}</td>
                        </tr>
                      );
                    })
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Usuários por Setor - Com Paginação/Virtualização */}
        {shouldUseVirtualization ? (
          <VirtualizedList
            items={usersFlat}
            itemHeight={60}
            containerHeight={400}
            title={`Usuários por Setor (${usersFlat.length.toLocaleString()} usuários)`}
            renderItem={(user, index) => (
              <div className="flex items-center p-4 hover:bg-muted/50">
                <div className="grid grid-cols-7 gap-4 w-full text-sm">
                  <div className="truncate">{user.setor}</div>
                  <div className="font-medium truncate">{user.username}</div>
                  <div className="text-muted-foreground truncate">{user.email}</div>
                  <div>{user.conversas.toLocaleString()}</div>
                  <div>{user.tokens_total.toLocaleString()}</div>
                  <div className="font-mono">{formatCurrency(user.custo_total)}</div>
                  <div className="font-mono">{formatCurrency(user.custo_total / Math.max(1, user.conversas))}</div>
                </div>
              </div>
            )}
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usuários por Setor</CardTitle>
                {usersFlat.length > pageSize && (
                  <div className="text-sm text-muted-foreground">
                    Página {usersPagination.currentPage} de {usersPagination.totalPages} • 
                    Exibindo {usersPagination.startIndex + 1}-{usersPagination.endIndex} de {usersFlat.length}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 pr-3">Setor</th>
                      <th className="py-2 pr-3">Usuário</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Conversas</th>
                      <th className="py-2 pr-3">Tokens</th>
                      <th className="py-2 pr-3">Custo Total</th>
                      <th className="py-2 pr-3">Custo/Conversa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersPagination.pageData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                      </tr>
                    )}
                    {usersPagination.pageData.map((u, idx) => (
                      <tr key={`${u.setor}-${u.username}-${idx}`} className="border-t">
                        <td className="py-2 pr-3">{u.setor}</td>
                        <td className="py-2 pr-3 font-medium">{u.username}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{u.email}</td>
                        <td className="py-2 pr-3">{u.conversas.toLocaleString()}</td>
                        <td className="py-2 pr-3">{u.tokens_total.toLocaleString()}</td>
                        <td className="py-2 pr-3 font-mono">{formatCurrency(u.custo_total)}</td>
                        <td className="py-2 pr-3 font-mono">{formatCurrency(u.custo_total / Math.max(1, u.conversas))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginação */}
              {usersPagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={usersPagination.previousPage}
                    disabled={!usersPagination.hasPreviousPage}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {usersPagination.currentPage} de {usersPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={usersPagination.nextPage}
                    disabled={!usersPagination.hasNextPage}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SectorSummaryReport;
