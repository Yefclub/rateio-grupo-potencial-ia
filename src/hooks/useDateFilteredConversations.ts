import { useMemo } from "react";
import { ConversationCost, DateFilterType, CustomDateRange } from "@/types/conversation";

export const useDateFilteredConversations = (
  conversations: ConversationCost[], 
  dateFilter: DateFilterType, 
  customDateRange?: CustomDateRange
) => {
  const filteredConversations = useMemo(() => {
    const now = new Date();
    
    return conversations.filter(conv => {
      const [day, month, yearRaw] = conv.data.split("/");
      const yearNum = yearRaw?.length === 2 ? parseInt(`20${yearRaw}`) : parseInt(yearRaw);
      const convDate = new Date(yearNum, parseInt(month) - 1, parseInt(day));
      
      switch (dateFilter) {
        case "today":
          return convDate.getDate() === now.getDate() &&
                 convDate.getMonth() === now.getMonth() &&
                 convDate.getFullYear() === now.getFullYear();
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return convDate >= weekAgo;
        case "month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          return convDate >= monthStart && convDate <= monthEnd;
        case "year":
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return convDate >= yearAgo;
        case "custom":
          if (customDateRange?.startDate && customDateRange?.endDate) {
            // Ajustar para incluir o dia inteiro
            const startDate = new Date(customDateRange.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(customDateRange.endDate);
            endDate.setHours(23, 59, 59, 999);

            return convDate >= startDate && convDate <= endDate;
          }
          return true;
        case "all":
        default:
          return true;
      }
    });
  }, [conversations, dateFilter, customDateRange]);

  return filteredConversations;
};