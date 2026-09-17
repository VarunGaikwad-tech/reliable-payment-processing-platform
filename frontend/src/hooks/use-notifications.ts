import { useQuery } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications-service";
import { useAuth } from "@/context/auth-context";

export const notificationsQueryKey = ["notifications"] as const;

export function useNotifications() {
  const { user } = useAuth();

  const userKey = user?.id ?? user?.email ?? "anonymous";

  return useQuery({
    queryKey: ["notifications", userKey],
    queryFn: () => notificationsService.list(),
    retry: false,
    staleTime: 15_000,
    enabled: Boolean(user),
  });
}