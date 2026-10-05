import type { LucideIcon } from "lucide-react";
import type { HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import type { NoticeVariant } from "./host.ts";

/** A color role: the palette's soft background with its strong text. */
export type Tone = "neutral" | "accent" | "ok" | "warn" | "violet" | "danger";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: LucideIcon;
  readonly children?: ReactNode;
}

export interface IconButtonProps extends HTMLMotionProps<"button"> {
  readonly icon: LucideIcon;
  /** What the button does, for screen readers and the tooltip. */
  readonly label: string;
}

export interface TagProps {
  readonly tone: Tone;
  readonly title?: string;
  readonly children: ReactNode;
}

export interface IconTileProps {
  readonly icon: LucideIcon;
  readonly tone?: Tone;
  /** A small dot on the corner: how the call went, when not well. */
  readonly dot?: Tone | null;
  readonly label?: string;
}

export interface StatusPillProps {
  readonly tone: Tone;
  /** Pulses while live: the connection is up. */
  readonly live?: boolean;
  readonly children: ReactNode;
}

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly title?: string;
}

export interface SegmentedProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
}

export interface SwitchProps {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}

export interface CollapseProps {
  readonly open: boolean;
  readonly children: ReactNode;
}

export interface SheetProps {
  readonly open: boolean;
  readonly labelledBy: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export interface CopyFieldProps {
  readonly text: string;
  /** Copies the text; resolves with whether it worked. */
  readonly copy: (text: string) => Promise<boolean>;
}

export interface WindowBarProps {
  readonly title: string;
  readonly subtitle?: string | null;
  /** What sits on the right: the connection's status pill. */
  readonly children?: ReactNode;
}

export interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly children: ReactNode;
}

export interface Toast {
  readonly id: number;
  readonly message: string;
  readonly variant: NoticeVariant;
  /** A link the toast offers, e.g. to the editor when the browser blocked a new tab. */
  readonly link?: string;
}

/** The page's notifications, and how they come and go. */
export interface ToastState {
  readonly toasts: readonly Toast[];
  show(message: string, variant: NoticeVariant, link?: string): void;
  dismiss(id: number): void;
}
