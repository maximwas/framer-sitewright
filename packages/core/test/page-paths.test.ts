import { expect, it } from "vitest";
import { withDslPagePaths } from "../src/framer/page-paths.ts";
import type { AgentPort } from "../src/types/framer.ts";
import type { FramerPort } from "../src/types/framer-port.ts";

it("regression: a CMS detail page's path reaches the DSL by its collection's name (seen: Page not found: /trips/:slug)", async () => {
  const scopes: unknown[] = [];
  const agent = {
    serialize: async (_input: unknown, options: unknown) => {
      scopes.push(options);

      return null;
    },
  } as unknown as AgentPort;
  const port = {
    getNodesWithType: async () => [
      {
        id: "home",
        path: "/",
        draft: false,
        collectionId: null,
      },
      {
        id: "trip",
        path: "/trips/:slug",
        draft: false,
        collectionId: "c1",
      },
    ],
    getCollections: async () => [
      {
        id: "c1",
        name: "Trips",
      },
    ],
  } as unknown as FramerPort;
  const translated = withDslPagePaths(agent, port);

  await translated.serialize({ id: "trip" }, { pagePath: "/trips/:slug" });
  await translated.serialize({ id: "home" }, { pagePath: "/" });

  expect(scopes).toEqual([{ pagePath: "/trips/:Trips" }, { pagePath: "/" }]);
});
