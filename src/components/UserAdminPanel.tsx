import { useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/webhookAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlatformUser {
  nome: string;
  email: string;
  admin?: boolean;
  visualizador?: boolean;
  controladoria?: boolean;
}

export const UserAdminPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listUrl = import.meta.env.VITE_COLETAR_TODOS_USUARIOS_WEBHOOK_URL as string | undefined;
  const updateUrl = import.meta.env.VITE_ATUALIZAR_USUARIO_WEBHOOK_URL as string | undefined;

  const canUse = useMemo(() => !!listUrl && !!updateUrl, [listUrl, updateUrl]);

  const fetchUsers = async () => {
    if (!listUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(listUrl);
      if (!res.ok) throw new Error(`Erro ao buscar usuários: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(
          data.map((u) => ({
            nome: u.nome ?? u.name ?? "",
            email: u.email ?? "",
            admin: !!u.admin,
            visualizador: !!u.visualizador,
            controladoria: !!u.controladoria,
          }))
        );
      } else {
        throw new Error("Formato inesperado de resposta do webhook");
      }
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (user: PlatformUser) => {
    if (!updateUrl) return;
    setSavingEmail(user.email);
    try {
      const res = await fetchWithAuth(updateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: user.nome,
          email: user.email,
          admin: !!user.admin,
          visualizador: !!user.visualizador,
          controladoria: !!user.controladoria,
        }),
      });
      if (!res.ok) throw new Error(`Erro ao atualizar usuário: ${res.status}`);
      toast({ title: "Permissões atualizadas", description: `${user.nome || user.email}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha ao atualizar", description: e?.message || "Tente novamente" });
      throw e;
    } finally {
      setSavingEmail(null);
    }
  };

  const onToggle = async (email: string, key: keyof Pick<PlatformUser, "admin" | "visualizador" | "controladoria">) => {
    const idx = users.findIndex((u) => u.email === email);
    if (idx === -1) return;
    const prev = users[idx];
    const next: PlatformUser = { ...prev, [key]: !prev[key] } as PlatformUser;
    setUsers((arr) => arr.map((u, i) => (i === idx ? next : u)));
    try {
      await updateUser(next);
    } catch {
      // rollback em caso de falha
      setUsers((arr) => arr.map((u, i) => (i === idx ? prev : u)));
    }
  };

  useEffect(() => {
    if (!canUse) return;
    fetchUsers();
  }, [canUse]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Gerenciar Usuários</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </Button>
        </div>
      </div>

      {!canUse && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive text-sm">
              Configure VITE_COLETAR_TODOS_USUARIOS_WEBHOOK_URL e VITE_ATUALIZAR_USUARIO_WEBHOOK_URL no .env para habilitar este recurso.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Admin</th>
                    <th className="py-2 pr-4">Controladoria</th>
                    <th className="py-2 pr-4">Visualizador</th>
                    <th className="py-2 pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email} className="border-b last:border-0">
                      <td className="py-2 pr-4">{u.nome || "-"}</td>
                      <td className="py-2 pr-4">{u.email}</td>
                      <td className="py-2 pr-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!u.admin}
                            onChange={() => onToggle(u.email, "admin")}
                          />
                          <span>Admin</span>
                        </label>
                      </td>
                      <td className="py-2 pr-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!u.controladoria}
                            onChange={() => onToggle(u.email, "controladoria")}
                          />
                          <span>Controladoria</span>
                        </label>
                      </td>
                      <td className="py-2 pr-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!u.visualizador}
                            onChange={() => onToggle(u.email, "visualizador")}
                          />
                          <span>Visualizador</span>
                        </label>
                      </td>
                      <td className="py-2 pr-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => updateUser(u)}
                          disabled={savingEmail === u.email}
                        >
                          {savingEmail === u.email ? "Salvando..." : "Salvar"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
