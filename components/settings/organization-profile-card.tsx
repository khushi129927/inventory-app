"use client";

import * as React from "react";
import { toast } from "sonner";
import { useInventoryStore } from "@/lib/store";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OrganizationProfileCard() {
  const organization = useInventoryStore((s) => s.organization);
  const updateOrganization = useInventoryStore((s) => s.updateOrganization);

  const [organizationName, setOrganizationName] = React.useState(organization.name);
  const [currency, setCurrency] = React.useState(organization.currency);
  const [warehouseLocation, setWarehouseLocation] = React.useState(organization.warehouseLocation);
  const currencyOptions = [
    "INR - Indian Rupee",
    "USD - United States Dollar",
    "EUR - Euro",
    "GBP - British Pound",
    "AED - UAE Dirham",
  ];

  React.useEffect(() => {
    setOrganizationName(organization.name);
    setCurrency(organization.currency);
    setWarehouseLocation(organization.warehouseLocation);
  }, [organization]);

  const isDirty =
    organizationName !== organization.name ||
    currency !== organization.currency ||
    warehouseLocation !== organization.warehouseLocation;

  const handleReset = () => {
    setOrganizationName(organization.name);
    setCurrency(organization.currency);
    setWarehouseLocation(organization.warehouseLocation);
  };

  const handleSave = () => {
    updateOrganization({ name: organizationName, currency, warehouseLocation });
    toast.success("Workspace profile updated");
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Workspace Profile</CardTitle>
        <CardAction>
          <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={!isDirty}>
            Reset
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input id="org-name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-currency">Default Currency</Label>
          <select
            id="org-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {currencyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="org-warehouse">Warehouse Location</Label>
          <Input
            id="org-warehouse"
            value={warehouseLocation}
            onChange={(e) => setWarehouseLocation(e.target.value)}
          />
        </div>

        <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty} className="self-start">
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
