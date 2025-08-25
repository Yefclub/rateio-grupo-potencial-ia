import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationCost } from "@/types/conversation";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MonthlyComparisonChartProps {
  conversations: ConversationCost[];
  maxItems?: number; // Limitar número de meses para performance
}

interface MonthlyData {
  month: string;
  totalCost: number;
  conversationCount: number;
  averageCostPerConversation: number;
  priceChanges: Array<{
    modelo: string;
    oldPrice: number;
    newPrice: number;
    changeDate: string;
  }>;
}

export const MonthlyComparisonChart = ({ conversations, maxItems = 24 }: MonthlyComparisonChartProps) => {
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, MonthlyData>();
    
    // Otimização: sample dos dados se muito grande
    const dataToProcess = conversations.length > 50000 
      ? conversations.filter((_, index) => index % Math.ceil(conversations.length / 10000) === 0)
      : conversations;
    
    dataToProcess.forEach(conv => {
      // Parse date from DD/MM/YY format
      const [day, month, year] = conv.data.split("/");
      const monthKey = `20${year}-${month.padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          totalCost: 0,
          conversationCount: 0,
          averageCostPerConversation: 0,
          priceChanges: []
        });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.totalCost += conv.custo_total;
      monthData.conversationCount += 1;
    });
    
    // Calculate averages
    monthlyMap.forEach(data => {
      data.averageCostPerConversation = data.conversationCount > 0 
        ? data.totalCost / data.conversationCount 
        : 0;
    });
    
    const sortedData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    // Limitar quantidade de meses para performance
    return sortedData.slice(-maxItems);
  }, [conversations, maxItems]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6,
      maximumFractionDigits: 8
    }).format(value);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return `${month}/${year}`;
  };

  const getChangeIcon = (currentValue: number, previousValue: number) => {
    if (currentValue > previousValue) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (currentValue < previousValue) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangePercentage = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const getChangeColor = (percentage: number) => {
    if (percentage > 0) return "text-red-600";
    if (percentage < 0) return "text-green-600";
    return "text-gray-600";
  };

  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Comparação Mensal de Custos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Dados insuficientes para gerar comparação mensal
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Comparação Mensal de Custos
          <span className="text-sm font-normal text-muted-foreground">
            ({monthlyData.length} meses{conversations.length > 50000 ? ' • dados amostrados' : ''})
          </span>
          {conversations.length > 100000 && (
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
              🚀 {conversations.length.toLocaleString()} registros
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Gráfico visual simples com barras */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Custo Total por Mês</h4>
            <div className="space-y-2">
              {monthlyData.map((data, index) => {
                const maxCost = Math.max(...monthlyData.map(d => d.totalCost));
                const widthPercentage = (data.totalCost / maxCost) * 100;
                const previousData = index > 0 ? monthlyData[index - 1] : null;
                const changePercentage = previousData 
                  ? getChangePercentage(data.totalCost, previousData.totalCost) 
                  : 0;

                return (
                  <div key={data.month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{formatMonth(data.month)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{formatCurrency(data.totalCost)}</span>
                        {previousData && (
                          <div className="flex items-center gap-1">
                            {getChangeIcon(data.totalCost, previousData.totalCost)}
                            <span className={`text-xs ${getChangeColor(changePercentage)}`}>
                              {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {data.conversationCount} conversas • {formatCurrency(data.averageCostPerConversation)}/conversa
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela de dados detalhados */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Dados Detalhados</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Mês</th>
                    <th className="py-2 pr-4">Conversas</th>
                    <th className="py-2 pr-4">Custo Total</th>
                    <th className="py-2 pr-4">Custo/Conversa</th>
                    <th className="py-2 pr-4">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((data, index) => {
                    const previousData = index > 0 ? monthlyData[index - 1] : null;
                    const changePercentage = previousData 
                      ? getChangePercentage(data.totalCost, previousData.totalCost) 
                      : 0;

                    return (
                      <tr key={data.month} className="border-b">
                        <td className="py-2 pr-4 font-medium">{formatMonth(data.month)}</td>
                        <td className="py-2 pr-4">{data.conversationCount.toLocaleString()}</td>
                        <td className="py-2 pr-4 font-mono">{formatCurrency(data.totalCost)}</td>
                        <td className="py-2 pr-4 font-mono">{formatCurrency(data.averageCostPerConversation)}</td>
                        <td className="py-2 pr-4">
                          {previousData ? (
                            <div className="flex items-center gap-1">
                              {getChangeIcon(data.totalCost, previousData.totalCost)}
                              <span className={`text-sm ${getChangeColor(changePercentage)}`}>
                                {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">💡 Insights</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {monthlyData.length >= 2 && (
                <>
                  <div>
                    • Maior gasto: {formatMonth(monthlyData.reduce((max, current) => 
                      current.totalCost > max.totalCost ? current : max
                    ).month)} ({formatCurrency(Math.max(...monthlyData.map(d => d.totalCost)))})
                  </div>
                  <div>
                    • Menor gasto: {formatMonth(monthlyData.reduce((min, current) => 
                      current.totalCost < min.totalCost ? current : min
                    ).month)} ({formatCurrency(Math.min(...monthlyData.map(d => d.totalCost)))})
                  </div>
                  <div>
                    • Tendência geral: {(() => {
                      const firstMonth = monthlyData[0];
                      const lastMonth = monthlyData[monthlyData.length - 1];
                      const trend = getChangePercentage(lastMonth.totalCost, firstMonth.totalCost);
                      return trend > 0 
                        ? `📈 Aumento de ${trend.toFixed(1)}% no período`
                        : trend < 0 
                          ? `📉 Redução de ${Math.abs(trend).toFixed(1)}% no período`
                          : `➡️ Estável no período`;
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
