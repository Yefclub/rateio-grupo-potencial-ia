import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Cpu, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface SystemFilterProps {
  systems: string[];
  selectedSystem: string;
  onSystemChange: (system: string) => void;
}

export const SystemFilter = ({ systems, selectedSystem, onSystemChange }: SystemFilterProps) => {
  const [open, setOpen] = useState(false);
  const sorted = [...(systems || [])].filter(Boolean).sort();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Sistema Ativo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 flex-nowrap overflow-hidden">
          <Button
            variant={selectedSystem === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => onSystemChange("all")}
            className="flex items-center gap-2"
          >
            <Cpu className="h-4 w-4" />
            Todos
          </Button>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant={selectedSystem !== "all" ? "default" : "outline"} size="sm" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Selecionar sistema
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-72" align="start">
              <Command>
                <CommandInput placeholder="Buscar sistema..." />
                <CommandList>
                  <CommandEmpty>Nenhum sistema encontrado.</CommandEmpty>
                  <CommandGroup heading="Sistemas disponíveis">
                    {sorted.map((system) => (
                      <CommandItem key={system} value={system} onSelect={() => { onSystemChange(system); setOpen(false); }}>
                        {system}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedSystem !== "all" && (
            <span className="text-sm text-muted-foreground ml-1 truncate max-w-[16rem]">
              {selectedSystem}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};