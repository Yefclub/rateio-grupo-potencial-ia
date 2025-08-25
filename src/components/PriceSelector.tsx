import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";

interface PriceSelectorProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PriceSelector({ value, onChange, placeholder = "0", disabled }: PriceSelectorProps) {
  const [inputValue, setInputValue] = useState(formatValue(value));

  function formatValue(val: number): string {
    return val.toString().replace('.', ',');
  }

  function parseValue(val: string): number {
    if (val === '' || val === '0') return 0;
    const cleanValue = val.replace(',', '.');
    const numValue = parseFloat(cleanValue);
    return isNaN(numValue) ? 0 : numValue;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Atualizar valor em tempo real
    const parsedValue = parseValue(newValue);
    onChange(parsedValue);
  };

  const handleBlur = () => {
    // Formatar valor ao sair do campo
    const parsedValue = parseValue(inputValue);
    const formattedValue = formatValue(parsedValue);
    setInputValue(formattedValue);
  };

  // Atualizar inputValue quando value prop mudar externamente
  useEffect(() => {
    setInputValue(formatValue(value));
  }, [value]);

  return (
    <div className="relative">
      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-10"
      />
    </div>
  );
}