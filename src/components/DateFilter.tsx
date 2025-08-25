import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays, CalendarRange, CalendarX2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateFilterType, CustomDateRange } from "@/types/conversation";

export type { DateFilterType };
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  selectedFilter: DateFilterType;
  onFilterChange: (filter: DateFilterType) => void;
  customDateRange?: CustomDateRange;
  onCustomDateChange?: (range: CustomDateRange) => void;
}

export const DateFilter = ({ selectedFilter, onFilterChange, customDateRange, onCustomDateChange }: DateFilterProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(customDateRange?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(customDateRange?.endDate);
  const [open, setOpen] = useState(false);

  const filters = [
    { key: "today" as DateFilterType, label: "Hoje", icon: Calendar },
    { key: "week" as DateFilterType, label: "Semana", icon: Calendar },
    { key: "month" as DateFilterType, label: "Mês", icon: CalendarDays },
    { key: "year" as DateFilterType, label: "Ano", icon: CalendarRange },
  ];

  const handleCustomDateApply = () => {
    if (startDate && endDate && onCustomDateChange) {
      onCustomDateChange({ startDate, endDate });
      onFilterChange("custom");
      setOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filtro de Período</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {filters.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={selectedFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(key)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
              {selectedFilter === key && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Ativo
                </Badge>
              )}
            </Button>
          ))}
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={selectedFilter === "custom" ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <CalendarX2 className="h-4 w-4" />
                Período Personalizado
                {selectedFilter === "custom" && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Ativo
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto max-w-4xl p-0" align="start">
              <div className="p-4">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Inicial</label>
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className={cn("p-3 pointer-events-auto border rounded-md")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Final</label>
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      className={cn("p-3 pointer-events-auto border rounded-md")}
                    />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={handleCustomDateApply}
                    disabled={!startDate || !endDate}
                    className="w-full"
                  >
                    Aplicar Filtro
                  </Button>
                  {startDate && endDate && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
};