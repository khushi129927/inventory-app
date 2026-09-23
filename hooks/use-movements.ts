import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  apiGetMovements,
  apiRecordMovement
} from "@/lib/api";

export function useMovements(filters?: any) {
  return useQuery({
    queryKey: ["movements", filters],
    queryFn: () => apiGetMovements(filters).then(res => res.movements),
  });
}

export function useRecordMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiRecordMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Movement recorded successfully");
    },
    onError: (error: any) => toast.error(error.message),
  });
}
