import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationCost } from "@/types/conversation";
import { useTheme } from "@/components/ThemeProvider";

interface MonthlyCostComparisonProps {
  conversations: ConversationCost[];
  maxItems?: number; // Limit number of months to display
}

export const MonthlyCostComparison = ({ conversations, maxItems = 24 }: MonthlyCostComparisonProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { categories, totalCostSeries, countSeries } = useMemo(() => {
    const monthlyMap = new Map<string, { total: number; count: number }>();

    const dataToProcess = conversations.length > 50000
      ? conversations.filter((_, index) => index % Math.ceil(conversations.length / 10000) === 0)
      : conversations;

    for (const conv of dataToProcess) {
      // conv.data expected format: DD/MM/YY or DD/MM/YYYY
      const parts = (conv.data || "").split("/");
      if (parts.length < 3) continue;
      const day = parts[0]?.padStart(2, "0");
      const month = parts[1]?.padStart(2, "0");
      const yearRaw = parts[2] || "";
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw; // normalize to YYYY
      if (!month || !year) continue;
      const key = `${year}-${month}`; // YYYY-MM
      const cur = monthlyMap.get(key) || { total: 0, count: 0 };
      cur.total += Number(conv.custo_total || 0);
      cur.count += 1;
      monthlyMap.set(key, cur);
    }

    const sortedKeys = Array.from(monthlyMap.keys()).sort((a, b) => a.localeCompare(b));
    const limitedKeys = sortedKeys.slice(-maxItems);

    const categories = limitedKeys.map((k) => {
      const [y, m] = k.split("-");
      return `${m}/${y}`; // MM/YYYY for display
    });

    const totals = limitedKeys.map((k) => monthlyMap.get(k)!.total);
    const counts = limitedKeys.map((k) => monthlyMap.get(k)!.count);

    return {
      categories,
      totalCostSeries: totals,
      countSeries: counts,
    };
  }, [conversations, maxItems]);

  const monthsCount = categories.length;

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 6,
    maximumFractionDigits: 8,
  }).format(value);

  if (monthsCount === 0) {
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

  const options: ApexOptions = {
    chart: {
      type: "line",
      height: 380,
      toolbar: { show: false },
      background: "transparent",
    },
    theme: { mode: isDark ? "dark" : "light" },
    stroke: {
      width: [3, 3],
      curve: "smooth",
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories,
      labels: { rotate: -30 },
    },
    yaxis: [
      {
        seriesName: "Custo Total (USD)",
        title: { text: "Custo Total (USD)" },
        decimalsInFloat: 6,
        labels: {
          formatter: (val: number) => (val >= 1e-6 ? formatCurrency(val) : String(val)),
        },
      },
      {
        seriesName: "Conversas",
        opposite: true,
        title: { text: "Conversas" },
        labels: { formatter: (val: number) => `${Math.round(val)}` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number, { seriesIndex }) => {
          if (seriesIndex === 0) return formatCurrency(val);
          return `${Math.round(val)}`;
        },
      },
    },
    legend: { show: false },
    colors: isDark ? ["#60a5fa", "#fbbf24"] : ["#2563eb", "#f59e0b"],
  };

  type LineSeries = { name: string; type: "line"; data: number[] }[];
  const series: LineSeries = [
    {
      name: "Custo Total (USD)",
      type: "line",
      data: totalCostSeries,
    },
    {
      name: "Conversas",
      type: "line",
      data: countSeries,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Comparação Mensal de Custos
          <span className="text-sm font-normal text-muted-foreground">({monthsCount} meses{conversations.length > 50000 ? " • dados amostrados" : ""})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Chart options={options} series={series} type="line" height={380} />
      </CardContent>
    </Card>
  );
};
