/** A call from a panel that waits for the server's answer. */
export interface PendingCall {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: unknown) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

/** Where a panel's calls go: a WebSocket, or the plugin's socket through its bridge window. */
export interface CallSocket {
  send(data: string): void;
}
