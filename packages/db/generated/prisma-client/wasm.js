
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  plan: 'plan',
  timezone: 'timezone',
  businessType: 'businessType',
  websiteUrl: 'websiteUrl',
  teamSize: 'teamSize',
  monthlyRevenue: 'monthlyRevenue',
  onboardingStep: 'onboardingStep',
  onboardingDone: 'onboardingDone',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ContactScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  firstName: 'firstName',
  lastName: 'lastName',
  emails: 'emails',
  phones: 'phones',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomFieldDefinitionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  type: 'type',
  parentType: 'parentType',
  options: 'options',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomFieldValueScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contactId: 'contactId',
  fieldDefinitionId: 'fieldDefinitionId',
  textValue: 'textValue',
  numberValue: 'numberValue',
  booleanValue: 'booleanValue',
  dateValue: 'dateValue',
  source: 'source',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contactId: 'contactId',
  pipelineId: 'pipelineId',
  title: 'title',
  value: 'value',
  stage: 'stage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PipelineScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  stages: 'stages',
  filters: 'filters',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contactId: 'contactId',
  title: 'title',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NoteScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contactId: 'contactId',
  content: 'content',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowDefinitionScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  triggerType: 'triggerType',
  actions: 'actions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowRunScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  workflowDefinitionId: 'workflowDefinitionId',
  status: 'status',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AIAgentScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  name: 'name',
  role: 'role',
  language: 'language',
  greetingMessage: 'greetingMessage',
  tone: 'tone',
  fallbackMessage: 'fallbackMessage',
  businessInfo: 'businessInfo',
  websiteUrl: 'websiteUrl',
  maxDuration: 'maxDuration',
  dndCompliance: 'dndCompliance',
  recordingConsent: 'recordingConsent',
  isActive: 'isActive',
  systemPrompt: 'systemPrompt',
  modelName: 'modelName',
  voice: 'voice',
  intakeWorkflowId: 'intakeWorkflowId',
  smsWorkflowId: 'smsWorkflowId',
  phoneNumberId: 'phoneNumberId',
  intakeEnabled: 'intakeEnabled',
  intakeFields: 'intakeFields',
  intakePrompt: 'intakePrompt',
  smsEnabled: 'smsEnabled',
  smsTriggerCondition: 'smsTriggerCondition',
  smsTemplate: 'smsTemplate',
  smsAgentReply: 'smsAgentReply',
  deletedAt: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PhoneNumberScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  phoneNumber: 'phoneNumber',
  label: 'label',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KnowledgeBaseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  agentId: 'agentId',
  name: 'name',
  content: 'content',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommunicationLogScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contactId: 'contactId',
  agentId: 'agentId',
  workflowRunId: 'workflowRunId',
  phoneNumberId: 'phoneNumberId',
  type: 'type',
  direction: 'direction',
  status: 'status',
  duration: 'duration',
  recordingUrl: 'recordingUrl',
  transcript: 'transcript',
  transcriptJson: 'transcriptJson',
  sentimentScore: 'sentimentScore',
  extractionStatus: 'extractionStatus',
  extractedFields: 'extractedFields',
  body: 'body',
  mediaUrl: 'mediaUrl',
  subject: 'subject',
  deliveredAt: 'deliveredAt',
  provider: 'provider',
  providerRef: 'providerRef',
  metadata: 'metadata',
  occurredAt: 'occurredAt',
  createdAt: 'createdAt'
};

exports.Prisma.ActivityScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  contactId: 'contactId',
  type: 'type',
  direction: 'direction',
  summary: 'summary',
  metadata: 'metadata',
  commLogId: 'commLogId',
  dealId: 'dealId',
  bookingId: 'bookingId',
  workflowRunId: 'workflowRunId',
  noteId: 'noteId',
  occurredAt: 'occurredAt',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetOtpScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  otp: 'otp',
  expiresAt: 'expiresAt',
  used: 'used',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.Plan = exports.$Enums.Plan = {
  FREE: 'FREE',
  GROWTH: 'GROWTH',
  PRO: 'PRO'
};

exports.TeamSize = exports.$Enums.TeamSize = {
  SOLO: 'SOLO',
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE'
};

exports.CustomFieldType = exports.$Enums.CustomFieldType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  DROPDOWN: 'DROPDOWN',
  DATE: 'DATE'
};

exports.CustomFieldParentType = exports.$Enums.CustomFieldParentType = {
  CONTACT: 'CONTACT',
  DEAL: 'DEAL'
};

exports.CustomFieldValueSource = exports.$Enums.CustomFieldValueSource = {
  MANUAL: 'MANUAL',
  WORKFLOW: 'WORKFLOW',
  CALL: 'CALL',
  SMS: 'SMS'
};

exports.CommType = exports.$Enums.CommType = {
  CALL: 'CALL',
  SMS: 'SMS',
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL'
};

exports.Direction = exports.$Enums.Direction = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND'
};

exports.CommStatus = exports.$Enums.CommStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  NO_ANSWER: 'NO_ANSWER',
  FAILED: 'FAILED',
  VOICEMAIL: 'VOICEMAIL',
  BUSY: 'BUSY',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  RECEIVED: 'RECEIVED',
  READ: 'READ'
};

exports.ExtractionStatus = exports.$Enums.ExtractionStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED'
};

exports.ActivityType = exports.$Enums.ActivityType = {
  CALL_INBOUND: 'CALL_INBOUND',
  CALL_OUTBOUND: 'CALL_OUTBOUND',
  SMS_SENT: 'SMS_SENT',
  SMS_RECEIVED: 'SMS_RECEIVED',
  WHATSAPP_SENT: 'WHATSAPP_SENT',
  WHATSAPP_RECEIVED: 'WHATSAPP_RECEIVED',
  DEAL_CREATED: 'DEAL_CREATED',
  DEAL_STAGE_CHANGED: 'DEAL_STAGE_CHANGED',
  BOOKING_CREATED: 'BOOKING_CREATED',
  FIELD_UPDATED: 'FIELD_UPDATED',
  WORKFLOW_TRIGGERED: 'WORKFLOW_TRIGGERED',
  NOTE_ADDED: 'NOTE_ADDED',
  CONTACT_CREATED: 'CONTACT_CREATED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  User: 'User',
  Contact: 'Contact',
  CustomFieldDefinition: 'CustomFieldDefinition',
  CustomFieldValue: 'CustomFieldValue',
  Deal: 'Deal',
  Pipeline: 'Pipeline',
  Booking: 'Booking',
  Note: 'Note',
  WorkflowDefinition: 'WorkflowDefinition',
  WorkflowRun: 'WorkflowRun',
  AIAgent: 'AIAgent',
  PhoneNumber: 'PhoneNumber',
  KnowledgeBase: 'KnowledgeBase',
  CommunicationLog: 'CommunicationLog',
  Activity: 'Activity',
  PasswordResetOtp: 'PasswordResetOtp'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
