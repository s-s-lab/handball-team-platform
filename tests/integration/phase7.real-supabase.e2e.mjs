import { expect, test } from "@playwright/test";

const MATCH_ID = process.env.INTEGRATION_MATCH_ID;
const EMAIL = process.env.TEMP_EMAIL;
const PASSWORD = process.env.TEMP_PASSWORD;

if (!MATCH_ID || !EMAIL || !PASSWORD) {
  throw new Error("Missing Phase 7 real-integration environment variables.");
}

async function readPendingActions(page) {
  return page.evaluate(async (matchId) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("handball-match-console");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });

    try {
      if (!db.objectStoreNames.contains("pendingActions")) return null;
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("pendingActions", "readonly");
        const request = tx.objectStore("pendingActions").get(`${matchId}:pending`);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB read failed"));
      });
    } finally {
      db.close();
    }
  }, MATCH_ID);
}

test("offline reconnect replays to real Supabase and public LIVE updates over Realtime without reload", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const liveContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const livePage = await liveContext.newPage();

  try {
    await adminPage.goto(`/login?next=${encodeURIComponent(`/app/matches/${MATCH_ID}/console`)}`, {
      waitUntil: "networkidle",
    });
    await adminPage.getByLabel("メールアドレス").fill(EMAIL);
    await adminPage.getByLabel("パスワード").fill(PASSWORD);
    await adminPage.getByRole("button", { name: "ログイン" }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/app/matches/${MATCH_ID}/console`));
    await expect(adminPage.getByRole("region", { name: "MATCH CONSOLE" })).toBeVisible();
    await expect(adminPage.getByRole("status", { name: "同期状態" })).toHaveText("保存済み");

    await livePage.goto(`/live/${MATCH_ID}`, { waitUntil: "networkidle" });
    await expect(livePage.getByRole("region", { name: "公開LIVEスコア" })).toBeVisible();
    await expect(livePage.getByText("リアルタイム接続中", { exact: true })).toBeVisible();

    const liveHome = livePage.getByText("HOME", { exact: true }).locator("..");
    await expect(liveHome.getByText("0", { exact: true })).toBeVisible();
    const sentinel = await livePage.evaluate(() => {
      const value = crypto.randomUUID();
      window.__phase7RealtimeSentinel = value;
      return value;
    });

    await adminContext.setOffline(true);
    await expect.poll(() => adminPage.evaluate(() => navigator.onLine)).toBe(false);

    const homeGoalButton = adminPage.getByRole("button", { name: "+1 HOME" });
    const adminHome = homeGoalButton.locator("..");
    await homeGoalButton.click();
    await expect(adminHome.getByText("1", { exact: true })).toBeVisible();
    await expect(adminPage.getByRole("status", { name: "同期状態" })).toHaveText(
      "オフライン・1件未同期",
    );
    await expect(liveHome.getByText("0", { exact: true })).toBeVisible();

    await expect.poll(async () => (await readPendingActions(adminPage))?.length ?? -1).toBe(1);

    await adminContext.setOffline(false);
    await expect.poll(() => adminPage.evaluate(() => navigator.onLine)).toBe(true);
    await expect(adminPage.getByRole("status", { name: "同期状態" })).toHaveText("保存済み");
    await expect.poll(async () => (await readPendingActions(adminPage))?.length ?? -1).toBe(0);

    await expect(liveHome.getByText("1", { exact: true })).toBeVisible();
    await expect(livePage.getByText("リアルタイム接続中", { exact: true })).toBeVisible();
    await expect.poll(() => livePage.evaluate(() => window.__phase7RealtimeSentinel)).toBe(sentinel);
  } finally {
    await adminContext.close();
    await liveContext.close();
  }
});
