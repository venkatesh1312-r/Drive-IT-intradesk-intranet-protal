-- Server-side user preferences, replacing per-browser localStorage
-- (theme_<email>, notif_prefs_<email>). Follows the person to any
-- machine they log in from.
ALTER TABLE "User" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';
ALTER TABLE "User" ADD COLUMN "notifTicketUpdates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifRecognitions" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notifWeeklySummary" BOOLEAN NOT NULL DEFAULT false;
