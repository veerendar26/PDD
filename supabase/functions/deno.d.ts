/**
 * Global type declarations for Supabase Edge Functions (Deno Runtime)
 * Provides ambient typing for Deno namespace and URL-based imports
 */

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: ServeOptions
  ): void;
}

// Deno Standard Library Modules
declare module "https://deno.land/std@0.208.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
    options?: Deno.ServeOptions
  ): void;
}

declare module "https://deno.land/std@0.208.0/crypto/mod.ts" {
  export const crypto: Crypto;
}

// Supabase Client ESM
declare module "https://esm.sh/@supabase/supabase-js@2" {
  import type { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";
  export function createClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions<any>
  ): SupabaseClient<Database>;
  export * from "@supabase/supabase-js";
}

// Wildcard fallback for any other Deno URL imports
declare module "https://*" {
  const content: any;
  export default content;
  export const serve: any;
  export const createClient: any;
  export const crypto: any;
}
