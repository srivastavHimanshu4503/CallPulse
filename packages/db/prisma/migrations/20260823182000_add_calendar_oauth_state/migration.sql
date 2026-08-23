-- CreateTable
CREATE TABLE "calendar_oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_oauth_states_state_key" ON "calendar_oauth_states"("state");

-- CreateIndex
CREATE INDEX "calendar_oauth_states_state_idx" ON "calendar_oauth_states"("state");
