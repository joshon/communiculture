import type { AvatarVariantLibrary } from "@/components/avatar-builder/types";

let lib: AvatarVariantLibrary | null = null;
let pending: Promise<AvatarVariantLibrary> | null = null;

export function getAvatarLibrary(): Promise<AvatarVariantLibrary> {
  if (lib) return Promise.resolve(lib);
  if (!pending) {
    pending = fetch("/api/dev/avatar-library")
      .then((r) => r.json())
      .then((d) => { lib = d.library; return d.library; })
      // Don't cache failures — a transient error must not permanently poison the
      // cache (which would silently break every avatar thumbnail capture for the
      // rest of the session). Clear `pending` so the next call retries.
      .catch((err) => { pending = null; throw err; });
  }
  return pending;
}
