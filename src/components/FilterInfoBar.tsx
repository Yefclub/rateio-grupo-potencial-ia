import { CalendarDays } from "lucide-react";

interface FilterInfoBarProps {
  systemLabel: string;
  dateRange: { start: string | null; end: string | null };
}

export const FilterInfoBar = ({ systemLabel, dateRange }: FilterInfoBarProps) => {
  return (
    <div className="rounded-md border bg-muted/50 px-3 py-3 text-sm flex items-center justify-center">
      <span className="sr-only">Visualizando dados do sistema: {systemLabel}</span>
      <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 shadow-sm">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">Período:</span>
        {dateRange.start && dateRange.end ? (
          <span className="font-medium">{dateRange.start} — {dateRange.end}</span>
        ) : (
          <span className="font-medium">todos os registros</span>
        )}
      </div>
    </div>
  );
};
