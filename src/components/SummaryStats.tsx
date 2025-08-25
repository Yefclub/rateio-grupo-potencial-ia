import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, MessageSquare, Zap, TrendingUp, Settings } from "lucide-react";
import { ConversationCost, PricingConfig } from "@/types/conversation";
import { PricingManager } from "./PricingManager";
import { usePricingWebhooks } from "@/hooks/usePricingWebhooks";

interface SummaryStatsProps {
  conversations: ConversationCost[];
  systemFilter: string;
  allConversations: ConversationCost[];
}

export const SummaryStats = ({ conversations, systemFilter, allConversations }: SummaryStatsProps) => {
  // Buscar configurações de preço diretamente do webhook
  const { pricingConfigs, datedPricingConfigs } = usePricingWebhooks();
  // Estatísticas do filtro atual
  const totalCost = conversations.reduce((sum, conv) => sum + conv.custo_total, 0);
  const totalTokens = conversations.reduce((sum, conv) => sum + conv.tokens_entrada + conv.tokens_saida, 0);
  const averageCostPerConversation = conversations.length > 0 ? totalCost / conversations.length : 0;
  const totalConversations = conversations.length;

  // Estatísticas totais (todos os sistemas)
  const totalCostAll = allConversations.reduce((sum, conv) => sum + conv.custo_total, 0);
  const totalTokensAll = allConversations.reduce((sum, conv) => sum + conv.tokens_entrada + conv.tokens_saida, 0);
  const totalConversationsAll = allConversations.length;

  // Verificar quais MODELOS realmente não possuem configuração de preço
  // Usar as configurações diretamente dos webhooks, não das conversas individuais
  const allModelsInConversations = [...new Set(conversations.map(c => c.modelo))];
  
  // Modelos que têm configuração atual (independente do valor - pode ser 0 para modelos gratuitos)
  const configuredModels = new Set([
    ...pricingConfigs.map(config => config.modelo),
    ...(datedPricingConfigs?.map(config => config.modelo) || [])
  ]);
  
  // Modelos realmente sem configuração
  const unpricedModels = allModelsInConversations.filter(model => !configuredModels.has(model));
  const conversationsWithoutPricing = conversations.filter(conv => unpricedModels.includes(conv.modelo));
  const hasUnpricedConversations = unpricedModels.length > 0;

  // Verificar conversas com problemas de data de preço
  const conversationsWithDateIssues = conversations.filter(conv => 
    conv.has_pricing && conv.pricing_info && 
    new Date(conv.pricing_info.data_vigencia) > new Date(`20${conv.data.split('/')[2]}-${conv.data.split('/')[1]}-${conv.data.split('/')[0]}T${conv.hora}`)
  );
  const hasDateIssues = conversationsWithDateIssues.length > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 8
    }).format(value);
  };

  const stats = [
    {
      title: "Total de Conversas",
      value: totalConversations.toLocaleString(),
      icon: MessageSquare,
      color: "text-primary"
    },
    {
      title: "Custo Total",
      value: formatCurrency(totalCost),
      icon: DollarSign,
      color: "text-success"
    },
    {
      title: "Total de Tokens",
      value: totalTokens.toLocaleString(),
      icon: Zap,
      color: "text-info"
    },
    {
      title: "Custo Médio/Conversa",
      value: formatCurrency(averageCostPerConversation),
      icon: TrendingUp,
      color: "text-warning"
    }
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Alerta de configurações faltantes */}
      {hasUnpricedConversations && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-800">
                <span className="font-medium">⚠️ Configurações de preço faltantes</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                {conversationsWithoutPricing.length} conversa(s) não possuem configuração de preço para calcular custos.
                Modelos sem configuração: {unpricedModels.join(', ')}
              </p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-700 border-red-300 hover:bg-red-100">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configurar Preços para Modelos/Sistemas</DialogTitle>
                </DialogHeader>
                <PricingManager 
                  allConversations={allConversations}
                  filterModelsOnly={unpricedModels}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Alerta de problemas de data */}
      {hasDateIssues && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-yellow-800">
                <span className="font-medium">⚠️ Atenção: Inconsistências de Data Detectadas</span>
              </div>
              <p className="text-sm text-yellow-600 mt-1">
                {conversationsWithDateIssues.length} conversa(s) possuem data anterior à vigência do preço aplicado. 
                Isso pode indicar problemas no cálculo de custos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas totais (quando um sistema está selecionado) */}
      {systemFilter !== "all" && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Resumo Geral (Todos os Sistemas)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
                <MessageSquare className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalConversationsAll.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Total Geral</CardTitle>
                <DollarSign className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalCostAll)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
                <Zap className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTokensAll.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Estatísticas do sistema atual (sempre abaixo do resumo geral quando houver sistema selecionado) */}
      <div>
        <h3 className="text-lg font-semibold">
          {systemFilter === "all" ? "Todos os Sistemas" : `Sistema: ${systemFilter}`}
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Visualizando dados do sistema: <span className="font-medium">{systemFilter === "all" ? "Todos os Sistemas" : systemFilter}</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};