import { useState, useEffect } from "react";
import { ConversationData, WebhookResponse, PricingConfig, ConversationCost, DatedPricingConfig, DateFilterType, CustomDateRange } from "@/types/conversation";
import { getSQLQueryFromFilter, buildSQLWebhookParams } from "@/lib/dateFilterUtils";
import { fetchWithAuth } from "@/lib/webhookAuth";

const WEBHOOK_URL = import.meta.env.VITE_CONVERSATION_WEBHOOK_URL;

export const useWebhookData = (
  pricingConfigs: PricingConfig[], 
  datedPricingConfigs?: DatedPricingConfig[],
  dateFilter?: DateFilterType,
  customDateRange?: CustomDateRange,
  emailFilter?: string
) => {
  const [data, setData] = useState<ConversationData[]>([]);
  const [conversationCosts, setConversationCosts] = useState<ConversationCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = WEBHOOK_URL;
      
      // Gerar query SQL baseada no filtro de data
      const sqlQuery = getSQLQueryFromFilter(dateFilter || "all", customDateRange);
      const params = buildSQLWebhookParams(sqlQuery);
      if (emailFilter) {
        params.append('email', emailFilter);
      }
      
      // Adicionar parâmetros à URL
      if (params.toString()) {
        url += (WEBHOOK_URL.includes('?') ? '&' : '?') + params.toString();
      }
      
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      
      const result: WebhookResponse = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const calculateCosts = (conversations: ConversationData[]): ConversationCost[] => {
    return conversations.map(conv => {
      // Determinar data/hora da conversa com precisão
      const [day, month, year] = conv.data.split("/");
      const [hours, minutes, seconds] = (conv.hora || "00:00:00").split(":");
      const convDate = new Date(`20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${(seconds || '00').padStart(2, '0')}`);

      // REGRA CRÍTICA: Selecionar preço vigente ESTRITAMENTE baseado na data
      let appliedPricing: { 
        custo_token_entrada: number; 
        custo_token_saida: number; 
        moeda: string;
        id: string;
        dataISO: string;
      } | undefined;

      if (datedPricingConfigs && datedPricingConfigs.length > 0) {
        // Filtrar apenas preços que estavam vigentes NA OU ANTES da data da conversa
        const validPrices = datedPricingConfigs
          .filter(d => d.modelo === conv.modelo)
          .filter(d => {
            const priceDate = new Date(d.dataISO);
            // CRÍTICO: Preço só é válido se foi definido ANTES ou NA MESMA data/hora da conversa
            return priceDate <= convDate;
          })
          .sort((a, b) => new Date(b.dataISO).getTime() - new Date(a.dataISO).getTime());

        // Pegar o preço mais recente que estava vigente no momento da conversa
        const selected = validPrices[0];
        if (selected) {
          appliedPricing = {
            custo_token_entrada: selected.custo_token_entrada,
            custo_token_saida: selected.custo_token_saida,
            moeda: selected.moeda,
            id: selected.id,
            dataISO: selected.dataISO
          };
        }
      }

      // Se não encontrou preço histórico válido, tentar fallback (mas com validação de data)
      if (!appliedPricing) {
        const pricing = pricingConfigs.find(config => config.modelo === conv.modelo);
        if (pricing) {
          // Verificar se existe configuração datada para esse modelo
          const hasDatedConfig = datedPricingConfigs?.some(d => d.modelo === conv.modelo);
          
          if (hasDatedConfig) {
            // Se existe configuração datada mas não foi encontrada válida, 
            // significa que a conversa é anterior a qualquer preço definido
            // NESTE CASO, NÃO CALCULAR CUSTO
            appliedPricing = undefined;
          } else {
            // Se não há configuração datada, usar a configuração atual (compatibilidade)
            appliedPricing = {
              custo_token_entrada: pricing.custo_token_entrada,
              custo_token_saida: pricing.custo_token_saida,
              moeda: pricing.moeda,
              id: "legacy",
              dataISO: "N/A"
            };
          }
        }
      }

      let custo_entrada = 0;
      let custo_saida = 0;

      if (appliedPricing) {
        // Cálculo correto: custo por milhão de tokens
        custo_entrada = (conv.token_entrada / 1000000) * appliedPricing.custo_token_entrada;
        custo_saida = (conv.token_saída / 1000000) * appliedPricing.custo_token_saida;
      }

      return {
        id: conv.id,
        custo_entrada,
        custo_saida,
        custo_total: custo_entrada + custo_saida,
        modelo: conv.modelo,
        sistema: conv.sistema,
        seção: conv.seção,
        tokens_entrada: conv.token_entrada,
        tokens_saida: conv.token_saída,
        data: conv.data,
        hora: conv.hora,
        prompt_usuário: conv.prompt_usuário,
        resposta_agente: conv.resposta_agente,
        has_pricing: !!appliedPricing,
        data_preco_vigente: appliedPricing?.dataISO,
        pricing_info: appliedPricing ? {
          id: appliedPricing.id,
          entrada_valor: appliedPricing.custo_token_entrada,
          saida_valor: appliedPricing.custo_token_saida,
          moeda: appliedPricing.moeda,
          data_vigencia: appliedPricing.dataISO
        } : undefined,
        username: conv.username,
        email: conv.email,
        setor: conv.setor,
        ferramentas: conv.ferramentas
      };
    });
  };

  // Recalcula custos quando os dados ou configurações mudam
  useEffect(() => {
    if (data.length > 0) {
      const costs = calculateCosts(data);
      setConversationCosts(costs);
    }
  }, [data, pricingConfigs, datedPricingConfigs]);

  // Busca dados iniciais e quando filtros mudarem
  useEffect(() => {
    fetchData();
  }, [dateFilter, customDateRange, emailFilter]);

  return {
    data,
    conversationCosts,
    loading,
    error,
    refetch: fetchData
  };
};