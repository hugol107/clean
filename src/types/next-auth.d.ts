// `next-auth` and `next-auth/jwt` re-export their `Session`/`User`/`JWT`
// types from `@auth/core` (`export type { Session } from "@auth/core/types"`)
// rather than declaring them locally. TypeScript's `declare module`
// augmentation merges into the module that *originally declares* an
// interface, so augmenting "next-auth" itself is a no-op here — we have to
// augment the `@auth/core` source modules directly.

import type { DefaultSession } from "@auth/core/types";

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isSuperAdmin?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid: string;
    isSuperAdmin: boolean;
  }
}
