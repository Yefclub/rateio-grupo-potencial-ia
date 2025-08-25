import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateFilter } from "@/components/DateFilter";
import { SystemFilter } from "@/components/SystemFilter";
import { DateFilterType, CustomDateRange } from "@/types/conversation";
import { Download, Building2, Users, MessageSquare, Zap, DollarSign, CalendarDays } from "lucide-react";
import * as XLSX from 'xlsx';
import { ConversationCost } from "@/types/conversation";
import { useDateFilteredConversations } from "@/hooks/useDateFilteredConversations";
import { getDateRangeFromFilter } from "@/lib/dateFilterUtils";
import { FilterInfoBar } from "@/components/FilterInfoBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface Props {
  conversations: ConversationCost[];
  allConversations?: ConversationCost[];
}

export const SectorSummaryTab = ({ conversations, allConversations }: Props) => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({});
  const [systemFilter, setSystemFilter] = useState<string>("all");

  // Aplica filtros de data
  const dateFilteredConversations = useDateFilteredConversations(conversations, dateFilter, customDateRange);

  // Intervalo de datas para exibir no Info Bar
  const dateRange = useMemo(() => getDateRangeFromFilter(dateFilter, customDateRange), [dateFilter, customDateRange]);

  // Aplica filtro de sistema
  const filteredDataSource = useMemo(() => {
    if (systemFilter === "all") return dateFilteredConversations;
    return dateFilteredConversations.filter(conv => conv.sistema === systemFilter);
  }, [dateFilteredConversations, systemFilter]);

  // Extrai sistemas disponíveis
  const availableSystems = useMemo(() => {
    return [...new Set(dateFilteredConversations.map(conv => conv.sistema))].filter(Boolean).sort();
  }, [dateFilteredConversations]);

  const { sectorData, totals, monthlyOverall, monthlyBySector, monthsOrder } = useMemo(() => {
    const sectors: Record<string, SectorData> = {};
    const userKey = (c: ConversationCost) => (c.email || c.username || '').toLowerCase();
    const uniqueUsers = new Set<string>();

    let total_conversas = 0;
    let total_tokens = 0;
    let custo_total = 0;

    // Helpers de mês
    const getMonthKey = (dateStr?: string): string => {
      if (!dateStr) return 'unknown';
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

      // Agregação mensal
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

    const monthsOrder = Object.keys(monthlyOverall)
      .filter((k) => k !== 'unknown')
      .sort();

    return {
      sectorData,
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

  // Agregação mensal independente dos filtros da aba, separado por sistema
  const { allMonthlyBySystem, allMonthsOrder, systemsList } = useMemo(() => {
    const getMonthKey = (dateStr?: string): string => {
      if (!dateStr) return 'unknown';
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

    const bySystem: Record<string, Record<string, { conversas: number; tokens: number; custo: number }>> = {};
    const overallMonths: Record<string, true> = {};
    const systems = new Set<string>();

    const source = (allConversations && allConversations.length > 0) ? allConversations : conversations;
    (source || []).forEach((conv) => {
      const sys = conv.sistema || 'Sem Sistema';
      systems.add(sys);
      const mk = getMonthKey(conv.data);
      overallMonths[mk] = true;
      if (!bySystem[sys]) bySystem[sys] = {};
      if (!bySystem[sys][mk]) bySystem[sys][mk] = { conversas: 0, tokens: 0, custo: 0 };
      bySystem[sys][mk].conversas += 1;
      bySystem[sys][mk].tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      bySystem[sys][mk].custo += (conv.custo_total || 0);
    });

    const allMonthsOrder = Object.keys(overallMonths)
      .filter((k) => k !== 'unknown')
      .sort();
    const systemsList = Array.from(systems).sort();

    return { allMonthlyBySystem: bySystem, allMonthsOrder, systemsList };
  }, [conversations, allConversations]);

  const { usersBySystem, systemOrder, systemTotals } = useMemo(() => {
    const bySystem: Record<string, Record<string, { username: string; email: string; conversas: number; tokens: number; custo: number }>> = {};
    const totals: Record<string, number> = {};
    (filteredDataSource || []).forEach((conv) => {
      const sys = conv.sistema || 'Sem Sistema';
      if (!bySystem[sys]) bySystem[sys] = {};
      const key = (conv.email || conv.username || '—').toLowerCase();
      if (!bySystem[sys][key]) {
        bySystem[sys][key] = { username: conv.username || '—', email: conv.email || '—', conversas: 0, tokens: 0, custo: 0 };
      }
      const u = bySystem[sys][key];
      u.conversas += 1;
      u.tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      u.custo += (conv.custo_total || 0);
      totals[sys] = (totals[sys] || 0) + (conv.custo_total || 0);
    });
    const result: Record<string, { username: string; email: string; conversas: number; tokens: number; custo: number }[]> = {};
    Object.entries(bySystem).forEach(([sys, usersMap]) => {
      result[sys] = Object.values(usersMap).sort((a, b) => b.custo - a.custo);
    });
    const order = Object.keys(result).sort((a, b) => (totals[b] || 0) - (totals[a] || 0));
    return { usersBySystem: result, systemOrder: order, systemTotals: totals };
  }, [filteredDataSource]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', minimumFractionDigits: 6, maximumFractionDigits: 8 }).format(value || 0);

  const formatMonthLabel = (mk: string) => {
    if (!mk || mk === 'unknown') return mk || '';
    const [y, m] = mk.split('-');
    if (y && m) return `${m}/${y}`;
    return mk;
  };

  // Estado para granularidade da nova aba
  const [userPeriodGranularity, setUserPeriodGranularity] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  // Helpers de data
  const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
      const [dd, mm, yyyyRaw] = dateStr.split('/');
      const yyyy = (yyyyRaw?.length === 2) ? Number(`20${yyyyRaw}`) : Number(yyyyRaw);
      const d = Number(dd);
      const m = Number(mm);
      if (Number.isFinite(d) && Number.isFinite(m) && Number.isFinite(yyyy)) {
        return new Date(yyyy, m - 1, d);
      }
    }
    if (dateStr.includes('-')) {
      // Espera YYYY-MM ou YYYY-MM-DD
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 2) return new Date(parts[0], parts[1] - 1, 1);
      if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return null;
  };

  const getPeriodKey = (dateStr: string | undefined, mode: 'daily' | 'monthly' | 'yearly'): string => {
    const d = parseDate(dateStr);
    if (!d) return 'unknown';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    if (mode === 'daily') return `${yyyy}-${mm}-${dd}`;
    if (mode === 'monthly') return `${yyyy}-${mm}`;
    return `${yyyy}`; // yearly
  };

  const formatPeriodLabel = (key: string, mode: 'daily' | 'monthly' | 'yearly') => {
    if (!key || key === 'unknown') return key || '';
    if (mode === 'daily') {
      const [y, m, d] = key.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return key;
    }
    if (mode === 'monthly') return formatMonthLabel(key);
    return key; // yearly já é YYYY
  };

  // Agregação por sistema -> período -> usuário
  const { usersBySystemPeriod, periodOrder } = useMemo(() => {
    const bySystem: Record<string, Record<string, Record<string, { username: string; email: string; conversas: number; tokens: number; custo: number }>>> = {};
    const allPeriods: Record<string, true> = {};
    (filteredDataSource || []).forEach((conv) => {
      const sys = conv.sistema || 'Sem Sistema';
      const pk = getPeriodKey(conv.data, userPeriodGranularity);
      allPeriods[pk] = true;
      if (!bySystem[sys]) bySystem[sys] = {};
      if (!bySystem[sys][pk]) bySystem[sys][pk] = {};
      const key = (conv.email || conv.username || '—').toLowerCase();
      if (!bySystem[sys][pk][key]) {
        bySystem[sys][pk][key] = { username: conv.username || '—', email: conv.email || '—', conversas: 0, tokens: 0, custo: 0 };
      }
      const u = bySystem[sys][pk][key];
      u.conversas += 1;
      u.tokens += (conv.tokens_entrada || 0) + (conv.tokens_saida || 0);
      u.custo += (conv.custo_total || 0);
    });
    const result: Record<string, Record<string, { username: string; email: string; conversas: number; tokens: number; custo: number }[]>> = {};
    Object.entries(bySystem).forEach(([sys, periodMap]) => {
      result[sys] = {};
      Object.entries(periodMap).forEach(([pk, usersMap]) => {
        result[sys][pk] = Object.values(usersMap).sort((a, b) => b.custo - a.custo);
      });
    });
    const order = Object.keys(allPeriods).filter((k) => k !== 'unknown').sort();
    return { usersBySystemPeriod: result, periodOrder: order };
  }, [filteredDataSource, userPeriodGranularity]);

  const exportExcelConsolidado = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 0: Resumo (metadados + totais)
    const periodoLabel = (dateRange.start && dateRange.end) ? `${dateRange.start} — ${dateRange.end}` : 'todos os registros';
    const sistemaLabel = systemFilter === 'all' ? 'Todos os sistemas' : systemFilter;
    const resumoSheetData: (string | number)[][] = [
      ['RELATÓRIO CONSOLIDADO DE SETORES'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Período', periodoLabel],
      ['Sistema (aplicado no Resumo por Setor)', sistemaLabel],
      ['Observação', 'Abas "Mensal - <sistema>" usam todos os registros (independente de período e sistema).'],
      [''],
      ['TOTAIS (Período/Sistema aplicados)'],
      ['Setores', totals.total_setores],
      ['Usuários Únicos', totals.usuarios_unicos],
      ['Conversas', totals.total_conversas],
      ['Tokens', totals.total_tokens],
      ['Custo Total (USD)', Number(totals.custo_total.toFixed(8))],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoSheetData);
    (wsResumo as any)['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    (wsResumo as any)['!cols'] = [{ wch: 40 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Sheet 1: Resumo por Setor (respeita período/sistema da aba)
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
    (wsSetores as any)['!cols'] = [
      { wch: 30 }, // Setor
      { wch: 18 }, // Usuários Únicos
      { wch: 14 }, // Conversas
      { wch: 14 }, // Tokens
      { wch: 20 }, // Custo Total
    ];
    (wsSetores as any)['!autofilter'] = { ref: `A1:E${setoresSheetData.length}` };
    XLSX.utils.book_append_sheet(wb, wsSetores, 'Resumo Setores');

    // Sheet 2..N: Mensal por Sistema (independente dos filtros)
    const headerMensal = ['Mês', 'Conversas', 'Tokens', 'Custo Total (USD)'];
    if (systemsList.length === 0) {
      const wsMensalEmpty = XLSX.utils.aoa_to_sheet([headerMensal, ['—', 0, 0, 0]]);
      XLSX.utils.book_append_sheet(wb, wsMensalEmpty, 'Mensal Geral');
    } else {
      systemsList.forEach((sys) => {
        const dataRows: (string | number)[][] = [headerMensal];
        if (allMonthsOrder.length === 0) {
          dataRows.push(['—', 0, 0, 0]);
        } else {
          allMonthsOrder.forEach((mk) => {
            dataRows.push([
              formatMonthLabel(mk),
              allMonthlyBySystem[sys]?.[mk]?.conversas || 0,
              allMonthlyBySystem[sys]?.[mk]?.tokens || 0,
              Number((allMonthlyBySystem[sys]?.[mk]?.custo || 0).toFixed(8)),
            ]);
          });
        }
        const ws = XLSX.utils.aoa_to_sheet(dataRows);
        (ws as any)['!cols'] = [
          { wch: 12 }, // Mês
          { wch: 14 }, // Conversas
          { wch: 14 }, // Tokens
          { wch: 20 }, // Custo Total
        ];
        (ws as any)['!autofilter'] = { ref: `A1:D${dataRows.length}` };
        const safeName = (`Mensal - ${sys}`).substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      });
    }

    // Sheet final: Mensal por Setor (período/sistema aplicados)
    const mensalSetorData: (string | number)[][] = [
      ['Setor', 'Mês', 'Conversas', 'Tokens', 'Custo Total (USD)'],
    ];
    if (sectorData.length === 0 || monthsOrder.length === 0) {
      mensalSetorData.push(['—', '—', 0, 0, 0]);
    } else {
      sectorData.forEach((s) => {
        monthsOrder.forEach((mk) => {
          const m = monthlyBySector[s.setor]?.[mk];
          mensalSetorData.push([
            s.setor,
            formatMonthLabel(mk),
            (m?.conversas || 0),
            (m?.tokens || 0),
            Number((m?.custo || 0).toFixed(8)),
          ]);
        });
      });
    }
    const wsMensalSetor = XLSX.utils.aoa_to_sheet(mensalSetorData);
    (wsMensalSetor as any)['!cols'] = [
      { wch: 30 }, // Setor
      { wch: 12 }, // Mês
      { wch: 14 }, // Conversas
      { wch: 14 }, // Tokens
      { wch: 20 }, // Custo Total
    ];
    (wsMensalSetor as any)['!autofilter'] = { ref: `A1:E${mensalSetorData.length}` };
    XLSX.utils.book_append_sheet(wb, wsMensalSetor, 'Mensal por Setor');

    // Gerar arquivo com timestamp
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    XLSX.writeFile(wb, `relatorio_consolidado_setores_${ts}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório Consolidado de Setores</h2>
          <p className="text-muted-foreground">Resumo de setores, pessoas e gastos para a controladoria</p>
        </div>
        <Button onClick={exportExcelConsolidado} disabled={sectorData.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Barra de informações do filtro (sistema + período) */}
      <FilterInfoBar 
        systemLabel={systemFilter === "all" ? "Todos os sistemas" : systemFilter}
        dateRange={dateRange}
      />

      {/* Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DateFilter 
          selectedFilter={dateFilter} 
          onFilterChange={setDateFilter}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
        />
        <SystemFilter 
          systems={availableSystems} 
          selectedSystem={systemFilter} 
          onSystemChange={setSystemFilter} 
        />
      </div>

      {/* Cards de resumo */}
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
              <Users className="h-4 w-4" /> Usuários
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

      {/* Abas de relatório detalhado */}
      <Tabs defaultValue="setores" className="w-full">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="setores">Resumo por Setor</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários por Sistema</TabsTrigger>
          <TabsTrigger value="usuarios-periodo">Usuários x Período</TabsTrigger>
        </TabsList>

        <TabsContent value="setores">
          {/* Resumo por Setor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Resumo por Setor</CardTitle>
                <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs sm:text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Período:</span>
                  {dateRange.start && dateRange.end ? (
                    <span className="font-medium">{dateRange.start} — {dateRange.end}</span>
                  ) : (
                    <span className="font-medium">todos os registros</span>
                  )}
                </div>
              </div>
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
                    {sectorData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                      </tr>
                    ) : (
                      sectorData.map((s) => (
                        <tr key={s.setor} className="border-t">
                          <td className="py-2 pr-3 font-medium">{s.setor}</td>
                          <td className="py-2 pr-3">{s.resumo.usuarios_unicos.toLocaleString()}</td>
                          <td className="py-2 pr-3">{s.resumo.total_conversas.toLocaleString()}</td>
                          <td className="py-2 pr-3">{s.resumo.total_tokens.toLocaleString()}</td>
                          <td className="py-2 pr-3 font-mono">{formatCurrency(s.resumo.custo_total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Mensal (Geral) – independente dos filtros da aba, separado por sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Mensal (Geral)</CardTitle>
              <p className="text-sm text-muted-foreground">Independente dos filtros. Mostra todos os meses disponíveis, separado por sistema.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {systemsList.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">Nenhum dado disponível</div>
              ) : (
                systemsList.map((sys) => (
                  <div key={sys}>
                    <h4 className="font-semibold mb-2">Sistema: {sys}</h4>
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
                          {allMonthsOrder.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhum dado disponível</td>
                            </tr>
                          ) : (
                            allMonthsOrder.map((mk) => (
                              <tr key={`${sys}-${mk}`} className="border-t">
                                <td className="py-2 pr-3">{formatMonthLabel(mk)}</td>
                                <td className="py-2 pr-3">{(allMonthlyBySystem[sys]?.[mk]?.conversas || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3">{(allMonthlyBySystem[sys]?.[mk]?.tokens || 0).toLocaleString()}</td>
                                <td className="py-2 pr-3 font-mono">{formatCurrency(allMonthlyBySystem[sys]?.[mk]?.custo || 0)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader>
              <CardTitle>Usuários por Sistema</CardTitle>
              <p className="text-sm text-muted-foreground">Respeita os filtros de período e sistema aplicados acima.</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {systemOrder.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">Nenhum dado disponível</div>
              ) : (
                systemOrder.map((sys) => (
                  <div key={sys}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Sistema: {sys}</h4>
                      <span className="text-sm text-muted-foreground">Total do Sistema: <span className="font-medium">{formatCurrency(systemTotals[sys] || 0)}</span></span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-3">Usuário</th>
                            <th className="py-2 pr-3">E-mail</th>
                            <th className="py-2 pr-3">Conversas</th>
                            <th className="py-2 pr-3">Tokens</th>
                            <th className="py-2 pr-3">Custo Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(usersBySystem[sys] || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum usuário</td>
                            </tr>
                          ) : (
                            usersBySystem[sys].map((u, idx) => (
                              <tr key={`${sys}-u-${idx}`} className="border-t">
                                <td className="py-2 pr-3">{u.username}</td>
                                <td className="py-2 pr-3">{u.email}</td>
                                <td className="py-2 pr-3">{u.conversas.toLocaleString()}</td>
                                <td className="py-2 pr-3">{u.tokens.toLocaleString()}</td>
                                <td className="py-2 pr-3 font-mono">{formatCurrency(u.custo)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios-periodo">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Usuários por Sistema x Período</CardTitle>
                  <p className="text-sm text-muted-foreground">Respeita os filtros de período e sistema aplicados acima.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Granularidade:</span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={userPeriodGranularity === 'daily' ? 'default' : 'outline'} onClick={() => setUserPeriodGranularity('daily')}>Diário</Button>
                    <Button size="sm" variant={userPeriodGranularity === 'monthly' ? 'default' : 'outline'} onClick={() => setUserPeriodGranularity('monthly')}>Mensal</Button>
                    <Button size="sm" variant={userPeriodGranularity === 'yearly' ? 'default' : 'outline'} onClick={() => setUserPeriodGranularity('yearly')}>Anual</Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              {Object.keys(usersBySystemPeriod).length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">Nenhum dado disponível</div>
              ) : (
                Object.keys(usersBySystemPeriod)
                  .sort((a, b) => (systemTotals[b] || 0) - (systemTotals[a] || 0))
                  .map((sys) => (
                  <div key={sys}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Sistema: {sys}</h4>
                      <span className="text-sm text-muted-foreground">Total do Sistema: <span className="font-medium">{formatCurrency(systemTotals[sys] || 0)}</span></span>
                    </div>
                    {periodOrder.filter((pk) => (usersBySystemPeriod[sys]?.[pk]?.length || 0) > 0).length === 0 ? (
                      <div className="py-3 text-sm text-muted-foreground">Nenhum dado para o período selecionado</div>
                    ) : (
                      periodOrder.map((pk) => (
                        (usersBySystemPeriod[sys]?.[pk]?.length || 0) > 0 ? (
                          <div key={`${sys}-${pk}`} className="mb-6">
                            <h5 className="font-medium mb-2">Período: {formatPeriodLabel(pk, userPeriodGranularity)}</h5>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="py-2 pr-3">Usuário</th>
                                    <th className="py-2 pr-3">E-mail</th>
                                    <th className="py-2 pr-3">Conversas</th>
                                    <th className="py-2 pr-3">Tokens</th>
                                    <th className="py-2 pr-3">Custo Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {usersBySystemPeriod[sys][pk].map((u, idx) => (
                                    <tr key={`${sys}-${pk}-u-${idx}`} className="border-t">
                                      <td className="py-2 pr-3">{u.username}</td>
                                      <td className="py-2 pr-3">{u.email}</td>
                                      <td className="py-2 pr-3">{u.conversas.toLocaleString()}</td>
                                      <td className="py-2 pr-3">{u.tokens.toLocaleString()}</td>
                                      <td className="py-2 pr-3 font-mono">{formatCurrency(u.custo)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null
                      ))
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
