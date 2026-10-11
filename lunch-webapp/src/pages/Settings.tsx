import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, FormControlLabel, PageContent, PageTitle, Stack, Switch } from "@wso2/oxygen-ui";
import { useShowDescriptions } from "../preferences";

export function SettingsPage(): ReactElement {
  const navigate = useNavigate();
  const [saved, setSaved] = useShowDescriptions();
  const [show, setShow] = useState(saved);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(show);
    navigate("/today");
  };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Settings</PageTitle.Header>
      </PageTitle>
      <Card>
        <CardContent>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={show} onChange={(e) => setShow(e.target.checked)} />}
                label="Show item descriptions"
              />
              <Stack direction="row" justifyContent="flex-end" spacing={2}>
                <Button type="submit" variant="contained">
                  Save settings
                </Button>
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </PageContent>
  );
}
