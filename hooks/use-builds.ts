import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import type { SavedBuild } from "@/app/types/inventory";

export function useSavedBuilds() {
  return useQuery({
    queryKey: ["savedBuilds"],
    queryFn: () => apiRequest<{ builds: SavedBuild[] }>("/builds").then(res => res.builds),
  });
}

export function useSaveBuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SavedBuild>) => apiRequest<SavedBuild>("/builds", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedBuilds"] });
      toast.success("Build saved successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}

export function useDeleteBuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/builds/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedBuilds"] });
      toast.success("Build deleted successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}
