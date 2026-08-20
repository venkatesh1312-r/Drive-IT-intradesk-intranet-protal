-- Single-active-session enforcement: logging in on a new device stores a
-- fresh session id here and in the JWT; any older token (different sid)
-- is rejected on its next request. NULL = no active session yet.
ALTER TABLE "User" ADD COLUMN "currentSessionId" TEXT;
