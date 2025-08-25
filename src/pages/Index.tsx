import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Settings, BarChart3, Users, Building, LogOut, Search, MessageSquare } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { PricingManager } from "@/components/PricingManager";
import { ConversationGroup } from "@/components/ConversationGroup";
import { SummaryStats } from "@/components/SummaryStats";
import { DateFilter } from "@/components/DateFilter";
import { DateFilterType, CustomDateRange } from "@/types/conversation";
import { SystemFilter } from "@/components/SystemFilter";
import { useWebhookData } from "@/hooks/useWebhookData";
import { useConversationGroups, GroupingMode } from "@/hooks/useConversationGroups";
import { usePricingWebhooks } from "@/hooks/usePricingWebhooks";
import { PricingConfig } from "@/types/conversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CostCalculator } from "@/components/CostCalculator";
import { useDateFilteredConversations } from "@/hooks/useDateFilteredConversations";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MonthlyCostComparison } from "@/components/MonthlyCostComparison";
import { SectorReport } from "@/components/SectorReport";
import { SectorSummaryTab } from "@/components/SectorSummaryTab";
import { getDateRangeFromFilter } from "@/lib/dateFilterUtils";
import { FilterInfoBar } from "@/components/FilterInfoBar";
import { UserAdminPanel } from "@/components/UserAdminPanel";

