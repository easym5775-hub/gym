/* ================================================================
   FORGE — auth API surface.
   Thin wrappers over the active backend. The Auth screen and the store
   use these; neither ever touches Supabase directly.
   ================================================================ */

import { backend, type RoleInfo } from "./backend";
import { isDemoMode } from "./supabase";

export type { RoleInfo };

/** True when running without Supabase credentials (local demo data). */
export const demoMode = isDemoMode;

/** Password hint surfaced only in demo mode so the app is usable here. */
export const DEMO_HINT = demoMode ? "demo1234" : null;

export const getSessionUserId = (): Promise<string | null> => backend.getSessionUserId();

export const onAuthChange = (cb: (userId: string | null) => void): (() => void) => backend.onAuthChange(cb);

export const coachSignUp = (email: string, password: string, name: string): Promise<void> =>
  backend.coachSignUp(email, password, name);

export const coachSignIn = (email: string, password: string): Promise<void> =>
  backend.coachSignIn(email, password);

export const clientSignIn = (username: string, password: string): Promise<void> =>
  backend.clientSignIn(username, password);

export const signOut = (): Promise<void> => backend.signOut();

export const resolveRole = (userId: string): Promise<RoleInfo | null> => backend.resolveRole(userId);
