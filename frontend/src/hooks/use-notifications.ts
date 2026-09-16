import { useQuery } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications-service";

export const notificationsQueryKey = ["notifications"] as const;

export function useNotifications() {
  return useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => notificationsService.list(),
    retry: false,
    staleTime: 15_000,
  });
}
