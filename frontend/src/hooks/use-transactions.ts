import { useQuery } from "@tanstack/react-query";
import { transactionsService } from "@/services/transactions-service";
import { useAuth } from "@/context/auth-context";

export const transactionsQueryKey = "transactions";

export function useTransactions(params: { accountId?: string; page: number; limit: number }) {
  const { user } = useAuth();

  const userKey = user?.id ?? user?.email ?? "anonymous";

  return useQuery({
    queryKey: [transactionsQueryKey, userKey, params.accountId, params.page, params.limit],
    queryFn: () =>
      transactionsService.history({
        accountId: params.accountId as string,
        page: params.page,
        limit: params.limit,
      }),
    enabled: Boolean(user && params.accountId),
    retry: false,
    placeholderData: (previous) => previous,
  });
}
