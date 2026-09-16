import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsService } from "@/services/accounts-service";

export const accountsQueryKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery({
    queryKey: accountsQueryKey,
    queryFn: () => accountsService.list(),
    retry: false,
    staleTime: 10_000,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountsService.create(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  });
}
