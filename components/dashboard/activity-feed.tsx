"use client";

import type { ActivityItem } from "@/app/types/inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import Icon from "@/components/Icon";

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

function activityLabel(type: ActivityItem["type"]) {
  switch (type) {
    case "stock-in":
      return "Stock In";
    case "stock-out":
      return "Stock Out";
    case "stock-adjusted":
      return "Adjusted";
    case "product-added":
      return "Product";
    case "product-updated":
      return "Updated";
    case "category-added":
      return "Category";
    case "category-updated":
      return "Category";
    case "low-stock-alert":
      return "Alert";
    case "order-requested":
      return "Order";
    case "order-approved":
      return "Approved";
    case "order-rejected":
      return "Rejected";
    default:
      return "Activity";
  }
}

export default function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  const visibleActivities = activities.slice(0, 20);

  return (
    <Card className="rounded-[8px] border border-border bg-card py-0">
      <div className="border-b border-border px-5 py-4 text-sm font-semibold text-foreground">
        Recent Activity
      </div>
      <CardContent className="px-5 py-0">
        {loading ? (
          <div className="space-y-4 py-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-[6px] bg-muted" />
                  <Skeleton className="h-3 w-20 rounded-[6px] bg-muted" />
                </div>
                <Skeleton className="h-4 w-full rounded-[6px] bg-muted" />
              </div>
            ))}
          </div>
        ) : visibleActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--input)] text-muted-foreground">
              <Icon name="Clock3" className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">No recent activity</p>
            <p className="text-[13px] text-muted-foreground">
              Activity will appear here as you manage inventory.
            </p>
          </div>
        ) : (
          <ul className="space-y-0 py-2">
            {visibleActivities.map((activity, index) => (
              <li key={activity.id}>
                <div className="py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      {activityLabel(activity.type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-foreground">{activity.message}</p>
                </div>
                {index < visibleActivities.length - 1 && <div className="border-b border-border/60" />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
