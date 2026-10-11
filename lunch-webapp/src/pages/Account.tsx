import { useEffect, useState, type ReactElement } from "react";
import { Card, CardContent, Grid, PageContent, PageTitle, Typography } from "@wso2/oxygen-ui";
import { useHeldRoles } from "../authz/gates";
import { currentUser } from "../authz/session";

export function AccountPage(): ReactElement {
  const roles = useHeldRoles();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    void currentUser().then((user) => {
      const profile = (user?.profile ?? {}) as Record<string, unknown>;
      const text = (key: string): string => (typeof profile[key] === "string" ? (profile[key] as string) : "");
      setName(text("name") || text("email") || text("sub"));
      setEmail(text("email"));
    });
  }, []);

  const fields = [
    { label: "Name", value: name },
    { label: "Email", value: email },
    { label: "Role", value: roles.join(", ") },
  ];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Account</PageTitle.Header>
      </PageTitle>
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            {fields.map((f) => (
              <Grid key={f.label} size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  {f.label}
                </Typography>
                <Typography>{f.value || "-"}</Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </PageContent>
  );
}
