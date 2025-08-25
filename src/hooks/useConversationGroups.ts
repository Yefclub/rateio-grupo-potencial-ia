import { useMemo } from "react";
import { ConversationCost, GroupedConversation } from "@/types/conversation";

// Adicionando um tipo para os modos de agrupamento
export type GroupingMode = "section" | "user" | "sector";

export const useConversationGroups = (
  conversations: ConversationCost[], 
  systemFilter: string,
  groupingMode: GroupingMode = "section"
) => {
  const groupedConversations = useMemo(() => {
    // Primeiro, filtrar por sistema
    let systemFiltered = conversations;
    if (systemFilter !== "all") {
      systemFiltered = conversations.filter(conv => conv.sistema === systemFilter);
    }

    // Agrupar com base no modo selecionado
    let groups: Record<string, ConversationCost[]> = {};
    
    switch (groupingMode) {
      case "user":
        groups = systemFiltered.reduce((acc, conv) => {
          const username = conv.username || "Anônimo";
          if (!acc[username]) {
            acc[username] = [];
          }
          acc[username].push(conv);
          return acc;
        }, {} as Record<string, ConversationCost[]>);
        break;
      
      case "sector":
        groups = systemFiltered.reduce((acc, conv) => {
          const setor = conv.setor || "Sem Setor";
          if (!acc[setor]) {
            acc[setor] = [];
          }
          acc[setor].push(conv);
          return acc;
        }, {} as Record<string, ConversationCost[]>);
        break;
      
      case "section":
      default:
        groups = systemFiltered.reduce((acc, conv) => {
          if (!acc[conv.seção]) {
            acc[conv.seção] = [];
          }
          acc[conv.seção].push(conv);
          return acc;
        }, {} as Record<string, ConversationCost[]>);
        break;
    }

    // Converter para formato de grupos simples
    const result = Object.entries(groups).map(([groupKey, conversas]) => {
      const totalCost = conversas.reduce((sum, conv) => sum + conv.custo_total, 0);
      const totalTokens = conversas.reduce((sum, conv) => sum + conv.tokens_entrada + conv.tokens_saida, 0);

      return {
        seção: groupKey,
        conversations: conversas.sort((a, b) => b.id - a.id),
        totalCost,
        totalTokens
      };
    });

    return result.sort((a, b) => b.totalCost - a.totalCost);
  }, [conversations, systemFilter, groupingMode]);

  const availableSystems = useMemo(() => {
    const systems = [...new Set(conversations.map(conv => conv.sistema))];
    return systems.sort();
  }, [conversations]);

  return {
    groupedConversations,
    availableSystems
  };
};