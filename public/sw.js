// IMSUFOSS Journals Web Push Service Worker

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "IMSUFOSS Journals Alert",
      body: event.data.text(),
      actionUrl: "/admin",
    };
  }

  const title = payload.title || "IMSUFOSS Journals Alert";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon.svg",
    badge: payload.badge || "/icon.svg",
    tag: payload.tag || "imsufoss-push-alert",
    data: {
      actionUrl: payload.actionUrl || "/admin",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.actionUrl || "/admin";

  // Strict relative path validation to prevent open redirects
  if (
    typeof targetUrl !== "string" ||
    !targetUrl.startsWith("/") ||
    targetUrl.startsWith("//") ||
    targetUrl.includes("://")
  ) {
    targetUrl = "/admin";
  }

  const destination = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an existing window from this origin is open, focus it and navigate
        for (const client of clientList) {
          if (
            client.url.startsWith(self.location.origin) &&
            "focus" in client
          ) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(destination);
            }
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(destination);
        }
      }),
  );
});
