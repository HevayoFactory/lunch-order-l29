import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  ListingTable,
  PageContent,
  PageTitle,
  Stack,
  Typography,
} from "@wso2/oxygen-ui";
import { Clock, Users } from "@wso2/oxygen-ui-icons-react";
import { ForbiddenError } from "../authz/client";
import { errorText, lunchApi, type OrderPage } from "../api";

const PAGE_SIZE = 20;

export function OrdersPage(): ReactElement {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<OrderPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (at: number) => {
    setError(null);
    try {
      const res = await lunchApi.GET("/orders/today", { params: { query: { limit: PAGE_SIZE, offset: at } } });
      if (res.data) setPage(res.data);
      else setError(errorText(res.error, "The order list could not be loaded."));
    } catch (e) {
      if (!(e instanceof ForbiddenError)) setError("The order list could not be loaded. Try again.");
    }
  }, []);

  useEffect(() => {
    void load(offset);
  }, [load, offset]);

  const ordering =
    page?.menuStatus === "closed" ? { value: "Closed", hint: "final for the day" }
    : page?.menuStatus === "draft" ? { value: "Not published", hint: "no menu is open for orders" }
    : { value: "Open", hint: "staff can still change orders" };

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Order list</PageTitle.Header>
        <PageTitle.Actions>
          <Button variant="outlined" onClick={() => navigate("/today")}>
            Back to menu
          </Button>
        </PageTitle.Actions>
      </PageTitle>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => void load(offset)}>Try again</Button>}>
          {error}
        </Alert>
      )}
      {!page && !error && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress aria-label="Loading orders" />
        </Box>
      )}
      {page && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Users size={16} />
                    <Typography variant="overline">Ordered</Typography>
                  </Stack>
                  <Typography variant="h4">{String(page.count)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    people have ordered
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Clock size={16} />
                    <Typography variant="overline">Ordering</Typography>
                  </Stack>
                  <Typography variant="h4">{ordering.value}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ordering.hint}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Card>
            <CardHeader title={`Today's orders (${page.count})`} subheader="One line per person, with the items they ordered." />
            <CardContent>
              <ListingTable.Container disablePaper>
                <ListingTable>
                  <ListingTable.Head>
                    <ListingTable.Row>
                      <ListingTable.Cell>Person</ListingTable.Cell>
                      <ListingTable.Cell>Items</ListingTable.Cell>
                    </ListingTable.Row>
                  </ListingTable.Head>
                  <ListingTable.Body>
                    {page.data.length === 0 ? (
                      <ListingTable.Row>
                        <ListingTable.Cell colSpan={2}>
                          <ListingTable.EmptyState
                            title="Nobody has ordered yet"
                            description="Orders appear here as staff place them."
                          />
                        </ListingTable.Cell>
                      </ListingTable.Row>
                    ) : (
                      page.data.map((o) => (
                        <ListingTable.Row key={o.id}>
                          <ListingTable.Cell>{o.staffName}</ListingTable.Cell>
                          <ListingTable.Cell>{o.items.map((i) => i.name).join(", ")}</ListingTable.Cell>
                        </ListingTable.Row>
                      ))
                    )}
                  </ListingTable.Body>
                </ListingTable>
              </ListingTable.Container>
              {(page.previous || page.next) && (
                <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
                  <Button variant="outlined" disabled={!page.previous} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                    Previous
                  </Button>
                  <Button variant="outlined" disabled={!page.next} onClick={() => setOffset(offset + PAGE_SIZE)}>
                    Next
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </PageContent>
  );
}
