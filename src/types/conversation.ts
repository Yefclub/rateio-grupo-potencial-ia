export interface ConversationData {
  id: number;
  modelo: string;
  token_entrada: number;
  token_saída: number;
  token_total: number;
  seção: string;
  prompt_usuário: string;
  resposta_agente: string;
  data: string;
  hora: string;
  sistema: string;
  username?: string;
  email?: string;
  setor?: string;
  ferramentas?: string;
}

export interface WebhookResponse {
  data: ConversationData[];
}

export interface PricingConfig {
  modelo: string;
  custo_token_entrada: number;
  custo_token_saida: number;
  moeda: string;
}

export interface WebhookPricingData {
  modelo: string;
  entrada: string;
  saida: string;
  moeda: string;
  data: string; // ISO string da vigência do preço
  ID: string; // ID único do registro de preço
  ativo?: number; // 1 ou 0 - indica se é o preço ativo atual
}

export interface WebhookPricingResponse {
  data: WebhookPricingData[];
}

// Configuração de preço com data de vigência
export interface DatedPricingConfig {
  modelo: string;
  custo_token_entrada: number;
  custo_token_saida: number;
  moeda: string;
  dataISO: string; // ISO da vigência (ex.: 2025-08-21T03:00:00.000Z)
  id: string; // ID único do registro
  ativo: boolean; // Se é o preço ativo atual
}

export interface ConversationCost {
  id: number;
  custo_entrada: number;
  custo_saida: number;
  custo_total: number;
  modelo: string;
  sistema: string;
  seção: string;
  tokens_entrada: number;
  tokens_saida: number;
  data: string;
  hora: string;
  prompt_usuário: string;
  resposta_agente: string;
  has_pricing: boolean;
  username?: string;
  email?: string;
  setor?: string;
  ferramentas?: string;
  // Data de preço aplicada no cálculo (ISO)
  data_preco_vigente?: string;
  // Informações detalhadas do preço aplicado
  pricing_info?: {
    id: string;
    entrada_valor: number;
    saida_valor: number;
    moeda: string;
    data_vigencia: string;
  };
}

export interface GroupedConversation {
  seção: string;
  sistema: string;
  modelo: string;
  total_conversas: number;
  custo_total: number;
  tokens_entrada_total: number;
  tokens_saida_total: number;
  data_inicio: string;
  hora_inicio: string;
  data_fim: string;
  hora_fim: string;
  conversas: ConversationCost[];
}

export type DateFilterType = "today" | "week" | "month" | "year" | "all" | "custom";

export interface CustomDateRange {
  startDate?: Date;
  endDate?: Date;
}