import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: window.location.origin, // works for both dev proxy and prod
  plugins: [usernameClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
