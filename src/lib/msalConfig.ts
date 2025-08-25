import { Configuration, RedirectRequest, PopupRequest, PublicClientApplication } from '@azure/msal-browser';

// Configuração do Azure AD para aplicação híbrida (Web + SPA)
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.AZURE_CLIENT_ID || "555558d1-7d16-4ea9-a567-09c071fc0416", // Application (client) ID
    authority: `https://login.microsoftonline.com/${import.meta.env.AZURE_TENANT_ID || "94c51cfc-8e26-43d3-9f38-fa4b6fefc419"}`, // Directory (tenant) ID
    redirectUri: window.location.origin + "/", // URL de redirecionamento
    postLogoutRedirectUri: window.location.origin + "/", // URL após logout
    navigateToLoginRequestUrl: false, // Para aplicações Web
  },
  cache: {
    cacheLocation: "sessionStorage", // Para aplicações Web, usar sessionStorage
    storeAuthStateInCookie: true, // Necessário para aplicações Web
  },
  system: {
    allowNativeBroker: false,
    loggerOptions: {
      logLevel: 1, // Error = 0, Warning = 1, Info = 2, Verbose = 3
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0:
            return;
          case 1:
            return;
          case 2:
            return;
          case 3:
            return;
          default:
            return;
        }
      },
    },
  },
};

// Escopos para solicitação de token (usando redirect)
export const loginRequest: RedirectRequest = {
  scopes: ["User.Read"],
  redirectUri: window.location.origin + "/",
};

// Configuração para popup (fallback)
export const popupRequest: PopupRequest = {
  scopes: ["User.Read"],
};

// Configuração para Graph API
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

// Singleton MSAL instance para evitar duplicações
let msalInstanceSingleton: PublicClientApplication | null = null;

export const getMsalInstance = (): PublicClientApplication => {
  if (!msalInstanceSingleton) {
    msalInstanceSingleton = new PublicClientApplication(msalConfig);
  }
  return msalInstanceSingleton;
};
