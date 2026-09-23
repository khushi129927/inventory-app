import type { Product } from "@/app/types/inventory";

const branchAvailabilityCheck = {
  availableBranches: ["Downtown", "Airport"],
} satisfies Pick<Product, "availableBranches">;

export default branchAvailabilityCheck;
