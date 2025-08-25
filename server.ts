import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import { ConfidentialClientApplication, Configuration, LogLevel } from "@azure/msal-node";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Suporte a caminhos ESM e arquivos estáticos do frontend (dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const candidateDist = [
  path.resolve(__dirname, "dist"),
  path.resolve(__dirname, "..", "..", "dist"),
  path.resolve(process.cwd(), "dist"),
];
const distPath = candidateDist.find((p) => {
  try { return fs.existsSync(p); } catch { return false; }
}) || path.resolve(process.cwd(), "dist");
app.set("trust proxy", 1);

// Carregar variáveis de ambiente
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const COOKIE_SECURE = (() => {
  const v = String(process.env.COOKIE_SECURE || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
})();

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "conv-cost-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
    },
  })
);

// Servir arquivos estáticos do SPA construído pelo Vite
app.use(express.static(distPath));

// Configuração MSAL Node (Confidential Client)
const msalConfig: Configuration = {
  auth: {
    clientId: AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    clientSecret: AZURE_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info,
      loggerCallback: (_level, message) => {
        if (!/access_token|id_token|refresh_token/i.test(message)) {
        }
      },
    },
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

const SCOPES = ["openid", "profile", "email", "User.Read"];

// Iniciar login: redireciona para o Azure
app.get("/auth/azure/login", async (req, res) => {
  const state = Math.random().toString(36).slice(2);
  (req.session as any).authState = state;

  const authCodeUrlParameters = {
    scopes: SCOPES,
    redirectUri: `${BASE_URL}/auth/azure/callback`,
    state,
  };

  try {
    const authUrl = await cca.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send("Falha ao iniciar login");
  }
});

// Callback do Azure: troca código por token
app.get("/auth/azure/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const savedState = (req.session as any).authState;

  if (!code) {
    return res.status(400).send("Código ausente");
  }
  if (!state || state !== savedState) {
    return res.status(400).send("Estado inválido");
  }

  const tokenRequest = {
    code,
    scopes: SCOPES,
    redirectUri: `${BASE_URL}/auth/azure/callback`,
  };

  try {
    const tokenResponse = await cca.acquireTokenByCode(tokenRequest);
    (req.session as any).account = tokenResponse.account;
    (req.session as any).accessToken = tokenResponse.accessToken;
    res.redirect("/");
  } catch (error) {
    res.status(500).send("Falha ao autenticar");
  }
});

// Retornar usuário autenticado
app.get("/auth/me", async (req, res) => {
  const accessToken = (req.session as any).accessToken;
  if (!accessToken) {
    return res.json({ authenticated: false });
  }

  try {
    const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!graphRes.ok) {
      return res.json({ authenticated: false });
    }
    const me = (await graphRes.json()) as any;
    return res.json({
      authenticated: true,
      user: {
        name: me.displayName,
        email: me.mail || me.userPrincipalName,
        photoUrl: "/auth/photo"
      },
    });
  } catch {
    return res.json({ authenticated: false });
  }
});

// Foto de perfil do usuário (proxy do Graph)
app.get("/auth/photo", async (req, res) => {
  const accessToken = (req.session as any).accessToken;
  if (!accessToken) {
    return res.status(401).end();
  }
  try {
    const photoRes = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!photoRes.ok) {
      return res.status(404).end();
    }
    res.setHeader("Content-Type", photoRes.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=300");
    const buffer = await photoRes.buffer();
    return res.end(buffer);
  } catch (e) {
    return res.status(500).end();
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// Rota coringa para SPA (depois dos endpoints /auth)
// Use um middleware sem path para capturar qualquer rota restante
app.use((_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
});


