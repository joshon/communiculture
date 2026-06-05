export const FREE_CONTINUUM_LIMIT = 5;

interface UserLimits {
  lifetimeContinuums: boolean;
  continuumCredits: number;
  totalOwned: number; // ALL continuums ever created, including deleted
}

export function canCreateContinuum(u: UserLimits): boolean {
  if (u.lifetimeContinuums) return true;
  return u.totalOwned < FREE_CONTINUUM_LIMIT + u.continuumCredits;
}

export function continuumsAllowed(u: UserLimits): number | null {
  if (u.lifetimeContinuums) return null; // unlimited
  return FREE_CONTINUUM_LIMIT + u.continuumCredits;
}
