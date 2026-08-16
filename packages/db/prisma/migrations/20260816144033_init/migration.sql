-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DROPDOWN', 'DATE');

-- CreateEnum
CREATE TYPE "CustomFieldParentType" AS ENUM ('CONTACT', 'DEAL');

-- CreateEnum
CREATE TYPE "CustomFieldValueSource" AS ENUM ('MANUAL', 'WORKFLOW', 'CALL', 'SMS');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CommType" AS ENUM ('CALL', 'SMS', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "CommStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'NO_ANSWER', 'FAILED', 'VOICEMAIL', 'BUSY', 'SENT', 'DELIVERED', 'RECEIVED', 'READ');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "TeamSize" AS ENUM ('SOLO', 'SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL_INBOUND', 'CALL_OUTBOUND', 'SMS_SENT', 'SMS_RECEIVED', 'WHATSAPP_SENT', 'WHATSAPP_RECEIVED', 'DEAL_CREATED', 'DEAL_STAGE_CHANGED', 'BOOKING_CREATED', 'FIELD_UPDATED', 'WORKFLOW_TRIGGERED', 'NOTE_ADDED', 'CONTACT_CREATED');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('SIGNUP_GRANT', 'PLAN_GRANT', 'TOPUP_PURCHASE', 'CALL_DEDUCTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "DealProbabilitySource" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "DealPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DealHealth" AS ENUM ('HEALTHY', 'NEEDS_ATTENTION', 'HIGH_RISK');

-- CreateEnum
CREATE TYPE "PhoneNumberKind" AS ENUM ('BUSINESS', 'AGENT_LINE');

-- CreateEnum
CREATE TYPE "TelephonyProvider" AS ENUM ('TWILIO', 'PLIVO');

-- CreateEnum
CREATE TYPE "PhoneNumberCountry" AS ENUM ('US', 'IN');

-- CreateEnum
CREATE TYPE "ChatSessionStatus" AS ENUM ('OPEN', 'PROCESSED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "businessType" TEXT,
    "websiteUrl" TEXT,
    "teamSize" "TeamSize",
    "monthlyRevenue" TEXT,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "refId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'captured',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "providerSubId" TEXT,
    "plan" "Plan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "emails" TEXT[],
    "phones" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_defs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL,
    "parentType" "CustomFieldParentType" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "fieldDefinitionId" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DOUBLE PRECISION,
    "booleanValue" BOOLEAN,
    "dateValue" TIMESTAMP(3),
    "source" "CustomFieldValueSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "pipelineId" TEXT,
    "stageId" TEXT,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "probabilitySource" "DealProbabilitySource" NOT NULL DEFAULT 'AUTO',
    "weightedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "priority" "DealPriority" NOT NULL DEFAULT 'MEDIUM',
    "leadSource" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ownerId" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "aiSummary" TEXT,
    "aiHealth" "DealHealth",
    "aiRiskScore" INTEGER,
    "aiNextAction" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "lastAiAnalysisAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "commLogId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_call_job_claims" (
    "logId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "post_call_job_claims_pkey" PRIMARY KEY ("logId")
);

-- CreateTable
CREATE TABLE "pipelines" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stages" TEXT[],
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "position" INTEGER NOT NULL,
    "probability" INTEGER NOT NULL DEFAULT 10,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_stage_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "changedById" TEXT,
    "comment" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "agentId" TEXT,
    "assigneeId" TEXT,
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_folders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Support',
    "language" TEXT NOT NULL DEFAULT 'Hinglish',
    "greetingMessage" TEXT NOT NULL DEFAULT 'Namaste! Main aapki kaise help kar sakta hoon?',
    "tone" TEXT NOT NULL DEFAULT 'Friendly',
    "fallbackMessage" TEXT NOT NULL DEFAULT 'I''ll connect you with our team for this. One moment please.',
    "businessInfo" TEXT,
    "websiteUrl" TEXT,
    "maxDuration" INTEGER NOT NULL DEFAULT 10,
    "dndCompliance" BOOLEAN NOT NULL DEFAULT true,
    "recordingConsent" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "agentGuidelines" TEXT,
    "modelName" TEXT NOT NULL,
    "voice" TEXT NOT NULL DEFAULT 'sarvam:shubh',
    "voiceSpeed" DOUBLE PRECISION,
    "voiceSettings" JSONB,
    "pronunciations" JSONB,
    "pronunciationDictId" TEXT,
    "intakeWorkflowId" TEXT,
    "smsWorkflowId" TEXT,
    "phoneNumberId" TEXT,
    "intakeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "intakeFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "intakePrompt" TEXT,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsTriggerCondition" TEXT,
    "smsTemplate" TEXT,
    "smsAgentReply" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPrompt" TEXT,
    "apiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "apiWorkflowId" TEXT,
    "apiPrompt" TEXT,
    "callTransferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "callTransferWorkflowId" TEXT,
    "callTransferNumber" TEXT,
    "callTransferCondition" TEXT,
    "callTransferMessage" TEXT,
    "callTransferFallbackNumber" TEXT,
    "callTransferTimeoutSec" INTEGER NOT NULL DEFAULT 25,
    "callTransferNoAnswerAction" TEXT NOT NULL DEFAULT 'take_message',
    "callTransferStyle" TEXT NOT NULL DEFAULT 'warm',
    "bookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bookingConfig" JSONB,
    "businessHours" JSONB,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "label" TEXT,
    "kind" "PhoneNumberKind" NOT NULL DEFAULT 'AGENT_LINE',
    "provider" "TelephonyProvider" NOT NULL DEFAULT 'TWILIO',
    "country" "PhoneNumberCountry" NOT NULL DEFAULT 'US',
    "providerRef" TEXT,
    "twilioSid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "workflowRunId" TEXT,
    "phoneNumberId" TEXT,
    "type" "CommType" NOT NULL,
    "direction" "Direction" NOT NULL,
    "status" "CommStatus" NOT NULL,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "transcriptJson" JSONB,
    "sentimentScore" DOUBLE PRECISION,
    "extractionStatus" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "extractedFields" JSONB,
    "body" TEXT,
    "mediaUrl" TEXT,
    "subject" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerRef" TEXT,
    "metadata" JSONB,
    "sessionId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "channel" "CommType" NOT NULL DEFAULT 'WHATSAPP',
    "status" "ChatSessionStatus" NOT NULL DEFAULT 'OPEN',
    "commLogId" TEXT,
    "humanTakeover" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "direction" "Direction",
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "commLogId" TEXT,
    "dealId" TEXT,
    "bookingId" TEXT,
    "workflowRunId" TEXT,
    "noteId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "credit_ledger_tenantId_createdAt_idx" ON "credit_ledger"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_records_paymentId_key" ON "payment_records"("paymentId");

-- CreateIndex
CREATE INDEX "payment_records_tenantId_createdAt_idx" ON "payment_records"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscriptions_tenantId_key" ON "billing_subscriptions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenantId_email_key" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "deals_tenantId_pipelineId_stage_idx" ON "deals"("tenantId", "pipelineId", "stage");

-- CreateIndex
CREATE INDEX "deals_tenantId_nextFollowUpAt_idx" ON "deals"("tenantId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "deals_tenantId_contactId_actualCloseDate_idx" ON "deals"("tenantId", "contactId", "actualCloseDate");

-- CreateIndex
CREATE INDEX "deal_events_tenantId_dealId_createdAt_idx" ON "deal_events"("tenantId", "dealId", "createdAt");

-- CreateIndex
CREATE INDEX "deal_events_tenantId_actor_createdAt_idx" ON "deal_events"("tenantId", "actor", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "deal_events_commLogId_eventType_key" ON "deal_events"("commLogId", "eventType");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipelineId_position_idx" ON "pipeline_stages"("pipelineId", "position");

-- CreateIndex
CREATE INDEX "deal_stage_history_dealId_changedAt_idx" ON "deal_stage_history"("dealId", "changedAt");

-- CreateIndex
CREATE INDEX "workflow_definitions_tenantId_folderId_idx" ON "workflow_definitions"("tenantId", "folderId");

-- CreateIndex
CREATE INDEX "workflow_folders_tenantId_parentId_idx" ON "workflow_folders"("tenantId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_phoneNumber_key" ON "phone_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "communication_logs_tenantId_occurredAt_idx" ON "communication_logs"("tenantId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "communication_logs_contactId_occurredAt_idx" ON "communication_logs"("contactId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "communication_logs_agentId_occurredAt_idx" ON "communication_logs"("agentId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "communication_logs_tenantId_type_occurredAt_idx" ON "communication_logs"("tenantId", "type", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "communication_logs_tenantId_agentId_type_idx" ON "communication_logs"("tenantId", "agentId", "type");

-- CreateIndex
CREATE INDEX "communication_logs_sessionId_idx" ON "communication_logs"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_commLogId_key" ON "chat_sessions"("commLogId");

-- CreateIndex
CREATE INDEX "chat_sessions_status_lastMessageAt_idx" ON "chat_sessions"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_sessions_tenantId_contactId_agentId_status_idx" ON "chat_sessions"("tenantId", "contactId", "agentId", "status");

-- CreateIndex
CREATE INDEX "activities_contactId_occurredAt_idx" ON "activities"("contactId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "activities_tenantId_occurredAt_idx" ON "activities"("tenantId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "activities_tenantId_type_idx" ON "activities"("tenantId", "type");

-- CreateIndex
CREATE INDEX "password_reset_otps_userId_idx" ON "password_reset_otps"("userId");

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "custom_field_defs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_events" ADD CONSTRAINT "deal_events_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "workflow_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_folders" ADD CONSTRAINT "workflow_folders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_folders" ADD CONSTRAINT "workflow_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "workflow_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "workflow_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_commLogId_fkey" FOREIGN KEY ("commLogId") REFERENCES "communication_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
