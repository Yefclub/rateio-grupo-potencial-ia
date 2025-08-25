import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const LoginPage = () => {
  const { login, isAuthenticated, isLoading, username } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && username) {
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a), ${username}!`,
      });
      navigate("/");
    }
  }, [isAuthenticated, username, toast, navigate]);

  const handleAzureLogin = async () => {
    await login();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            Calculadora de Custos
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Faça login com sua conta Microsoft para acessar a plataforma
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleAzureLogin}
            className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Entrando...
              </>
            ) : (
              <>
                <svg 
                  className="h-4 w-4 mr-2" 
                  viewBox="0 0 23 23" 
                  fill="currentColor"
                >
                  <path d="M11.03 0v11.03H0V0h11.03zm0 11.97V23H0V11.97h11.03zm11.94 0V23H11.97V11.97h11zm0-11.94v11H11.97V0h11z"/>
                </svg>
                Entrar com Microsoft
              </>
            )}
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            Ao fazer login, você concorda com nossos termos de uso e política de privacidade.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};