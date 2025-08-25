import { useState, useMemo } from "react";
import { ConversationCost } from "@/types/conversation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Bot, ChevronDown, ChevronRight, Mail, Building, Wrench } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConversationGroupProps {
  group: {
    seção: string;
    conversations: ConversationCost[];
    totalCost: number;
    totalTokens: number;
  };
}

export const ConversationGroup = ({ group }: ConversationGroupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Add safety check to prevent undefined errors
  if (!group || !group.conversations || !Array.isArray(group.conversations)) {
    return null;
  }

  // Extrair informações do usuário da primeira conversa
  const firstConversation = group.conversations[0];
  const userInfo = {
    username: firstConversation?.username,
    email: firstConversation?.email,
    setor: firstConversation?.setor
  };

  // Agrupar conversas por modelo para mostrar estatísticas separadas
  const modelStats = useMemo(() => {
    const stats = group.conversations.reduce((acc, conv) => {
      if (!acc[conv.modelo]) {
        acc[conv.modelo] = {
          modelo: conv.modelo,
          count: 0,
          totalCost: 0,
          tokensEntrada: 0,
          tokensSaida: 0,
          conversations: []
        };
      }
      
      acc[conv.modelo].count++;
      acc[conv.modelo].totalCost += conv.custo_total;
      acc[conv.modelo].tokensEntrada += conv.tokens_entrada;
      acc[conv.modelo].tokensSaida += conv.tokens_saida;
      acc[conv.modelo].conversations.push(conv);
      
      return acc;
    }, {} as Record<string, {
      modelo: string;
      count: number;
      totalCost: number;
      tokensEntrada: number;
      tokensSaida: number;
      conversations: ConversationCost[];
    }>);
    
    return Object.values(stats).sort((a, b) => b.totalCost - a.totalCost);
  }, [group.conversations]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 8
    }).format(value);
  };

  const formatPriceDate = (iso?: string) => {
    if (!iso) return undefined;
    try {
      const d = new Date(iso);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return undefined;
    }
  };

  const formatPriceDateTime = (iso?: string) => {
    if (!iso || iso === "N/A") return undefined;
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
      return undefined;
    }
  };

  const renderPricingInfo = (item: ConversationCost) => {
    if (!item.pricing_info) {
      return (
        <div className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
          ⚠️ Sem preço definido
        </div>
      );
    }

    const pricingDate = formatPriceDateTime(item.pricing_info.data_vigencia);
    
    return (
      <div className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <div className="font-medium text-blue-800 dark:text-blue-200">
          💰 Preço aplicado (ID: {item.pricing_info.id})
        </div>
        <div className="text-blue-700 dark:text-blue-300 mt-1 space-y-1">
          <div>Entrada: ${item.pricing_info.entrada_valor}/1M • Saída: ${item.pricing_info.saida_valor}/1M</div>
          <div>Vigente desde: {pricingDate || "Data não disponível"}</div>
          {item.pricing_info.data_vigencia === "N/A" && (
            <div className="text-yellow-600 text-xs">⚠️ Preço legado (sem data)</div>
          )}
        </div>
      </div>
    );
  };

  // Função para converter data e hora em timestamp para comparação
  const parseDateTime = (data: string, hora: string) => {
    // Assumindo formato DD/MM/YY HH:MM:SS
    const [day, month, year] = data.split('/');
    const [hours, minutes, seconds] = hora.split(':');
    
    // Converter ano de 2 dígitos para 4 dígitos (assumindo 20XX)
    const fullYear = `20${year}`;
    
    return new Date(`${fullYear}-${month}-${day}T${hours}:${minutes}:${seconds || '00'}`).getTime();
  };

  // Função para agrupar conversas relacionadas considerando ordem cronológica completa
  const groupRelatedConversations = () => {
    // Ordenar TODAS as conversas por timestamp primeiro
    const allConversations = group.conversations.sort((a, b) => {
      return parseDateTime(a.data, a.hora) - parseDateTime(b.data, b.hora);
    });

    const conversationGroups: Array<{
      userPrompt: string;
      orderedItems: ConversationCost[]; // Manter ordem cronológica
      timestamp: number;
    }> = [];

    // Separar conversas por texto do usuário, mantendo ordem temporal
    const conversationsByPrompt = new Map<string, ConversationCost[]>();
    
    allConversations.forEach(conv => {
      const prompt = conv.prompt_usuário.trim();
      if (!conversationsByPrompt.has(prompt)) {
        conversationsByPrompt.set(prompt, []);
      }
      conversationsByPrompt.get(prompt)!.push(conv);
    });

    // Para cada grupo de mesmo texto, agrupar por proximidade temporal (5 minutos)
    conversationsByPrompt.forEach((conversations, prompt) => {
      let currentGroup: ConversationCost[] = [];
      let lastTimestamp = 0;

      conversations.forEach(conv => {
        const timestamp = parseDateTime(conv.data, conv.hora);
        
        if (currentGroup.length === 0 || (timestamp - lastTimestamp) <= 300000) { // 5 minutos
          currentGroup.push(conv);
          lastTimestamp = timestamp;
        } else {
          // Finalizar grupo anterior (mantendo ordem cronológica)
          if (currentGroup.length > 0) {
            conversationGroups.push({
              userPrompt: prompt,
              orderedItems: [...currentGroup], // Manter ordem original
              timestamp: parseDateTime(currentGroup[0].data, currentGroup[0].hora)
            });
          }
          
          // Iniciar novo grupo
          currentGroup = [conv];
          lastTimestamp = timestamp;
        }
      });

      // Adicionar último grupo
      if (currentGroup.length > 0) {
        conversationGroups.push({
          userPrompt: prompt,
          orderedItems: [...currentGroup], // Manter ordem original
          timestamp: parseDateTime(currentGroup[0].data, currentGroup[0].hora)
        });
      }
    });

    // Ordenar grupos por timestamp
    return conversationGroups.sort((a, b) => a.timestamp - b.timestamp);
  };

  const conversationGroups = groupRelatedConversations();

  // Separar ferramentas que não estão agrupadas (para mostrar separadamente)
  const ungroupedTools = group.conversations.filter(conv => 
    conv.ferramentas && conv.ferramentas !== "Não" && 
    !conversationGroups.some(cg => cg.orderedItems.some(t => t.id === conv.id))
  );

  return (
    <Card className="mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-lg">
                    Seção: {group.seção}
                  </CardTitle>
                </div>
              
               {/* Informações do usuário */}
               {(userInfo.username || userInfo.email || userInfo.setor) && (
                 <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                   {userInfo.username && (
                     <div className="flex items-center gap-1">
                       <User className="h-3 w-3" />
                       {userInfo.username}
                     </div>
                   )}
                   {userInfo.email && (
                     <div className="flex items-center gap-1">
                       <Mail className="h-3 w-3" />
                       {userInfo.email}
                     </div>
                   )}
                   {userInfo.setor && (
                     <div className="flex items-center gap-1">
                       <Building className="h-3 w-3" />
                       {userInfo.setor}
                     </div>
                   )}
                   {ungroupedTools.length > 0 && (
                     <div className="flex items-center gap-1">
                       <Wrench className="h-3 w-3" />
                       <span>{ungroupedTools.length} ferramenta(s) independente(s)</span>
                     </div>
                   )}
                 </div>
                 )}
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {group.conversations?.length || 0} conversa(s) • {formatCurrency(group.totalCost || 0)} • {(group.totalTokens || 0).toLocaleString()} tokens
                </div>
                
                {/* Mostrar modelos utilizados na seção */}
                <div className="flex flex-wrap gap-2">
                  {modelStats.map((modelStat) => (
                    <Badge key={modelStat.modelo} variant="outline" className="text-xs">
                      <span className="font-medium">{modelStat.modelo}</span>
                      <span className="ml-1 text-muted-foreground">({modelStat.count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-6">
              {/* Estatísticas por modelo */}
              {modelStats.length > 1 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-gray-950 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Modelos Utilizados na Seção</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modelStats.map((modelStat) => (
                      <div key={modelStat.modelo} className="bg-white border border-gray-300 rounded-lg p-3 dark:bg-gray-900 dark:border-gray-700">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs font-medium">
                              {modelStat.modelo}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {modelStat.count} conversa{modelStat.count !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Custo:</span>
                              <span className="font-mono font-medium">{formatCurrency(modelStat.totalCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tokens entrada:</span>
                              <span className="font-mono">{modelStat.tokensEntrada.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tokens saída:</span>
                              <span className="font-mono">{modelStat.tokensSaida.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-1">
                              <span>Total tokens:</span>
                              <span className="font-mono">{(modelStat.tokensEntrada + modelStat.tokensSaida).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Ferramentas independentes (não agrupadas) */}
              {ungroupedTools.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 dark:bg-orange-950 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Ferramentas Independentes</span>
                  </div>
                  <div className="space-y-3">
                    {ungroupedTools.map((tool, index) => (
                      <div key={index} className="border-l-2 border-orange-300 pl-4 space-y-2 dark:border-orange-600">
                        <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                          <MessageSquare className="h-4 w-4" />
                          {tool.modelo} • {tool.sistema} • {tool.data} {tool.hora}
                          {tool.has_pricing && (
                            <span className="text-xs">• {formatCurrency(tool.custo_total)}</span>
                          )}
                        </div>
                        <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 dark:bg-orange-900 dark:border-orange-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className="h-4 w-4 text-orange-700 dark:text-orange-300" />
                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">{tool.ferramentas}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap text-orange-900 dark:text-orange-100">{tool.resposta_agente}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocos de conversas agrupadas - agora em ordem cronológica */}
              <div className="space-y-6">
                {conversationGroups.map((convGroup, groupIndex) => {
                  // Só mostrar bloco se tiver algum conteúdo relevante
                  if (convGroup.orderedItems.length === 0) {
                    return null;
                  }

                  return (
                    <div key={groupIndex} className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                      {/* Informações do conjunto da conversa (agrupados) */}
                      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4 dark:bg-gray-800 dark:border-gray-600">
                        {/* Informações de modelo/sistema/data - mostrar todos os modelos usados no grupo */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {(() => {
                              const firstAvailable = convGroup.orderedItems[0];
                              if (!firstAvailable) return 'Informações não disponíveis';
                              
                              // Extrair modelos únicos deste grupo específico
                              const uniqueModels = [...new Set(convGroup.orderedItems.map(item => item.modelo))];
                              const modelsText = uniqueModels.length > 1 
                                ? `Modelos: ${uniqueModels.join(', ')}` 
                                : `Modelo: ${uniqueModels[0]}`;
                              
                              return `${modelsText} • ${firstAvailable.sistema} • ${firstAvailable.data} ${firstAvailable.hora}`;
                            })()}
                          </div>
                        </div>

                        {/* Tokens e custos totais do conjunto */}
                        <div className="grid grid-cols-4 gap-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="text-center">
                            <div className="font-medium mb-1">Tokens Entrada</div>
                            <div className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {convGroup.orderedItems.reduce((sum, c) => sum + c.tokens_entrada, 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium mb-1">Tokens Saída</div>
                            <div className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {convGroup.orderedItems.reduce((sum, c) => sum + c.tokens_saida, 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium mb-1">Total Tokens</div>
                            <div className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-bold">
                              {convGroup.orderedItems.reduce((sum, c) => sum + c.tokens_entrada + c.tokens_saida, 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium mb-1">Custo Total</div>
                            <div className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-bold">
                              {formatCurrency(convGroup.orderedItems.reduce((sum, c) => sum + c.custo_total, 0))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pergunta do usuário (sempre mostrar primeiro) */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 dark:bg-blue-950 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {convGroup.orderedItems[0]?.username || 'Usuário'}
                            </span>
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            Pergunta do usuário
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-100">
                          {convGroup.userPrompt}
                        </p>
                      </div>

                      {/* Itens em ordem cronológica - respeitando a sequência temporal */}
                      {convGroup.orderedItems.map((item, itemIndex) => {
                        // Se for ferramenta
                        if (item.ferramentas && item.ferramentas !== "Não") {
                          return (
                            <div key={itemIndex} className="mb-3">
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 dark:bg-orange-950 dark:border-orange-800">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                      Agente consulta ferramenta: {item.ferramentas}
                                    </span>
                                  </div>
                                  <div className="text-xs text-orange-600 dark:text-orange-400">
                                    {item.data} {item.hora} • {formatCurrency(item.custo_total)}
                                  </div>
                                </div>
                                
                                {/* Informações de preço aplicado */}
                                <div className="mb-3">
                                  {renderPricingInfo(item)}
                                </div>
                                
                                {/* Mostrar o que foi enviado para a ferramenta */}
                                <div className="mb-3">
                                  <div className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                    Dados enviados para a ferramenta:
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap text-orange-900 dark:text-orange-100 bg-orange-100 dark:bg-orange-900 p-2 rounded">
                                    {item.prompt_usuário}
                                  </p>
                                </div>
                                
                                {/* Resultado da ferramenta */}
                                <div>
                                  <div className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                                    Resultado da ferramenta:
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap text-orange-900 dark:text-orange-100">
                                    {item.resposta_agente}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Se for "Saída não capturada" - mostrar como ativando ferramenta
                        if (item.resposta_agente === "Saída não capturada") {
                          return (
                            <div key={itemIndex} className="mb-3">
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 dark:bg-yellow-950 dark:border-yellow-800">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <Wrench className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-ping"></div>
                                    </div>
                                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                      Ativando ferramenta ({item.sistema})
                                    </span>
                                  </div>
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                    {item.data} {item.hora} • processando...
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                  </div>
                                  <span className="text-xs italic">Ferramenta sendo ativada, aguarde...</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        // Se for resposta normal do agente (não vazia)
                        if (item.resposta_agente !== "No response available") {
                          return (
                            <div key={itemIndex} className="mb-3">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 dark:bg-green-950 dark:border-green-800">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                      Resposta do agente ({item.sistema})
                                    </span>
                                  </div>
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    {item.data} {item.hora} • {formatCurrency(item.custo_total)}
                                  </div>
                                </div>
                                
                                {/* Informações de preço aplicado */}
                                <div className="mb-3">
                                  {renderPricingInfo(item)}
                                </div>
                                
                                <p className="text-sm whitespace-pre-wrap text-green-900 dark:text-green-100">
                                  {item.resposta_agente}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        // Não mostrar blocos vazios
                        return null;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};