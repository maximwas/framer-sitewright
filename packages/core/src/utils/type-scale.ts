import { TYPE_SCALE_ROLES } from "../constants/type-scale.ts";

/** Each role's size, a whole px: the body size times the ratio to the power of the role's step. */
export function typeScale(base: number, ratio: number) {
  return TYPE_SCALE_ROLES.map((role) => ({
    ...role,
    fontSize: `${Math.round(base * ratio ** role.step)}px`,
  }));
}
