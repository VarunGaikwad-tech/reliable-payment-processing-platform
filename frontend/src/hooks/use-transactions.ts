import { useQuery } from "@tanstack/react-query";
import { transactionsService } from "@/services/transactions-service";

export const transactionsQueryKey = "transactions";

export function useTransactions(params: { accountId?: string; page: number; limit: number }) {
  return useQuery({
    queryKey: [transactionsQueryKey, params.accountId, params.page, params.limit],
    queryFn: () =>
      transactionsService.history({
        accountId: params.accountId as string,
        page: params.page,
        limit: params.limit,
      }),
    enabled: Boolean(params.accountId),
    retry: false,
    placeholderData: (previous) => previous,
  });
}
