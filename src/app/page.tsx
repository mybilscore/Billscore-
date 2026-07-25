// src/app/auth/sign-in/page.tsx
import { SYSTEM_CONFIG } from "~/app";
import { redirectIfAuthenticated } from "~/lib/session";
import SignInPageClient  from "./page.client";

export default async function SignInPage() {
  // This will redirect to appropriate dashboard if already logged in
  await redirectIfAuthenticated(SYSTEM_CONFIG.redirectAfterSignIn);

  return <SignInPageClient />;
}