const Index = () => {
  const { isAuthenticated, logout, username, user, roles, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({});
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("section");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // Inicializar activeTab baseado na URL ou padrão
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabFromUrl = urlParams.get('tab');
      const validTabs = ['dashboard', 'conversations', 'settings', 'sectors', 'calculator', 'users'];
      if (tabFromUrl && validTabs.includes(tabFromUrl)) return tabFromUrl;
      const saved = sessionStorage.getItem('activeTab');
      if (saved && validTabs.includes(saved)) return saved as typeof validTabs[number];
    } catch {}
    return 'dashboard';
  });
  const pageSize = 25;
  
  const { pricingConfigs, datedPricingConfigs } = usePricingWebhooks();
  const emailForServer = (roles?.admin || roles?.controladoria) ? undefined : (user?.email || undefined);

  const {
    conversationCosts,
    loading,
    error,
    refetch
  } = useWebhookData(pricingConfigs, datedPricingConfigs, dateFilter, customDateRange, emailForServer);

  // Dados fixos anuais para o gráfico (independente dos filtros atuais)
  const {
    conversationCosts: annualConversationCosts,
    loading: loadingAnnual
  } = useWebhookData(pricingConfigs, datedPricingConfigs, 'year', undefined, emailForServer);

  // Dados "todos os meses" (independente do filtro de data) para Resumo Mensal (Geral) em Setores
  const {
    conversationCosts: allConversationCosts,
    loading: loadingAll
  } = useWebhookData(pricingConfigs, datedPricingConfigs, 'all', undefined, emailForServer);

  // Setter para persistir aba imediatamente (estado, sessionStorage e URL)
  const setActiveTabPersisted = (tab: string) => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem('activeTab', tab);
    } catch {}
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
    } catch {}
  };

  // Aplica o filtro de data primeiro
  const dateFilteredConversations = useDateFilteredConversations(conversationCosts, dateFilter, customDateRange);

  // Permissões: tabs permitidas por role
  const allowedTabs = useMemo(() => {
    if (roles?.admin) return ['dashboard', 'conversations', 'settings', 'sectors', 'calculator', 'users'];
    if (roles?.controladoria) return ['dashboard', 'conversations', 'sectors'];
    if (roles?.visualizador) return ['dashboard', 'conversations'];
    return ['conversations'];
  }, [roles]);

  // Garantir que a aba ativa seja permitida para o usuário (somente após carregar roles)
  useEffect(() => {
    if (isLoading) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTabPersisted(allowedTabs[0]);
    }
  }, [allowedTabs, isLoading]);

  // Filtra conversas por e-mail do usuário para roles restritos
  const roleFilteredConversations = useMemo(() => {
    if (roles?.admin) return dateFilteredConversations;
    const email = (user?.email || '').toLowerCase();
    if (!email) return [];
    return dateFilteredConversations.filter(c => (c.email || '').toLowerCase() === email);
  }, [dateFilteredConversations, roles, user?.email]);

  // Versão "todos os meses" com filtro por role (somente restringe usuário, não restringe data)
  const roleFilteredAllConversations = useMemo(() => {
    if (roles?.admin) return allConversationCosts || [];
    const email = (user?.email || '').toLowerCase();
    if (!email) return [];
    return (allConversationCosts || []).filter(c => (c.email || '').toLowerCase() === email);
  }, [allConversationCosts, roles, user?.email]);

  // Intervalo de datas exibido ao lado do filtro
  const dateRange = useMemo(() => getDateRangeFromFilter(dateFilter, customDateRange), [dateFilter, customDateRange]);

  const {
    groupedConversations,
    availableSystems
  } = useConversationGroups(roleFilteredConversations, systemFilter, groupingMode);
  
  // Busca por usuário (nome/email) e por seção (ou chave do grupo)
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedConversations;
    return groupedConversations.filter((group) => {
      const sectionMatch = (group.seção || "").toLowerCase().includes(q);
      const userMatch = group.conversations?.some((c) => {
        const u = (c.username || "").toLowerCase();
        const e = (c.email || "").toLowerCase();
        return u.includes(q) || e.includes(q);
      });
      return sectionMatch || userMatch;
    });
  }, [groupedConversations, searchQuery]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredGroups.length / pageSize)), [filteredGroups.length]);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleGroups = useMemo(() => filteredGroups.slice(startIndex, startIndex + pageSize), [filteredGroups, startIndex]);
  
  const {
    toast
  } = useToast();

  // Sincroniza a aba ativa na URL para preservar ao recarregar o navegador
  useEffect(() => {
    const tab = allowedTabs.includes(activeTab) ? activeTab : allowedTabs[0];
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') !== tab) {
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url);
    }
  }, [activeTab, allowedTabs]);

  // Resetar para a primeira página quando filtros/abas/busca mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [groupingMode, systemFilter, dateFilter, customDateRange, searchQuery]);

  // Limpar parâmetros inválidos da URL na inicialização e resgatar da sessionStorage (após roles)
  useEffect(() => {
    if (isLoading) return;
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    
    // Limpar qualquer parâmetro tab inválido da URL
    if (tabFromUrl && !allowedTabs.includes(tabFromUrl)) {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url);
      setActiveTabPersisted(allowedTabs[0]);
      return;
    }

    // Se não tiver tab na URL mas existe em sessionStorage, aplica
    if (!tabFromUrl) {
      const saved = sessionStorage.getItem('activeTab');
      if (saved && allowedTabs.includes(saved)) {
        setActiveTabPersisted(saved);
      }
    }
  }, [allowedTabs, isLoading]);

  // Persistir aba ativa na sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('activeTab', activeTab);
    } catch {}
  }, [activeTab]);

  // Agora fazemos o retorno condicional APÓS todos os hooks (nenhum hook abaixo daqui)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Enquanto carrega permissões, evita flicker de tabs/dados
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }
  
  const handleRefresh = async () => {
    // Preservar aba ativa antes do refresh
    const currentTab = activeTab;
    
    try {
      // Tentar fazer refresh dos dados primeiro
      await refetch();
      
      // Preparar URL com aba preservada
      const url = new URL(window.location.href);
      const validTab = ['dashboard', 'conversations', 'settings', 'sectors', 'calculator', 'users'].includes(currentTab) 
        ? currentTab 
        : 'dashboard';
      
      url.searchParams.set('tab', validTab);
      window.history.replaceState({}, '', url);
      
      // Recarregar página completa
      window.location.reload();
    } catch (error) {
      
      // Em caso de erro, ainda preservar a aba e recarregar
      const url = new URL(window.location.href);
      const validTab = ['dashboard', 'conversations', 'settings', 'sectors', 'calculator', 'users'].includes(activeTab) 
        ? activeTab 
        : 'dashboard';
      
      url.searchParams.set('tab', validTab);
      window.history.replaceState({}, '', url);
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Com Azure AD, após o logout, o usuário será automaticamente redirecionado
      // ou a aplicação detectará que não está mais autenticado
    } catch (error) {
      // Em caso de erro, forçar navegação para login
      navigate('/login');
    }
  };

  

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rateio Grupo Potencial</h1>
            {username && (
              <p className="text-sm text-muted-foreground mt-1">
                Logado como: <span className="font-medium">{username}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {username && (
              <div className="flex items-center gap-2">
                <img
                  src="/auth/photo"
                  alt="Foto de perfil"
                  className="h-8 w-8 rounded-full border"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <ThemeToggle />
            <Button onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {error && <Card className="border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive">Erro ao carregar dados: {error}</p>
            </CardContent>
          </Card>}

        <Tabs value={activeTab} onValueChange={setActiveTabPersisted} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-2">
            {allowedTabs.includes('dashboard') && (
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            )}
            {allowedTabs.includes('conversations') && (
            <TabsTrigger value="conversations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversas
            </TabsTrigger>
            )}
            {allowedTabs.includes('settings') && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            )}
            {allowedTabs.includes('sectors') && (
            <TabsTrigger value="sectors" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Relatório Setores
            </TabsTrigger>
            )}
            {allowedTabs.includes('calculator') && (
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Documentação
            </TabsTrigger>
            )}
            {allowedTabs.includes('users') && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            )}
          </TabsList>

          {allowedTabs.includes('dashboard') && (
          <TabsContent value="dashboard" className="space-y-6">
            <FilterInfoBar 
              systemLabel={systemFilter === "all" ? "Todos os sistemas" : systemFilter}
              dateRange={dateRange}
            />
            <SummaryStats 
              conversations={systemFilter === "all" ? roleFilteredConversations : roleFilteredConversations.filter(c => c.sistema === systemFilter)} 
              systemFilter={systemFilter}
              allConversations={roleFilteredConversations}
            />
            
            <div className="grid gap-3 lg:grid-cols-2">
              <DateFilter 
                selectedFilter={dateFilter} 
                onFilterChange={setDateFilter}
                customDateRange={customDateRange}
                onCustomDateChange={setCustomDateRange}
              />
              <SystemFilter systems={availableSystems} selectedSystem={systemFilter} onSystemChange={setSystemFilter} />
            </div>

            {/* Gráfico de comparação mensal (fixo anual, independente dos filtros) */}
            <MonthlyCostComparison conversations={annualConversationCosts} maxItems={12} />
          </TabsContent>
          )}

          {allowedTabs.includes('conversations') && (
          <TabsContent value="conversations">
            <div className="mb-4">
              <FilterInfoBar 
                systemLabel={systemFilter === "all" ? "Todos os sistemas" : systemFilter}
                dateRange={dateRange}
              />
            </div>
            <Tabs defaultValue="conversations" className="w-full" onValueChange={(value) => {
              if (value === "conversations") setGroupingMode("section");
              else if (value === "users") setGroupingMode("user");
              else if (value === "sectors") setGroupingMode("sector");
            }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Conversas Agrupadas</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {filteredGroups.length} {groupingMode === "section" ? "seções" : groupingMode === "user" ? "usuários" : "setores"} encontrados
                        {searchQuery && filteredGroups.length !== groupedConversations.length && (
                          <span className="ml-1">(de {groupedConversations.length})</span>
                        )}
                      </p>
                    </div>
                    <TabsList className="grid w-fit grid-cols-3">
                      <TabsTrigger value="conversations" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Por Seção
                      </TabsTrigger>
                      <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Por Usuários
                      </TabsTrigger>
                      <TabsTrigger value="sectors" className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Por Setor
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>
                <CardContent>
                  {groupingMode !== "sector" && (
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Pesquisar por usuário ou seção..."
                          className="pl-9"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Mostrando {filteredGroups.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, filteredGroups.length)} de {filteredGroups.length}
                      </div>
                    </div>
                  )}
                  <TabsContent value="conversations">
                    {loading ? <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Carregando conversas...</span>
                      </div> : filteredGroups.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        Nenhuma conversa encontrada para os filtros selecionados
                      </div> : <div className="space-y-4">
                        {visibleGroups.map(group => <ConversationGroup key={group.seção} group={group} />)}
                      </div>}
                  </TabsContent>
                  <TabsContent value="users">
                    {loading ? <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Carregando conversas...</span>
                      </div> : filteredGroups.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                        Nenhuma conversa encontrada para os filtros selecionados
                      </div> : <div className="space-y-4">
                        {visibleGroups.map(group => <ConversationGroup key={group.seção} group={group} />)}
                      </div>}
                  </TabsContent>
                  <TabsContent value="sectors">
                    <SectorReport 
                      conversations={roleFilteredConversations} 
                      systemFilter={systemFilter}
                    />
                  </TabsContent>

                  {groupingMode !== "sector" && totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const page = idx + 1;
                            // Render all page numbers if few pages; otherwise render first, last, current +/- 1 with ellipsis
                            const showAll = totalPages <= 7;
                            const isEdge = page === 1 || page === totalPages;
                            const isNear = Math.abs(page - currentPage) <= 1;
                            if (showAll || isEdge || isNear) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    isActive={currentPage === page}
                                    onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            if (page === 2 && currentPage > 3) {
                              return (
                                <PaginationItem key={"start-ellipsis"}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            if (page === totalPages - 1 && currentPage < totalPages - 2) {
                              return (
                                <PaginationItem key={"end-ellipsis"}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          })}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Tabs>
          </TabsContent>
          )}

          {allowedTabs.includes('settings') && (
          <TabsContent value="settings">
          <PricingManager 
            allConversations={roleFilteredConversations}
          />
          </TabsContent>
          )}

          {allowedTabs.includes('calculator') && (
          <TabsContent value="calculator">
            <CostCalculator 
              pricingConfigs={pricingConfigs}
            />
          </TabsContent>
          )}

          {allowedTabs.includes('users') && (
          <TabsContent value="users">
            <UserAdminPanel />
          </TabsContent>
          )}

          {allowedTabs.includes('sectors') && (
          <TabsContent value="sectors">
            <SectorSummaryTab 
              conversations={roles?.controladoria ? dateFilteredConversations : roleFilteredConversations}
              allConversations={roles?.controladoria ? (allConversationCosts || []) : roleFilteredAllConversations}
            />
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;