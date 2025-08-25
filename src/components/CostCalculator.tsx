import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, DollarSign } from "lucide-react";
import { PricingConfig } from "@/types/conversation";

interface CostCalculatorProps {
  pricingConfigs: PricingConfig[];
}

export const CostCalculator = ({ pricingConfigs }: CostCalculatorProps) => {
  const [selectedModel, setSelectedModel] = useState("");
  const [inputTokens, setInputTokens] = useState<number>(1000000); // 1M tokens por padrão
  const [outputTokens, setOutputTokens] = useState<number>(1000000); // 1M tokens por padrão

  const selectedConfig = pricingConfigs.find(
    config => config.modelo === selectedModel
  );

  const calculateCost = () => {
    if (!selectedConfig) return 0;
    
    const inputCost = (inputTokens / 1000000) * selectedConfig.custo_token_entrada;
    const outputCost = (outputTokens / 1000000) * selectedConfig.custo_token_saida;
    
    return inputCost + outputCost;
  };

  const totalCost = calculateCost();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 8
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Como os cálculos são feitos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Como os Cálculos são Feitos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Fórmula de Cálculo:</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Custo de Entrada =</span> (Tokens de Entrada ÷ 1.000.000) × Preço por 1M tokens de entrada</p>
              <p><span className="font-medium">Custo de Saída =</span> (Tokens de Saída ÷ 1.000.000) × Preço por 1M tokens de saída</p>
              <p><span className="font-medium">Custo Total =</span> Custo de Entrada + Custo de Saída</p>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-2 text-blue-800">Exemplo Prático:</h4>
            <div className="text-sm text-blue-700">
              <p>Se um modelo custa $0.40 por 1M tokens de entrada e $1.60 por 1M tokens de saída:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>100.000 tokens de entrada = (100.000 ÷ 1.000.000) × $0.40 = $0.04</li>
                <li>50.000 tokens de saída = (50.000 ÷ 1.000.000) × $1.60 = $0.08</li>
                <li><strong>Custo total = $0.04 + $0.08 = $0.12</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulador de custos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Simulador de Custos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="model-select">Modelo</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set(pricingConfigs.map(c => c.modelo))].map(modelo => (
                    <SelectItem key={modelo} value={modelo}>
                      {modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="input-tokens">Tokens de Entrada</Label>
              <Input
                id="input-tokens"
                type="number"
                value={inputTokens}
                onChange={(e) => setInputTokens(Number(e.target.value))}
                placeholder="1000000"
              />
            </div>

            <div>
              <Label htmlFor="output-tokens">Tokens de Saída</Label>
              <Input
                id="output-tokens"
                type="number"
                value={outputTokens}
                onChange={(e) => setOutputTokens(Number(e.target.value))}
                placeholder="1000000"
              />
            </div>
          </div>

          {selectedConfig && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold mb-2 text-green-800">Resultado da Simulação:</h4>
              <div className="space-y-2 text-sm text-green-700">
                <p><span className="font-medium">Configuração:</span> {selectedConfig.modelo}</p>
                <p><span className="font-medium">Preço entrada:</span> ${selectedConfig.custo_token_entrada}/1M tokens</p>
                <p><span className="font-medium">Preço saída:</span> ${selectedConfig.custo_token_saida}/1M tokens</p>
                <div className="border-t border-green-300 pt-2 mt-2">
                  <p><span className="font-medium">Custo entrada:</span> {formatCurrency((inputTokens / 1000000) * selectedConfig.custo_token_entrada)}</p>
                  <p><span className="font-medium">Custo saída:</span> {formatCurrency((outputTokens / 1000000) * selectedConfig.custo_token_saida)}</p>
                  <p className="text-lg font-bold text-green-800"><span className="font-medium">Custo total:</span> {formatCurrency(totalCost)}</p>
                </div>
              </div>
            </div>
          )}

          {!selectedConfig && selectedModel && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">
                Nenhuma configuração de preço encontrada para {selectedModel}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};