import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "../features/auth/login-page";

type LoginSearch = {
  redirect?: string;
};

const validateSearch = (search: Record<string, unknown>): LoginSearch => ({
  redirect: typeof search.redirect === "string" ? search.redirect : undefined,
});

export const Route = createFileRoute("/login")({
  validateSearch,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isAuthenticated && context.auth.allowed) {
      throw redirect({
        to: search.redirect || "/dashboard",
      });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect: redirectTo } = Route.useSearch();
  return <LoginPage redirectTo={redirectTo} />;
}
