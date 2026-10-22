import type { AgentPort } from "../types/framer.ts";
import type { FramerPort } from "../types/framer-port.ts";
import { dslPagePath } from "../utils/cms.ts";
import { isPlainObject } from "../utils/guards.ts";

/**
 * The agent, taking a page path as every tool shows it. The Plugin API lists a CMS detail page as /blog/:slug, but the
 * DSL names it /blog/:<Collection name> and answers "Page not found" to the other (seen 22.10.2026): every pagePath an
 * agent call carries is translated here, once for all tools.
 */
export function withDslPagePaths(agent: AgentPort, port: FramerPort): AgentPort {
  const translate = async (arg: unknown): Promise<unknown> => {
    if (!isPlainObject(arg) || typeof arg.pagePath !== "string" || !arg.pagePath.includes(":")) {
      return arg;
    }

    const page = (await port.getNodesWithType("WebPageNode")).find(({ path }) => path === arg.pagePath);

    if (page?.collectionId === null || page?.collectionId === undefined) {
      return arg;
    }

    const collection = (await port.getCollections()).find(({ id }) => id === page.collectionId);

    return {
      ...arg,
      pagePath: dslPagePath(arg.pagePath, collection?.name ?? null),
    };
  };

  return new Proxy(agent, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);

      return typeof value === "function"
        ? async (...args: unknown[]) => Reflect.apply(value, target, await Promise.all(args.map(translate)))
        : value;
    },
  });
}
