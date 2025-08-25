import { DateFilterType, CustomDateRange } from "@/types/conversation";

const BASE_SQL_QUERY = `SELECT 
    id,
    Modelo,
    Token_Entrada,
    Token_Saída,
    Token_Total,
    COALESCE(Seção, '') AS Seção,
    COALESCE(Prompt_Usuário, '') AS Prompt_Usuário,
    COALESCE(Resposta_Agente, '') AS Resposta_Agente,
    TO_CHAR(Data, 'DD/MM/YY') AS Data,
    TO_CHAR(Hora, 'HH24:MI:SS') AS Hora,
    COALESCE(sistema, '') AS Sistema,
    COALESCE(UserName, '') AS UserName,
    COALESCE(ferramentas, '') AS ferramentas,
    COALESCE(Email, '') AS Email,
    COALESCE(Setor, '') AS Setor
FROM rateio_token`;

const ORDER_BY_CLAUSE = `ORDER BY Data DESC, Hora DESC`;

/**
 * Gera query SQL completa baseada no filtro de data
 */
export const getSQLQueryFromFilter = (
  dateFilter: DateFilterType,
  customDateRange?: CustomDateRange
): string => {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  switch (dateFilter) {
    case "today":
      return `${BASE_SQL_QUERY}
WHERE EXTRACT(DAY FROM Data) = ${currentDay}
  AND EXTRACT(MONTH FROM Data) = ${currentMonth} 
  AND EXTRACT(YEAR FROM Data) = ${currentYear}
${ORDER_BY_CLAUSE}`;

    case "week":
      // Últimos 7 dias
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoDay = weekAgo.getDate();
      const weekAgoMonth = weekAgo.getMonth() + 1;
      const weekAgoYear = weekAgo.getFullYear();
      
      return `${BASE_SQL_QUERY}
WHERE Data >= TO_DATE('${weekAgoDay.toString().padStart(2, '0')}/${weekAgoMonth.toString().padStart(2, '0')}/${weekAgoYear}', 'DD/MM/YYYY')
  AND Data <= TO_DATE('${currentDay.toString().padStart(2, '0')}/${currentMonth.toString().padStart(2, '0')}/${currentYear}', 'DD/MM/YYYY')
${ORDER_BY_CLAUSE}`;

    case "month":
      // Mês corrente: do dia 1 ao último dia do mês atual
      const firstDay = 1;
      const firstMonth = currentMonth;
      const firstYear = currentYear;
      const lastDate = new Date(currentYear, currentMonth, 0); // dia 0 do mês seguinte => último dia do mês atual
      const lastDay = lastDate.getDate();
      const lastMonth = currentMonth;
      const lastYear = currentYear;
      return `${BASE_SQL_QUERY}
WHERE Data >= TO_DATE('${firstDay.toString().padStart(2, '0')}/${firstMonth.toString().padStart(2, '0')}/${firstYear}', 'DD/MM/YYYY')
  AND Data <= TO_DATE('${lastDay.toString().padStart(2, '0')}/${lastMonth.toString().padStart(2, '0')}/${lastYear}', 'DD/MM/YYYY')
${ORDER_BY_CLAUSE}`;

    case "year":
      // Último ano (365 dias)
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const yearAgoDay = yearAgo.getDate();
      const yearAgoMonth = yearAgo.getMonth() + 1;
      const yearAgoYear = yearAgo.getFullYear();
      
      return `${BASE_SQL_QUERY}
WHERE Data >= TO_DATE('${yearAgoDay.toString().padStart(2, '0')}/${yearAgoMonth.toString().padStart(2, '0')}/${yearAgoYear}', 'DD/MM/YYYY')
  AND Data <= TO_DATE('${currentDay.toString().padStart(2, '0')}/${currentMonth.toString().padStart(2, '0')}/${currentYear}', 'DD/MM/YYYY')
${ORDER_BY_CLAUSE}`;

    case "custom":
      if (customDateRange?.startDate && customDateRange?.endDate) {
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        
        const startDay = startDate.getDate();
        const startMonth = startDate.getMonth() + 1;
        const startYear = startDate.getFullYear();
        
        const endDay = endDate.getDate();
        const endMonth = endDate.getMonth() + 1;
        const endYear = endDate.getFullYear();
        
        return `${BASE_SQL_QUERY}
WHERE Data >= TO_DATE('${startDay.toString().padStart(2, '0')}/${startMonth.toString().padStart(2, '0')}/${startYear}', 'DD/MM/YYYY')
  AND Data <= TO_DATE('${endDay.toString().padStart(2, '0')}/${endMonth.toString().padStart(2, '0')}/${endYear}', 'DD/MM/YYYY')
${ORDER_BY_CLAUSE}`;
      }
      // Fallback para todos se não houver range customizado
      return `${BASE_SQL_QUERY}
${ORDER_BY_CLAUSE}`;

    case "all":
    default:
      // Todos os dados sem filtro
      return `${BASE_SQL_QUERY}
${ORDER_BY_CLAUSE}`;
  }
};

/**
 * Converte query SQL para parâmetros de URL encodados
 */
export const buildSQLWebhookParams = (sqlQuery: string): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('query', sqlQuery);
  return params;
};

/**
 * Retorna o intervalo de datas (início e fim) correspondente ao filtro selecionado
 * no formato DD/MM/YYYY. Para "all" retorna nulls.
 */
export const getDateRangeFromFilter = (
  dateFilter: DateFilterType,
  customDateRange?: CustomDateRange
): { start: string | null; end: string | null } => {
  const fmt = (d: Date) => {
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const now = new Date();

  switch (dateFilter) {
    case 'today': {
      const start = new Date(now);
      const end = new Date(now);
      return { start: fmt(start), end: fmt(end) };
    }
    case 'week': {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: fmt(weekAgo), end: fmt(now) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês
      return { start: fmt(start), end: fmt(end) };
    }
    case 'year': {
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return { start: fmt(yearAgo), end: fmt(now) };
    }
    case 'custom': {
      if (customDateRange?.startDate && customDateRange?.endDate) {
        return { start: fmt(new Date(customDateRange.startDate)), end: fmt(new Date(customDateRange.endDate)) };
      }
      return { start: null, end: null };
    }
    case 'all':
    default:
      return { start: null, end: null };
  }
};
