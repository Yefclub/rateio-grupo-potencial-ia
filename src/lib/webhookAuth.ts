/**
 * Utilitários para autenticação HTTP em webhooks
 */

export interface WebhookAuthConfig {
  headers: Record<string, string>;
}

/**
 * Constrói configuração de autenticação para webhooks
 */
export const getWebhookAuthConfig = (): WebhookAuthConfig => {
  const authName = import.meta.env.VITE_HTTP_REQUEST_NAME;
  const authValue = import.meta.env.VITE_HTTP_REQUEST_VALOR;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Adicionar header de autenticação se as variáveis estiverem configuradas
  if (authName && authValue) {
    headers[authName] = authValue;
  }
  
  return { headers };
};

/**
 * Faz uma requisição autenticada para webhook
 */
export const fetchWithAuth = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const authConfig = getWebhookAuthConfig();
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...authConfig.headers,
      ...options.headers,
    },
  };
  
  return fetch(url, requestOptions);
};
