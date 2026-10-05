import { CircleAlert, CircleCheck, Info, type LucideIcon, TriangleAlert } from "lucide-react";
import type { Transition } from "motion/react";
import type { NoticeVariant } from "../types/host.ts";
import type { ButtonSize, ButtonVariant, Tone } from "../types/toolkit.ts";

/** The site's ease: quick out, soft landing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** For things that move into place: pills, toasts, knobs. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
};

/** For presses: quick, a little bounce. */
export const SPRING_PRESS: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 22,
};

/** Content that appears or folds. */
export const FADE: Transition = {
  duration: 0.28,
  ease: EASE_OUT,
};

/** Each color role: its soft background and strong text. */
export const TONE_CLASSES: Readonly<Record<Tone, string>> = {
  neutral: "bg-sw-surface-2 text-sw-ink-2",
  accent: "bg-sw-accent-soft text-sw-accent-ink",
  ok: "bg-sw-ok-soft text-sw-ok",
  warn: "bg-sw-warn-soft text-sw-warn",
  violet: "bg-sw-violet-soft text-sw-violet",
  danger: "bg-sw-danger-soft text-sw-danger",
};

/** Text in a role's strong color, on the panel's own background. */
export const TONE_TEXT: Readonly<Record<Tone, string>> = {
  neutral: "text-sw-ink-3",
  accent: "text-sw-accent-ink",
  ok: "text-sw-ok",
  warn: "text-sw-warn",
  violet: "text-sw-violet",
  danger: "text-sw-danger",
};

/** A dot's color per role. */
export const TONE_DOTS: Readonly<Record<Tone, string>> = {
  neutral: "bg-sw-ink-3",
  accent: "bg-sw-accent",
  ok: "bg-sw-ok",
  warn: "bg-sw-warn",
  violet: "bg-sw-violet",
  danger: "bg-sw-danger",
};

/**
 * framer.css (in the base layer) makes every button full width, 30 px tall and gray: each variant sets its own size,
 * width and colors over it.
 */
export const BUTTON_VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: "border border-transparent bg-sw-accent text-white hover:bg-sw-accent-ink",
  secondary: "border border-sw-line-strong bg-sw-surface text-sw-ink hover:border-sw-ink-3",
  ghost: "border border-transparent bg-transparent text-sw-ink-2 hover:bg-sw-surface-2 hover:text-sw-ink",
  danger: "border border-transparent bg-sw-danger text-white hover:opacity-90",
};

export const BUTTON_SIZES: Readonly<Record<ButtonSize, string>> = {
  sm: "h-6 rounded-md px-2 text-[11px]",
  md: "h-8 rounded-lg px-3 text-[12px]",
  lg: "h-10 rounded-xl px-4 text-[13px]",
};

/** Inputs and selects, over framer.css's own. */
export const FIELD =
  "h-8 w-full rounded-lg border border-sw-line-strong bg-sw-surface px-2.5 text-[12px] text-sw-ink placeholder:text-sw-ink-3 focus:border-sw-accent focus:outline-none";

/** A notification's icon and its color on the dark pill. */
export const TOAST_ICONS: Readonly<Record<NoticeVariant, { readonly icon: LucideIcon; readonly className: string }>> = {
  info: {
    icon: Info,
    className: "text-sw-accent",
  },
  success: {
    icon: CircleCheck,
    className: "text-sw-ok",
  },
  warning: {
    icon: TriangleAlert,
    className: "text-sw-warn",
  },
  error: {
    icon: CircleAlert,
    className: "text-sw-danger",
  },
};

/** How long a notification stays. */
export const TOAST_MS = 4_000;

/** How long a notification with a link stays: long enough to click it. */
export const TOAST_LINK_MS = 12_000;

/** How long a copy button says "Copied". */
export const COPIED_MS = 1_600;
