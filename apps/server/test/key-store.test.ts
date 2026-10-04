import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { KeyStore } from "../src/keys/key-store.ts";
import { keyHint, projectUrlOf } from "../src/utils/project-key.ts";

it("keeps one key per project, private to the user, and forgets one on request", async () => {
  const file = join(await mkdtemp(join(tmpdir(), "sitewright-keys-")), "keys.json");
  const store = new KeyStore(file);
  const project = {
    id: "a".repeat(64),
    name: "Client site",
    url: "https://framer.com/projects/Client--abc123",
    key: "fr_secret_value_1234",
  };

  expect(store.list()).toEqual([]);
  await store.set(project);
  await store.set({
    ...project,
    id: "b".repeat(64),
    name: "Other site",
  });

  expect(store.get(project.id)).toMatchObject({
    name: "Client site",
    key: "fr_secret_value_1234",
  });
  expect(store.list().map((entry) => entry.name)).toEqual(["Client site", "Other site"]);
  expect((await stat(file)).mode & 0o777).toBe(0o600);

  // Another process reads the same file.
  expect(new KeyStore(file).get("b".repeat(64))?.name).toBe("Other site");

  expect(await store.remove(project.id)).toBe(true);
  expect(store.get(project.id)).toBeNull();
});

it("regression: writes that overlap in one process neither fail nor lose each other", async () => {
  const store = new KeyStore(join(await mkdtemp(join(tmpdir(), "sitewright-keys-")), "keys.json"));
  const names = ["One", "Two", "Three"];

  await Promise.all(
    names.map((name) =>
      store.set({
        id: name,
        name,
        url: `https://framer.com/projects/${name}--abc`,
        key: "key",
      }),
    ),
  );
  await Promise.all(names.map((name) => store.touch(name)));

  expect(store.list().map((project) => project.name)).toEqual(names);
});

it("takes a project link from the address bar, and shows only the end of a key", () => {
  expect(projectUrlOf("https://framer.com/projects/Client--abc123-x9?node=xyz#top")).toBe(
    "https://framer.com/projects/Client--abc123-x9",
  );
  expect(projectUrlOf("framer.com/projects/Client--abc123")).toBe("https://framer.com/projects/Client--abc123");
  expect(projectUrlOf("https://example.com/projects/x")).toBeNull();
  expect(keyHint("fr_secret_value_1234")).toBe("…1234");
});
