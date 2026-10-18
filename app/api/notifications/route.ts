import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/authorization";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Quick count-only query
  if (searchParams.get("countOnly") === "true") {
    try {
      const count = await getUnreadCount(user.id);
      return NextResponse.json({ count });
    } catch {
      return NextResponse.json(
        { error: "Failed to retrieve unread notification count." },
        { status: 500 },
      );
    }
  }

  const filter = searchParams.get("filter") === "unread" ? "unread" : "all";
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawPageSize = parseInt(searchParams.get("pageSize") || "25", 10);

  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const pageSize = Math.min(
    25,
    Math.max(1, isNaN(rawPageSize) ? 25 : rawPageSize),
  );

  try {
    const result = await listNotifications(user.id, {
      filter,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve notifications." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.all === true) {
      const result = await markAllNotificationsAsRead(user.id);
      return NextResponse.json({ success: true, count: result.count });
    }

    if (typeof body.notificationId === "string" && body.notificationId.trim()) {
      const updated = await markNotificationAsRead(
        body.notificationId.trim(),
        user.id,
      );
      if (!updated) {
        return NextResponse.json(
          { error: "Notification not found." },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, notification: updated });
    }

    return NextResponse.json(
      {
        error:
          "Either 'all: true' or a valid 'notificationId' must be specified.",
      },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to update notification read state." },
      { status: 500 },
    );
  }
}
