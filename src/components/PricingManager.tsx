import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronDown, ChevronRight, History } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PriceSelector } from "@/components/PriceSelector";
import { PricingConfig, ConversationCost } from "@/types/conversation";
import { useToast } from "@/hooks/use-toast";
import { usePricingWebhooks } from "@/hooks/usePricingWebhooks";

interface PricingManagerProps {
  allConversations?: ConversationCost[];
  filterModelsOnly?: string[]; // Lista de modelos específicos para mostrar/configurar
}

export const PricingManager = ({ allConversations, filterModelsOnly }: PricingManagerProps) => {
  const [newConfig, setNewConfig] = useState<Partial<PricingConfig>>({
    modelo: "",
    custo_token_entrada: 0,
    custo_token_saida: 0,
    moeda: "USD"
  });

  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { 
    pricingConfigs, 
    datedPricingConfigs,
    loading, 
    savePricingConfig
  } = usePricingWebhooks();

  // Extrair modelos únicos de todas as conversas (filtrar se especificado)
  const availableModels = allConversations ? 
    [...new Set(allConversations.map(c => c.modelo))].sort() : 
    [];

  // Se há filtro específico, aplicar
  const modelsToShow = filterModelsOnly ? 
    availableModels.filter(model => filterModelsOnly.includes(model)) : 
    availableModels;

  // Filtrar configurações exibidas também
  const displayedConfigs = filterModelsOnly ?
    pricingConfigs.filter(config => filterModelsOnly.includes(config.modelo)) :
    pricingConfigs;

  // Identificar modelos faltantes (usados nas conversas mas sem configuração)
  // Considerar tanto pricingConfigs quanto datedPricingConfigs para determinar se há configuração
  const configuredModels = new Set([
    ...pricingConfigs.map(config => config.modelo),
    ...(datedPricingConfigs?.map(config => config.modelo) || [])
  ]);
  const missingModels = availableModels.filter(model => !configuredModels.has(model)).sort();
  
  // Combinar modelos existentes e faltantes para o seletor
  const allSelectableModels = [
    ...missingModels.map(model => ({ value: model, label: `${model} (⚠️ Faltante)`, isMissing: true })),
    ...pricingConfigs.map(config => ({ value: config.modelo, label: `${config.modelo} (✅ Configurado)`, isMissing: false }))
  ].sort((a, b) => {
    // Priorizar modelos faltantes primeiro
    if (a.isMissing && !b.isMissing) return -1;
    if (!a.isMissing && b.isMissing) return 1;
    return a.value.localeCompare(b.value);
  });

  const formatNumber = (value: number): string => {
    return value.toString().replace('.', ',');
  };

  const parseNumber = (value: string): number => {
    if (value === '' || value === '0') return 0;
    const cleanValue = value.replace(',', '.');
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? 0 : numValue;
  };

  const formatPricingDateTime = (iso?: string) => {
    if (!iso) return "Não definido";
    try {
      const d = new Date(iso);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const seconds = d.getSeconds().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return "Data/hora inválida";
    }
  };

  const formatPricingDate = (iso?: string) => {
    if (!iso) return "Não definido";
    try {
      const d = new Date(iso);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "Data inválida";
    }
  };

  // Buscar data de vigência para cada modelo
  const getLatestPricingDate = (modelo: string) => {
    if (!datedPricingConfigs) return undefined;
    const forModel = datedPricingConfigs
      .filter(d => d.modelo === modelo)
      .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
    return forModel[0]?.dataISO;
  };

  // Buscar histórico completo de preços para um modelo
  const getPricingHistory = (modelo: string) => {
    if (!datedPricingConfigs) return [];
    return datedPricingConfigs
      .filter(d => d.modelo === modelo)
      .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());
  };

  const toggleHistoryExpansion = (modelo: string) => {
    const newExpanded = new Set(expandedHistories);
    if (newExpanded.has(modelo)) {
      newExpanded.delete(modelo);
    } else {
      newExpanded.add(modelo);
    }
    setExpandedHistories(newExpanded);
  };

  const handleAddConfig = async () => {
    if (!newConfig.modelo) {
      toast({
        title: "Erro",
        description: "Modelo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    // Verificar se é um modelo existente
    const existingModel = pricingConfigs.find(c => c.modelo === newConfig.modelo);
    const isExistingModel = !!existingModel;

    if (isExistingModel) {
      toast({
        title: "⚠️ Criando Nova Versão de Preço",
        description: `Você está criando uma nova versão para o modelo "${newConfig.modelo}". Os novos valores serão aplicados a partir da data/hora atual. Conversas anteriores manterão os preços históricos.`,
        duration: 8000,
      });
    }

    const config: PricingConfig = {
      modelo: newConfig.modelo!,
      custo_token_entrada: newConfig.custo_token_entrada || 0,
      custo_token_saida: newConfig.custo_token_saida || 0,
      moeda: newConfig.moeda || "USD"
    };

    await savePricingConfig(config);
    setNewConfig({
      modelo: "",
      custo_token_entrada: 0,
      custo_token_saida: 0,
      moeda: "USD"
    });
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Configuração de Preços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lista de configurações existentes */}
        <div className="space-y-3">
          {filterModelsOnly && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 dark:bg-blue-950 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📝 Configurando apenas modelos sem preço: <strong>{filterModelsOnly.join(', ')}</strong>
              </p>
            </div>
          )}
          {displayedConfigs.map((config, index) => {
            const history = getPricingHistory(config.modelo);
            const hasHistory = history.length > 1;
            const isExpanded = expandedHistories.has(config.modelo);
            
            return (
            <div key={index} className="bg-muted rounded-lg">
              <div className="flex items-center gap-3 p-3">
                {/* Modo de visualização */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-xs">ID:</span>
                    <p className="text-muted-foreground text-xs font-mono">
                      {(() => {
                        const activeConfig = datedPricingConfigs?.find(d => d.modelo === config.modelo && d.ativo);
                        return activeConfig?.id || "N/A";
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-xs">Modelo:</span>
                    <p className="text-muted-foreground">{config.modelo}</p>
                    {(() => {
                      const activeConfig = datedPricingConfigs?.find(d => d.modelo === config.modelo && d.ativo);
                      return activeConfig ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-xs text-green-600 font-medium">ATIVO</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                          <span className="text-xs text-gray-500">INATIVO</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="font-medium text-xs">Entrada:</span>
                    <p className="text-muted-foreground">{formatNumber(config.custo_token_entrada)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-xs">Saída:</span>
                    <p className="text-muted-foreground">{formatNumber(config.custo_token_saida)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-xs">Moeda:</span>
                    <p className="text-muted-foreground">{config.moeda}</p>
                  </div>
                  <div>
                    <span className="font-medium text-xs">Vigência:</span>
                    <p className="text-muted-foreground text-xs">{formatPricingDateTime(getLatestPricingDate(config.modelo))}</p>
                  </div>
                </div>
              
              {/* Botões de ação */}
              <div className="flex flex-col gap-2 items-center justify-center">
                {hasHistory && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleHistoryExpansion(config.modelo)}
                    className="text-xs"
                  >
                    <History className="h-3 w-3 mr-1" />
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                )}
              </div>
              </div>
              
              {/* Histórico expandível */}
              {hasHistory && isExpanded && (
                <div className="border-t bg-background/50 p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Histórico de Preços - {config.modelo}</span>
                  </div>
                  <div className="space-y-2">
                    {history.map((item, histIndex) => (
                      <div key={item.id} className={`grid grid-cols-2 md:grid-cols-6 gap-2 text-xs p-2 rounded ${item.ativo ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-700'}`}>
                        <div>
                          <span className="font-medium">ID:</span>
                          <p className="text-muted-foreground font-mono">{item.id}</p>
                        </div>
                        <div>
                          <span className="font-medium">Data/Hora:</span>
                          <p className="text-muted-foreground">{formatPricingDateTime(item.dataISO)}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {item.ativo ? (
                              <>
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="text-green-600 text-xs font-medium">ATIVO</span>
                              </>
                            ) : (
                              <>
                                <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>
                                <span className="text-gray-500 text-xs">INATIVO</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Entrada:</span>
                          <p className="text-muted-foreground">{formatNumber(item.custo_token_entrada)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Saída:</span>
                          <p className="text-muted-foreground">{formatNumber(item.custo_token_saida)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Moeda:</span>
                          <p className="text-muted-foreground">{item.moeda}</p>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>
                          <p className={`text-xs font-medium ${item.ativo ? 'text-green-600' : 'text-gray-500'}`}>
                            {item.ativo ? 'Em uso' : 'Histórico'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Alerta de modelos faltantes */}
        {missingModels.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                Configurações de Preço Faltantes
              </h3>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              Os seguintes modelos estão sendo usados nas conversas mas não possuem configuração de preço:
            </p>
            <div className="flex flex-wrap gap-1">
              {missingModels.map(model => (
                <span key={model} className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-medium dark:bg-amber-900 dark:text-amber-200">
                  {model}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Formulário para adicionar nova configuração */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border rounded-lg">
          <div>
            <Label htmlFor="modelo">Modelo</Label>
            <Select 
              value={newConfig.modelo || ""} 
              onValueChange={(value) => setNewConfig({ ...newConfig, modelo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo..." />
              </SelectTrigger>
              <SelectContent>
                {allSelectableModels.length > 0 ? (
                  <>
                    {missingModels.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950">
                          ⚠️ Modelos Faltantes (Prioridade)
                        </div>
                        {allSelectableModels
                          .filter(model => model.isMissing)
                          .map(model => (
                            <SelectItem key={model.value} value={model.value} className="text-amber-700 dark:text-amber-300">
                              <span className="flex items-center gap-2">
                                <span className="text-amber-500">⚠️</span>
                                {model.value}
                                <span className="text-xs text-muted-foreground">(Faltante)</span>
                              </span>
                            </SelectItem>
                          ))
                        }
                      </>
                    )}
                    
                    {pricingConfigs.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950">
                          ✅ Modelos Configurados
                        </div>
                        {allSelectableModels
                          .filter(model => !model.isMissing)
                          .map(model => (
                            <SelectItem key={model.value} value={model.value} className="text-green-700 dark:text-green-300">
                              <span className="flex items-center gap-2">
                                <span className="text-green-500">✅</span>
                                {model.value}
                                <span className="text-xs text-muted-foreground">(Configurado)</span>
                              </span>
                            </SelectItem>
                          ))
                        }
                      </>
                    )}
                  </>
                ) : (
                  <SelectItem value="no-models-found" disabled>
                    Nenhum modelo encontrado nas conversas
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="entrada" className="text-xs">
              Entrada ($/1M tokens)
            </Label>
            <PriceSelector
              value={newConfig.custo_token_entrada || 0}
              onChange={(value) => setNewConfig({ 
                ...newConfig, 
                custo_token_entrada: value
              })}
              placeholder="0,40"
            />
          </div>

          <div>
            <Label htmlFor="saida" className="text-xs">
              Saída ($/1M tokens)
            </Label>
            <PriceSelector
              value={newConfig.custo_token_saida || 0}
              onChange={(value) => setNewConfig({ 
                ...newConfig, 
                custo_token_saida: value
              })}
              placeholder="1,60"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="moeda">Moeda</Label>
            <Select value={newConfig.moeda} onValueChange={(value) => setNewConfig({ ...newConfig, moeda: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleAddConfig} className="w-full" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Adicionar Configuração"}
        </Button>
      </CardContent>
    </Card>
  );
};