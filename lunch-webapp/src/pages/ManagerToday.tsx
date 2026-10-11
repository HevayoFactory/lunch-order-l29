import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { Can } from "../authz/gates";
import { ForbiddenError } from "../authz/client";
import { errorText, lunchApi, type Menu } from "../api";
import { useShowDescriptions } from "../preferences";

const STATUS_LABEL = { draft: "Not published", open: "Ordering open", closed: "Ordering closed" } as const;
const STATUS_COLOR = { draft: "default", open: "success", closed: "warning" } as const;

export function ManagerToday(): ReactElement {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showDescriptions] = useShowDescriptions();

  const refresh = useCallback(async () => {
    try {
      const res = await lunchApi.GET("/menus/today");
      if (res.data) {
        setMenu(res.data);
        setLoadError(null);
      } else {
        setLoadError(errorText(res.error, "Today's menu could not be loaded."));
      }
    } catch (e) {
      if (!(e instanceof ForbiddenError)) setLoadError("Today's menu could not be loaded. Try again.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Runs one write, keeps the server's answer, and shows a refused one as the form's summary. */
  const run = async (action: () => Promise<{ data?: Menu; error?: unknown }>, failure: string): Promise<boolean> => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await action();
      if (res.data) {
        setMenu(res.data);
        return true;
      }
      setProblem(errorText(res.error, failure));
      await refresh();
      return false;
    } catch (e) {
      if (!(e instanceof ForbiddenError)) setProblem(`${failure} Try again.`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const itemsInput = (menuItems: Menu["items"]) => ({
    items: menuItems.map((i) => ({ id: i.id, name: i.name, description: i.description })),
  });

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!menu) return;
    if (name.trim() === "") {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    const body = {
      items: [...itemsInput(menu.items).items, { name: name.trim(), description: description.trim() }],
    };
    if (await run(() => lunchApi.PUT("/menus/today", { body }), "The item could not be added.")) {
      setName("");
      setDescription("");
    }
  };

  const removeItem = (id: string) =>
    menu && run(() => lunchApi.PUT("/menus/today", { body: itemsInput(menu.items.filter((i) => i.id !== id)) }), "The item could not be removed.");

  const publish = () => {
    if (!menu) return;
    if (menu.items.length === 0) {
      setProblem("Add at least one item before publishing");
      return;
    }
    void run(() => lunchApi.POST("/menus/today/publish"), "The menu could not be published.");
  };

  const close = async () => {
    await run(() => lunchApi.POST("/menus/today/close"), "Ordering could not be closed.");
    setConfirming(false);
  };

  const heading = (actions?: ReactElement) => (
    <PageTitle>
      <PageTitle.Header>Today's menu</PageTitle.Header>
      {actions && <PageTitle.Actions>{actions}</PageTitle.Actions>}
    </PageTitle>
  );

  if (loadError) {
    return (
      <PageContent>
        {heading()}
        <Alert severity="error" action={<Button color="inherit" onClick={() => void refresh()}>Try again</Button>}>
          {loadError}
        </Alert>
      </PageContent>
    );
  }
  if (!menu) {
    return (
      <PageContent>
        {heading()}
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress aria-label="Loading today's menu" />
        </Box>
      </PageContent>
    );
  }

  const closed = menu.status === "closed";

  return (
    <PageContent>
      {heading(
        <>
          {menu.status === "draft" && (
            <Can op="POST /menus/today/publish">
              <Button variant="contained" disabled={busy} onClick={publish}>
                Publish menu
              </Button>
            </Can>
          )}
          {menu.status === "open" && (
            <Can op="POST /menus/today/close">
              <Button variant="outlined" color="error" onClick={() => setConfirming(true)}>
                Close ordering
              </Button>
            </Can>
          )}
          <Can op="GET /orders/today">
            <Button variant="outlined" onClick={() => navigate("/orders")}>
              See order list
            </Button>
          </Can>
        </>,
      )}
      <Stack spacing={2}>
        <Box>
          <Chip label={STATUS_LABEL[menu.status]} color={STATUS_COLOR[menu.status]} size="small" />
        </Box>
        {closed && (
          <Alert severity="warning">
            <AlertTitle>Ordering is closed</AlertTitle>
            Closing is final for the day. The menu can no longer be edited.
          </Alert>
        )}
        {problem && <Alert severity="error">{problem}</Alert>}
        <Card>
          <CardHeader
            title={`Menu items (${menu.items.length})`}
            subheader="Each item has a name and a description."
          />
          <CardContent>
            <ListingTable.Container disablePaper>
              <ListingTable>
                <ListingTable.Head>
                  <ListingTable.Row>
                    <ListingTable.Cell>Item</ListingTable.Cell>
                    {showDescriptions && <ListingTable.Cell>Description</ListingTable.Cell>}
                    {!closed && <ListingTable.Cell align="right" />}
                  </ListingTable.Row>
                </ListingTable.Head>
                <ListingTable.Body>
                  {menu.items.length === 0 ? (
                    <ListingTable.Row>
                      <ListingTable.Cell colSpan={3}>
                        <ListingTable.EmptyState
                          title="No items yet"
                          description="Add the first item below, then publish the menu."
                        />
                      </ListingTable.Cell>
                    </ListingTable.Row>
                  ) : (
                    menu.items.map((i) => (
                      <ListingTable.Row key={i.id}>
                        <ListingTable.Cell>{i.name}</ListingTable.Cell>
                        {showDescriptions && <ListingTable.Cell>{i.description}</ListingTable.Cell>}
                        {!closed && (
                          <ListingTable.Cell align="right">
                            <Can op="PUT /menus/today">
                              <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => void removeItem(i.id)}>
                                Remove
                              </Button>
                            </Can>
                          </ListingTable.Cell>
                        )}
                      </ListingTable.Row>
                    ))
                  )}
                </ListingTable.Body>
              </ListingTable>
            </ListingTable.Container>
          </CardContent>
        </Card>
        {!closed && (
          <Can op="PUT /menus/today">
            <Card>
              <CardHeader title="Add an item" />
              <CardContent>
                <Box component="form" onSubmit={(e) => void addItem(e)} noValidate>
                  <Stack spacing={2}>
                    <TextField
                      label="Name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      error={nameError !== null}
                      helperText={nameError ?? undefined}
                    />
                    <TextField
                      label="Description"
                      multiline
                      minRows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    <Stack direction="row" justifyContent="flex-end" spacing={2}>
                      <Button type="submit" variant="outlined" disabled={busy}>
                        Add item
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Can>
        )}
      </Stack>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Close ordering for today?</DialogTitle>
        <DialogContent>
          <Typography>
            Closing is final for the day: ordering cannot be reopened and nobody can change an order.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirming(false)}>
            Keep open
          </Button>
          <Button variant="outlined" color="error" disabled={busy} onClick={() => void close()}>
            Close ordering
          </Button>
        </DialogActions>
      </Dialog>
    </PageContent>
  );
}
