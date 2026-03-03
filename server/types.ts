export type AppEnv = {
  Variables: {
    user: { id: string; name: string; email: string } | null;
    session: { id: string; userId: string } | null;
  };
};
