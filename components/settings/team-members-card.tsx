"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Icon from "@/components/Icon";
import UserTable from "@/components/users/user-table";
import UserDialog from "@/components/users/user-dialog";

export default function TeamMembersCard() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Team Members</CardTitle>
        <CardAction>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Icon name="UserPlus" className="mr-1.5 h-4 w-4" />
            Invite Member
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <UserTable />
      </CardContent>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
