const SHARE_TARGET_PATH = "/share-target";
const CREATE_PATH = "/create";
const DB_NAME = "ufoundit-share-target";
const STORE_NAME = "shares";
const DB_VERSION = 1;

function openShareDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveShare(share) {
  const db = await openShareDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(share);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "GET" && url.pathname === SHARE_TARGET_PATH) {
    const redirectUrl = new URL(CREATE_PATH, event.request.url);
    const shareId = url.searchParams.get("shareId");

    if (shareId) {
      redirectUrl.searchParams.set("shareId", shareId);
    }

    event.respondWith(Response.redirect(redirectUrl.href, 302));
    return;
  }

  if (event.request.method !== "POST" || url.pathname !== SHARE_TARGET_PATH) {
    return;
  }

  event.respondWith(
    (async () => {
      const formData = await event.request.formData();
      const files = formData
        .getAll("images")
        .filter((value) => value instanceof File && value.size > 0);

      const shareId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      await saveShare({
        id: shareId,
        title: formData.get("title") || "",
        text: formData.get("text") || "",
        url: formData.get("url") || "",
        files,
        createdAt: Date.now(),
      });

      return Response.redirect(`${CREATE_PATH}?shareId=${encodeURIComponent(shareId)}`, 303);
    })()
  );
});
