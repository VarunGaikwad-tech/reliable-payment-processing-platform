import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsService } from "@/services/accounts-service";
import { useAuth } from "@/context/auth-context";

export const accountsQueryKey = ["accounts"] as const;

export function useAccounts() {
  const { user } = useAuth();
  const userKey = user?.id ?? user?.email ?? "anonymous";

  return useQuery({
    queryKey: ["accounts", userKey],
    queryFn: () => accountsService.list(),
    retry: false,
    staleTime: 10_000,
    enabled: Boolean(user),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => accountsService.create(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
  });
}
