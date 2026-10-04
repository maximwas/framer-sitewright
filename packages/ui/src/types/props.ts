import type { ActivityLayer, ActivitySummary, Capabilities } from "@sitewright/core";
import type { ReactNode } from "react";
import type { ActivityApiClient } from "../api/activity-api-client.ts";
import type { ActivityActions, ActivityFeed, ActivityItem, RestoreFlow, RestoreState, ServerData } from "./activity.ts";
import type { EditorHost } from "./host.ts";

export interface ActivityApiProviderProps {
  readonly client: ActivityApiClient;
  readonly children: ReactNode;
}

export interface EditorHostProviderProps {
  readonly host: EditorHost;
  readonly children: ReactNode;
}

export interface ActivityPanelProps {
  readonly feed: ActivityFeed;
}

export interface EntryDetailProps {
  readonly entry: ActivitySummary;
}

export interface ImagePreviewsProps {
  readonly urls: readonly string[];
}

export interface ActivityToolbarProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canClear: boolean;
  readonly busy: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onMark: () => void;
  readonly onClear: () => void;
  readonly onSettings: () => void;
}

export interface SettingsPanelProps {
  readonly onClose: () => void;
}

export interface SettingToggleProps {
  readonly label: string;
  readonly info: string;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}

export interface ClearConfirmProps {
  readonly busy: boolean;
  readonly onConfirm: () => Promise<void>;
  readonly onCancel: () => void;
}

export interface ActivityFeedProps {
  readonly feed: ActivityFeed;
  readonly actions: ActivityActions;
  readonly onRestore: (checkpoint: ActivitySummary) => void;
  /** What the list says while it is empty, for the view it shows. */
  readonly emptyText: string;
}

export interface EntryRowProps {
  readonly entry: ActivitySummary;
  readonly actions: ActivityActions;
}

export interface EntryIconProps {
  readonly entry: ActivitySummary;
}

export interface LayerBadgeProps {
  readonly layer: ActivityLayer;
}

export interface EntryNotesProps {
  readonly entry: ActivitySummary;
}

export interface EntryActionsProps {
  readonly entry: ActivitySummary;
  readonly actions: ActivityActions;
}

export interface ItemChipsProps {
  readonly items: readonly ActivityItem[];
  /** Nodes the AI only read: shown as read badges. */
  readonly read?: boolean;
}

export interface ChangeBadgesProps {
  readonly items: readonly ActivityItem[];
}

export interface CategoryBadgesProps {
  readonly categories: ActivitySummary["categories"];
}

export interface ItemChipProps {
  readonly item: ActivityItem;
  readonly read?: boolean;
}

export interface CheckpointRowProps {
  readonly entry: ActivitySummary;
  readonly busy: boolean;
  readonly onRestore: (checkpoint: ActivitySummary) => void;
}

export interface CheckpointFormProps {
  readonly busy: boolean;
  readonly onSave: (label: string) => Promise<void>;
  readonly onCancel: () => void;
}

export interface RestoreDialogProps {
  readonly flow: RestoreFlow;
  readonly state: RestoreState;
}

export interface RestorePreviewProps {
  readonly state: RestoreState;
}

export interface CapabilityBannerProps {
  readonly capabilities: ServerData<Capabilities | null>;
}
