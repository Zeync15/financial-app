export type AppEnv = {
  Variables: {
    user: { id: string; name: string; email: string; username?: string | null } | null;
    session: { id: string; userId: string } | null;
  };
};
