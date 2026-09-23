"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth-store";
import type { Category } from "@/app/types/inventory";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import CategoryGrid from "@/components/categories/category-grid";
import CategoryDialog from "@/components/categories/category-dialog";
import DeleteCategoryDialog from "@/components/categories/delete-category-dialog";
import Icon from "@/components/Icon";
import { apiGetCategories } from "@/lib/api";

export default function CategoriesPage() {
  const currentUser = useAuthStore((s) => s.currentUser);

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGetCategories().then(res => res.categories),
  });

  const categories = data || [];

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null);

  const handleCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
    setDeleteOpen(true);
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="page-content">
      <div className="flex flex-col gap-4 rounded-[2px] border border-border bg-card px-5 pt-6 pb-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="page-header gap-2">
            <h1>Categories</h1>
            <p>Organize products with shared category groupings and jump directly into filtered stock.</p>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Click any category card to open Stock with that category preselected.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreate} size="sm">
            <Icon name="Plus" className="mr-1.5 h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-[2px] border border-border bg-card py-24 text-center">Loading categories...</div>
      ) : isAdmin ? (
        <CategoryGrid
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <Empty className="border py-24">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Icon name="Lock" className="h-4 w-4" />
            </EmptyMedia>
            <EmptyTitle>Insufficient permissions</EmptyTitle>
            <EmptyDescription>
              You do not have access to view or manage categories.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editingCategory} />
      <DeleteCategoryDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        category={deletingCategory}
      />
    </div>
  );
}
