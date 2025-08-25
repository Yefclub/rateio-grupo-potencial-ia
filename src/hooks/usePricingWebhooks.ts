import { useState, useEffect } from "react";
import { PricingConfig, WebhookPricingResponse, DatedPricingConfig } from "@/types/conversation";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/webhookAuth";

const FETCH_PRICING_URL = import.meta.env.VITE_FETCH_PRICING_WEBHOOK_URL;
const SAVE_PRICING_URL = import.meta.env.VITE_SAVE_PRICING_WEBHOOK_URL;

export const usePricingWebhooks = () => {
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);
  const [datedPricingConfigs, setDatedPricingConfigs] = useState<DatedPricingConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPricingConfigs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth(FETCH_PRICING_URL);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      
      const result: WebhookPricingResponse = await response.json();
      
      // Converter dados do webhook para formato interno (com vigência)
      const datedConfigs: DatedPricingConfig[] = result.data.map(item => ({
        modelo: item.modelo,
        custo_token_entrada: parseFloat(item.entrada),
        custo_token_saida: parseFloat(item.saida),
        moeda: item.moeda,
        dataISO: item.data,
        id: item.ID,
        ativo: Boolean(
          (typeof item.ativo === 'number' && item.ativo === 1) ||
          (typeof item.ativo === 'string' && (item.ativo === "1" || item.ativo === "true")) ||
          (typeof item.ativo === 'boolean' && item.ativo === true)
        )
      }));

      // Gerar visão atual (priorizar ativo, depois última vigência por modelo)
      const latestByModel = new Map<string, DatedPricingConfig>();
      datedConfigs.forEach(cfg => {
        const prev = latestByModel.get(cfg.modelo);
        if (!prev) {
          latestByModel.set(cfg.modelo, cfg);
        } else {
          // Priorizar o ativo, se não houver ativo, usar o mais recente por data
          const shouldReplace = cfg.ativo && !prev.ativo || 
                               (!cfg.ativo && !prev.ativo && new Date(cfg.dataISO) > new Date(prev.dataISO)) ||
                               (cfg.ativo && prev.ativo && new Date(cfg.dataISO) > new Date(prev.dataISO));
          if (shouldReplace) {
            latestByModel.set(cfg.modelo, cfg);
          }
        }
      });

      const configs: PricingConfig[] = Array.from(latestByModel.values()).map(item => ({
        modelo: item.modelo,
        custo_token_entrada: item.custo_token_entrada,
        custo_token_saida: item.custo_token_saida,
        moeda: item.moeda
      }));

      setDatedPricingConfigs(datedConfigs);
      setPricingConfigs(configs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: `Erro ao buscar configurações: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePricingConfig = async (config: PricingConfig) => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar se existe um modelo ativo anterior que precisa ser desativado
      const existingActiveConfig = datedPricingConfigs?.find(d => 
        d.modelo === config.modelo && d.ativo
      );

      const now = new Date();
      const dataHoraAtual = now.toISOString();

      const requestBody = {
        Modelo: config.modelo,
        Entrada: config.custo_token_entrada.toString(),
        Saída: config.custo_token_saida.toString(),
        Moeda: config.moeda,
        DataHora: dataHoraAtual,
        Ativo: 1,
        // Se há um modelo ativo anterior, incluir informações para desativá-lo
        ...(existingActiveConfig && {
          ModeloAnteriorID: existingActiveConfig.id,
          ModeloAnteriorAtivo: 0
        })
      };

      const response = await fetchWithAuth(SAVE_PRICING_URL, {
        method: "POST",
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro ao salvar: ${response.status}`);
      }

      const isNewVersion = !!existingActiveConfig;
      toast({
        title: "Sucesso",
        description: isNewVersion 
          ? `Nova versão criada para ${config.modelo}. Versão anterior desativada.`
          : "Configuração salva com sucesso",
      });

      // Recarregar configurações após salvar
      await fetchPricingConfigs();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: `Erro ao salvar configuração: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };



  // Buscar configurações iniciais
  useEffect(() => {
    fetchPricingConfigs();
  }, []);

  return {
    pricingConfigs,
    datedPricingConfigs,
    loading,
    error,
    savePricingConfig,
    fetchPricingConfigs,
    setPricingConfigs
  };
};