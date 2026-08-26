import { expect, test } from "@playwright/test";

const QA_PATH = "/__browser-qa__";
const MATCH_ID = "00000000-0000-4000-8000-000000000007";
const OFFLINE_DB_NAME = "handball-match-console";
const OFFLINE_STORES = [
  "matchSnapshots",
  "matchEvents",
  "matchParticipants",
  "pendingActions",
];

function captureBrowserErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function readOfflineDb(page) {
  return page.evaluate(
    async ({ dbName, matchId }) => {
      const databases = await indexedDB.databases();
      if (!databases.some((database) => database.name === dbName)) {
        return { ready: false, stores: [], pending: null };
      }

      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
      });

      try {
        const stores = Array.from(db.objectStoreNames);
        if (!stores.includes("pendingActions")) {
          return { ready: true, stores, pending: null };
        }

        const pending = await new Promise((resolve, reject) => {
          const transaction = db.transaction("pendingActions", "readonly");
          const request = transaction.objectStore("pendingActions").get(`${matchId}:pending`);
          request.onsuccess = () => resolve(request.result?.value ?? null);
          request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
        });

        return { ready: true, stores, pending };
      } finally {
        db.close();
      }
    },
    { dbName: OFFLINE_DB_NAME, matchId: MATCH_ID },
  );
}

test("MATCH CONSOLE renders core controls without horizontal overflow on tablet and mobile", async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(QA_PATH, { waitUntil: "networkidle" });

    await expect(page.getByRole("region", { name: "MATCH CONSOLE" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+1 HOME" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+1 AWAY" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^7m$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^警告$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^2分$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^失格$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^TTO$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^記録$/ })).toBeVisible();

    const overflowPx = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflowPx).toBeLessThanOrEqual(1);
  }

  expect(browserErrors).toEqual([]);
});

test("production browser registers the service worker and exposes a valid PWA manifest", async ({ page }) => {
  await page.goto(QA_PATH, { waitUntil: "networkidle" });

  const registration = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return { supported: false, activeScriptUrl: null };
    }

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("service worker ready timeout")), 10_000);
    });
    const ready = await Promise.race([navigator.serviceWorker.ready, timeout]);
    return {
      supported: true,
      activeScriptUrl: ready.active?.scriptURL ?? null,
    };
  });

  expect(registration.supported).toBe(true);
  expect(registration.activeScriptUrl).toMatch(/\/sw\.js$/);

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    if (!response.ok) throw new Error(`manifest fetch failed: ${response.status}`);
    return response.json();
  });

  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/app");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }),
    ]),
  );
});

test("offline goal is applied optimistically and persisted in the IndexedDB action queue", async ({ page, context }) => {
  await page.goto(QA_PATH, { waitUntil: "networkidle" });

  await expect
    .poll(async () => {
      const state = await readOfflineDb(page);
      return state.ready && Array.isArray(state.pending);
    })
    .toBe(true);

  const initialDb = await readOfflineDb(page);
  expect(initialDb.stores).toEqual(expect.arrayContaining(OFFLINE_STORES));
  expect(initialDb.pending).toEqual([]);

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);

  const homeGoalButton = page.getByRole("button", { name: "+1 HOME" });
  const homeCard = homeGoalButton.locator("..");
  await homeGoalButton.click();

  await expect(homeCard.getByText("1", { exact: true })).toBeVisible();
  await expect(
    page.getByText("オフラインで操作を保存しました。接続復帰後に自動同期します。"),
  ).toBeVisible();

  await expect
    .poll(async () => {
      const state = await readOfflineDb(page);
      return Array.isArray(state.pending) ? state.pending.length : -1;
    })
    .toBe(1);

  const offlineDb = await readOfflineDb(page);
  expect(offlineDb.pending[0]).toMatchObject({
    matchId: MATCH_ID,
    action: "goal",
    baseServerVersion: 1,
    payload: { side: "home" },
  });
});
