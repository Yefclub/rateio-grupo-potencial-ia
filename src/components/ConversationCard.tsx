import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Clock, DollarSign, Zap, ChevronDown, ChevronRight, User, Bot } from "lucide-react";
import { ConversationCost } from "@/types/conversation";

interface ConversationCardProps {
  conversation: ConversationCost;
}

export const ConversationCard = ({ conversation }: ConversationCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === "BRL" ? "BRL" : "USD",
      minimumFractionDigits: 6,
      maximumFractionDigits: 8
    }).format(value);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Conversa #{conversation.id}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {conversation.data} às {conversation.hora}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">{conversation.modelo}</Badge>
              <Badge variant="outline">{conversation.sistema}</Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Usuário</span>
                </div>
                <p className="text-sm text-blue-900">{conversation.prompt_usuário}</p>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Agente</span>
                </div>
                <p className="text-sm text-green-900">{conversation.resposta_agente}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-info" />
                  Tokens
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Entrada:</span>
                    <span className="font-mono">{conversation.tokens_entrada.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saída:</span>
                    <span className="font-mono">{conversation.tokens_saida.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total:</span>
                    <span className="font-mono">{(conversation.tokens_entrada + conversation.tokens_saida).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-success" />
                  Custos
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Entrada:</span>
                    <span className="font-mono">{formatCurrency(conversation.custo_entrada)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saída:</span>
                    <span className="font-mono">{formatCurrency(conversation.custo_saida)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1 text-success">
                    <span>Total:</span>
                    <span className="font-mono">{formatCurrency(conversation.custo_total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Seção</div>
                <div className="text-xs bg-muted p-2 rounded font-mono break-all">
                  {conversation.seção}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};