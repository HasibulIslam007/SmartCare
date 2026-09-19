"use client";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, User } from "@/services/api";
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api<User>("users/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 30000,
  });
}
