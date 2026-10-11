import { useEffect, useRef, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/** The OIDC redirect target. Finishes the sign-in once, then lands on the app. */
export function CallbackPage(): ReactElement {
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void handleCallback().then(() => navigate("/", { replace: true }));
  }, [navigate]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography color="text.secondary">Signing you in…</Typography>
    </Box>
  );
}
