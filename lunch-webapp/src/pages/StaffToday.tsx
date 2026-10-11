import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControlLabel,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  Switch,
  Typography,
} from "@wso2/oxygen-ui";
import { Can } from "../authz/gates";
import { ForbiddenError } from "../authz/client";
import { errorText, lunchApi, type Menu, type Order } from "../api";
import { useShowDescriptions } from "../preferences";

type Load = { state: "loading" } | { state: "none" } | { state: "error"; message: string } | { state: "ready"; menu: Menu };

export function StaffToday(): ReactElement {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [order, setOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDescriptions] = useShowDescriptions();

  const refresh = useCallback(async () => {
    try {
      const menuRes = await lunchApi.GET("/published-menus/today");
      if (menuRes.response.status === 404) {
        setLoad({ state: "none" });
        return;
      }
      if (!menuRes.data) {
        setLoad({ state: "error", message: errorText(menuRes.error, "Today's menu could not be loaded.") });
        return;
      }
      setLoad({ state: "ready", menu: menuRes.data });
      // The caller's own order. 404 means they have not ordered yet.
      const orderRes = await lunchApi.GET("/me/orders/today");
      if (orderRes.data) {
        setOrder(orderRes.data);
        setChosen(new Set(orderRes.data.items.map((i) => i.id)));
        setOrderError(null);
      } else if (orderRes.response.status === 404) {
        setOrder(null);
        setChosen(new Set());
        setOrderError(null);
      } else {
        setOrderError(errorText(orderRes.error, "Your order could not be loaded."));
      }
    } catch (e) {
      if (e instanceof ForbiddenError) return;
      setLoad({ state: "error", message: "Today's menu could not be loaded. Try again." });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (chosen.size === 0) {
      setProblem("Choose at least one item");
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const res = await lunchApi.PUT("/me/orders/today", { body: { menuItemIds: [...chosen] } });
      if (res.data) {
        setOrder(res.data);
      } else {
        setProblem(errorText(res.error, "Your order could not be saved."));
        await refresh();
      }
    } catch (e) {
      if (!(e instanceof ForbiddenError)) setProblem("Your order could not be saved. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await lunchApi.DELETE("/me/orders/today");
      if (res.response.ok || res.response.status === 404) {
        setOrder(null);
        setChosen(new Set());
      } else {
        setProblem(errorText(res.error, "Your order could not be cancelled."));
        await refresh();
      }
    } catch (e) {
      if (!(e instanceof ForbiddenError)) setProblem("Your order could not be cancelled. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const heading = (
    <PageTitle>
      <PageTitle.Header>Today's lunch</PageTitle.Header>
    </PageTitle>
  );

  if (load.state === "loading") {
    return (
      <PageContent>
        {heading}
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress aria-label="Loading today's lunch" />
        </Box>
      </PageContent>
    );
  }
  if (load.state === "none") {
    return (
      <PageContent>
        {heading}
        <Card>
          <CardContent>
            <Typography variant="h6">No menu yet</Typography>
            <Typography color="text.secondary">
              The office manager has not published today's menu. Check back soon.
            </Typography>
          </CardContent>
        </Card>
      </PageContent>
    );
  }
  if (load.state === "error") {
    return (
      <PageContent>
        {heading}
        <Alert severity="error" action={<Button color="inherit" onClick={() => void refresh()}>Try again</Button>}>
          {load.message}
        </Alert>
      </PageContent>
    );
  }

  const { menu } = load;
  const closed = menu.status === "closed";

  return (
    <PageContent>
      {heading}
      <Stack spacing={2}>
        <Alert severity={closed ? "warning" : "success"}>
          <AlertTitle>{closed ? "Ordering is closed" : "Ordering is open"}</AlertTitle>
          {closed
            ? "Orders can no longer be placed, changed or cancelled."
            : "You can place, change or cancel your order until the office manager closes ordering."}
        </Alert>
        {orderError && <Alert severity="error">{orderError}</Alert>}
        <Card>
          <CardHeader title="Your order" subheader="One order per person per day." />
          <CardContent>
            {order ? (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Items
                </Typography>
                <Typography>{order.items.map((i) => i.name).join(", ")}</Typography>
              </Stack>
            ) : (
              <Typography>{closed ? "You did not place an order today." : "You have not ordered yet."}</Typography>
            )}
          </CardContent>
        </Card>
        {closed ? (
          <Card>
            <CardHeader title={`Today's menu (${menu.items.length})`} />
            <CardContent>
              <ListingTable.Container disablePaper>
                <ListingTable>
                  <ListingTable.Head>
                    <ListingTable.Row>
                      <ListingTable.Cell>Item</ListingTable.Cell>
                      {showDescriptions && <ListingTable.Cell>Description</ListingTable.Cell>}
                    </ListingTable.Row>
                  </ListingTable.Head>
                  <ListingTable.Body>
                    {menu.items.map((i) => (
                      <ListingTable.Row key={i.id}>
                        <ListingTable.Cell>{i.name}</ListingTable.Cell>
                        {showDescriptions && <ListingTable.Cell>{i.description}</ListingTable.Cell>}
                      </ListingTable.Row>
                    ))}
                  </ListingTable.Body>
                </ListingTable>
              </ListingTable.Container>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader
              title={`Choose your items (${menu.items.length})`}
              subheader="Pick one or more items from today's menu."
            />
            <CardContent>
              <Box component="form" onSubmit={(e) => void save(e)} noValidate>
                <Stack spacing={2}>
                  {problem && (
                    <Alert severity="error">{problem}</Alert>
                  )}
                  <Stack>
                    {menu.items.map((i) => (
                      <FormControlLabel
                        key={i.id}
                        control={<Switch checked={chosen.has(i.id)} onChange={() => toggle(i.id)} />}
                        label={showDescriptions && i.description ? `${i.name} - ${i.description}` : i.name}
                      />
                    ))}
                  </Stack>
                  <Stack direction="row" justifyContent="flex-end" spacing={2}>
                    {order && (
                      <Can op="DELETE /me/orders/today">
                        <Button variant="outlined" color="error" disabled={busy} onClick={() => void cancel()}>
                          Cancel order
                        </Button>
                      </Can>
                    )}
                    <Can op="PUT /me/orders/today">
                      <Button type="submit" variant="contained" disabled={busy}>
                        Save my order
                      </Button>
                    </Can>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </PageContent>
  );
}
