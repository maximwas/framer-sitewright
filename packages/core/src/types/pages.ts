/**
 * A web or design page node as getNode returns it, which copies itself with its content: WebPageNode.clone({ path }),
 * DesignPageNode.clone({ name }). Framer makes a path or name that is taken unique. Its typings say a web page copy is
 * a draft, but the copy keeps the page's own draft state (Server API, 06.10.2026).
 */
export interface ClonablePage {
  readonly id: string;
  clone(options?: { path?: string; name?: string }): Promise<unknown>;
}
