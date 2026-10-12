import { CloseCode } from "@sitewright/core";
import { expect, it } from "vitest";
import { serverUpdate } from "../src/utils/update.ts";

// The plugin updates itself from Framer's Marketplace; the MCP server on the user's computer does not.
it("asks for a server update when the server is older than the plugin, or the protocols differ", () => {
  expect(
    serverUpdate(
      {
        state: "connected",
        serverVersion: "1.0.11",
      },
      "1.1.0",
    ),
  ).toEqual({ serverVersion: "1.0.11" });
  expect(
    serverUpdate(
      {
        state: "connected",
        serverVersion: "1.1.0",
      },
      "1.1.0",
    ),
  ).toBeNull();
  expect(
    serverUpdate(
      {
        state: "connected",
        serverVersion: "1.2.0",
      },
      "1.1.9",
    ),
  ).toBeNull();
  expect(
    serverUpdate(
      {
        state: "connected",
        serverVersion: "1.0.9",
      },
      "1.0.10",
    ),
  ).toEqual({ serverVersion: "1.0.9" });
  expect(
    serverUpdate(
      {
        state: "stopped",
        closeCode: CloseCode.VersionMismatch,
      },
      "1.1.0",
    ),
  ).toEqual({
    serverVersion: null,
  });
  expect(
    serverUpdate(
      {
        state: "connected",
        serverVersion: null,
      },
      "1.1.0",
    ),
  ).toBeNull();
});
