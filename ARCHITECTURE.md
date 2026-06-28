# Legal Management System — Architecture

This document defines the production-style MVP architecture for the Hooshpod Legal Management System. It is derived from [REQUIREMENTS.md](./REQUIREMENTS.md) and must be approved before implementation begins.

---

## 1. Overall Architecture

### 1.1 System Overview

A three-tier, Docker-orchestrated full-stack application:

```mermaid
flowchart TB
    subgraph client [Client]
        Browser[Vue 3 SPA]
    end

    subgraph compose [Docker Compose]
        FE[frontend :5173]
        BE[backend :3000]
        PG[(PostgreSQL :5432)]
        VOL[uploads volume]
    end

    Browser -->|HTTPS / REST| FE
    FE -->|Axios /api| BE
    BE -->|Prisma| PG
    BE -->|Multer| VOL
    BE -->|Nodemailer| SMTP[SMTP Server]
```

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Presentation | Vue 3, Vite, Pinia, TailwindCSS | SaaS-style UI, client state, routing |
| API | NestJS, class-validator DTOs | REST API, auth, RBAC, business logic |
| Data | Prisma, PostgreSQL | Persistence, migrations, queries |
| Files | Multer, local disk volume | Binary document storage |
| Jobs | @nestjs/schedule | Deadline email reminders |
| Mail | Nodemailer | SMTP notifications |

### 1.2 Architectural Principles

1. **Feature modules** — Each domain (cases, contracts, notices, etc.) is a self-contained NestJS module with its own controller, service, and DTOs.
2. **Generic polymorphic entities** — `Task`, `Deadline`, `Document`, and `ActivityLog` attach to parent records via `entityType` + `entityId`. No per-parent junction tables (`CaseTask`, `ContractDocument`, etc.).
3. **Dual authorization** — Every protected endpoint enforces **RBAC** (role) and **ownership** (record assignment) on the server. The frontend never gates access alone.
4. **Soft delete everywhere** — Business entities use `deletedAt`. Prisma middleware or shared query helpers exclude deleted rows by default. Activity logs are immutable and never soft-deleted.
5. **Audit trail** — All mutating operations emit `ActivityLog` entries inside the same transaction where practical.
6. **No real-time layer** — Search and dashboard use standard HTTP polling/requests only (no WebSockets).

### 1.3 Repository Layout

```
hooshpod-legal-system/
├── docker-compose.yml
├── README.md
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── backend/                 # NestJS API
└── frontend/                # Vue 3 SPA
```

### 1.4 Request Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant G as JwtAuthGuard
    participant R as RolesGuard
    participant O as OwnershipGuard/Service
    participant S as Feature Service
    participant P as Prisma

    C->>G: Bearer JWT
    G->>R: req.user
    R->>O: role check
    O->>S: access granted
    S->>P: query/mutate
    P-->>S: result
    S-->>C: DTO response
```

### 1.5 Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| Validation | `class-validator` on all input DTOs; `ValidationPipe` globally |
| Errors | Consistent HTTP status codes; NestJS exception filters |
| Pagination | `?page=&limit=` on list endpoints; default `page=1`, `limit=20` |
| Filtering | Query params per resource (`status`, `ownerId`, `type`, etc.) |
| API docs | `@nestjs/swagger` at `/api/docs` |
| Migrations | Prisma migrate on backend container startup |
| Seeding | `prisma db seed` after migrations in Docker entrypoint |

### 1.6 Shared Backend Abstractions

To avoid duplicating logic across Cases, Contracts, and Notices:

- **`OwnershipService`** — Resolves whether `req.user` may read/write a record by `ownerId` and role.
- **`PolymorphicEntityService`** — Validates `entityType` + `entityId`, resolves parent record, checks access before Task/Deadline/Document operations.
- **`ActivityLogService`** — Central writer for audit entries.
- **`SoftDeleteService` / Prisma extension** — Applies `deletedAt: null` filter on all soft-deletable models.
- **`BaseRecordFields`** — Shared DTO/interface for `ownerId`, `createdById`, `updatedById` on primary entities.

---

## 2. Prisma Schema

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────

enum UserRole {
  ADMIN
  MANAGER
  COUNSEL
  VIEWER
}

enum EntityType {
  CASE
  CONTRACT
  NOTICE
}

enum CaseType {
  LITIGATION
  ARBITRATION
  REGULATORY
  ADVISORY
  OTHER
}

enum CaseStatus {
  OPEN
  IN_PROGRESS
  ON_HOLD
  CLOSED
  ARCHIVED
}

enum CasePriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ContractType {
  NDA
  MSA
  SOW
  EMPLOYMENT
  VENDOR
  LEASE
  OTHER
}

enum ContractStatus {
  DRAFT
  ACTIVE
  EXPIRED
  TERMINATED
  RENEWED
}

enum NoticeStatus {
  RECEIVED
  UNDER_REVIEW
  RESPONDED
  CLOSED
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  CANCELLED
}

enum DeadlineStatus {
  PENDING
  COMPLETED
  OVERDUE
  CANCELLED
}

enum ActivityAction {
  CREATE
  UPDATE
  DELETE
  REASSIGN
  STATUS_CHANGE
  UPLOAD
  OWNERSHIP_TRANSFER
}

// ─── User ────────────────────────────────────────────────

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  firstName    String
  lastName     String
  role         UserRole
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  ownedCases     Case[]     @relation("CaseOwner")
  ownedContracts Contract[] @relation("ContractOwner")
  ownedNotices   Notice[]   @relation("NoticeOwner")

  assignedTasks      Task[]     @relation("TaskAssignee")
  assignedDeadlines  Deadline[] @relation("DeadlineAssignee")
  uploadedDocuments  Document[] @relation("DocumentUploader")

  createdCases     Case[]     @relation("CaseCreatedBy")
  updatedCases     Case[]     @relation("CaseUpdatedBy")
  createdContracts Contract[] @relation("ContractCreatedBy")
  updatedContracts Contract[] @relation("ContractUpdatedBy")
  createdNotices   Notice[]   @relation("NoticeCreatedBy")
  updatedNotices   Notice[]   @relation("NoticeUpdatedBy")
  createdTasks     Task[]     @relation("TaskCreatedBy")
  updatedTasks     Task[]     @relation("TaskUpdatedBy")

  activityLogs ActivityLog[]

  @@index([role])
  @@index([deletedAt])
  @@map("users")
}

// ─── Primary Business Entities ─────────────────────────────

model Case {
  id              String       @id @default(uuid())
  title           String
  referenceCode   String       @unique
  type            CaseType
  status          CaseStatus   @default(OPEN)
  priority        CasePriority @default(MEDIUM)
  ownerId         String
  involvedParties Json         @default("[]") // [{ name, role, contact? }]
  description     String?
  openedDate      DateTime?
  closedDate      DateTime?
  createdById     String
  updatedById     String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  owner     User @relation("CaseOwner", fields: [ownerId], references: [id])
  createdBy User @relation("CaseCreatedBy", fields: [createdById], references: [id])
  updatedBy User @relation("CaseUpdatedBy", fields: [updatedById], references: [id])

  @@index([ownerId])
  @@index([status])
  @@index([type])
  @@index([priority])
  @@index([deletedAt])
  @@index([title])
  @@index([referenceCode])
  @@map("cases")
}

model Contract {
  id             String         @id @default(uuid())
  title          String
  type           ContractType
  counterparty   String
  status         ContractStatus @default(DRAFT)
  ownerId        String
  effectiveDate  DateTime?
  expirationDate DateTime?
  renewalDate    DateTime?
  keyTerms       String?
  createdById    String
  updatedById    String
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  deletedAt      DateTime?

  owner     User @relation("ContractOwner", fields: [ownerId], references: [id])
  createdBy User @relation("ContractCreatedBy", fields: [createdById], references: [id])
  updatedBy User @relation("ContractUpdatedBy", fields: [updatedById], references: [id])

  @@index([ownerId])
  @@index([status])
  @@index([type])
  @@index([expirationDate])
  @@index([deletedAt])
  @@index([title])
  @@index([counterparty])
  @@map("contracts")
}

model Notice {
  id                String       @id @default(uuid())
  sender            String
  receivedDate      DateTime
  responseDeadline  DateTime?
  status            NoticeStatus @default(RECEIVED)
  ownerId           String
  description       String?
  createdById       String
  updatedById       String
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt
  deletedAt         DateTime?

  owner     User @relation("NoticeOwner", fields: [ownerId], references: [id])
  createdBy User @relation("NoticeCreatedBy", fields: [createdById], references: [id])
  updatedBy User @relation("NoticeUpdatedBy", fields: [updatedById], references: [id])

  @@index([ownerId])
  @@index([status])
  @@index([responseDeadline])
  @@index([deletedAt])
  @@index([sender])
  @@map("notices")
}

// ─── Generic Polymorphic Entities ────────────────────────

model Task {
  id          String     @id @default(uuid())
  title       String
  description String?
  assigneeId  String
  dueDate     DateTime?
  status      TaskStatus @default(TODO)
  entityType  EntityType?
  entityId    String?
  createdById String
  updatedById String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  assignee  User @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdBy User @relation("TaskCreatedBy", fields: [createdById], references: [id])
  updatedBy User @relation("TaskUpdatedBy", fields: [updatedById], references: [id])

  @@index([assigneeId])
  @@index([status])
  @@index([dueDate])
  @@index([entityType, entityId])
  @@index([deletedAt])
  @@index([title])
  @@map("tasks")
}

model Deadline {
  id           String         @id @default(uuid())
  title        String
  dueDate      DateTime
  assignedToId String
  entityType   EntityType
  entityId     String
  status       DeadlineStatus @default(PENDING)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?

  assignedTo User @relation("DeadlineAssignee", fields: [assignedToId], references: [id])

  @@index([assignedToId])
  @@index([dueDate])
  @@index([status])
  @@index([entityType, entityId])
  @@index([deletedAt])
  @@map("deadlines")
}

model Document {
  id               String     @id @default(uuid())
  originalFilename String
  storedFilename   String     @unique
  mimeType         String
  size             Int
  entityType       EntityType
  entityId         String
  uploadedById     String
  description      String?
  uploadDate       DateTime   @default(now())
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  deletedAt        DateTime?

  uploadedBy User @relation("DocumentUploader", fields: [uploadedById], references: [id])

  @@index([entityType, entityId])
  @@index([uploadedById])
  @@index([deletedAt])
  @@index([originalFilename])
  @@map("documents")
}

model ActivityLog {
  id         String         @id @default(uuid())
  entityType EntityType
  entityId   String
  action     ActivityAction
  actorId    String
  metadata   Json           @default("{}")
  timestamp  DateTime       @default(now())

  actor User @relation(fields: [actorId], references: [id])

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([timestamp])
  @@index([action])
  @@map("activity_logs")
}

// ─── Offboarding Audit (optional persistent record) ────────

model OwnershipTransfer {
  id              String   @id @default(uuid())
  fromUserId      String
  toUserId        String
  performedById   String
  casesCount      Int      @default(0)
  contractsCount  Int      @default(0)
  noticesCount    Int      @default(0)
  tasksCount      Int      @default(0)
  deadlinesCount  Int      @default(0)
  createdAt       DateTime @default(now())

  @@index([fromUserId])
  @@index([toUserId])
  @@map("ownership_transfers")
}
```

### 2.1 Index Rationale

| Index | Purpose |
|-------|---------|
| `ownerId` on Case/Contract/Notice | Ownership filtering for COUNSEL/VIEWER |
| `(entityType, entityId)` | Polymorphic lookups for tasks, deadlines, documents, logs |
| `deletedAt` | Efficient soft-delete filtering |
| `title`, `referenceCode`, `counterparty`, `sender` | Search and filter performance |
| `dueDate`, `responseDeadline`, `expirationDate` | Dashboard and reminder queries |
| `timestamp` on ActivityLog | Recent activity feed ordering |

### 2.2 Full-Text Search (Migration SQL)

Prisma schema above uses B-tree indexes. A follow-up raw SQL migration adds PostgreSQL `tsvector` columns for global search:

```sql
-- Applied via prisma/migrations/.../add_search_vectors.sql

ALTER TABLE cases ADD COLUMN search_vector tsvector;
ALTER TABLE contracts ADD COLUMN search_vector tsvector;
ALTER TABLE notices ADD COLUMN search_vector tsvector;

CREATE INDEX cases_search_idx ON cases USING GIN (search_vector);
CREATE INDEX contracts_search_idx ON contracts USING GIN (search_vector);
CREATE INDEX notices_search_idx ON notices USING GIN (search_vector);

-- Triggers or application-level updates keep search_vector in sync on INSERT/UPDATE
```

---

## 3. Entity Relationship Explanation

### 3.1 ER Diagram

```mermaid
erDiagram
    User ||--o{ Case : owns
    User ||--o{ Contract : owns
    User ||--o{ Notice : owns
    User ||--o{ Task : assigned
    User ||--o{ Deadline : assigned
    User ||--o{ Document : uploads
    User ||--o{ ActivityLog : performs

    User ||--o{ Case : created
    User ||--o{ Case : updated
    User ||--o{ Contract : created
    User ||--o{ Contract : updated
    User ||--o{ Notice : created
    User ||--o{ Notice : updated

    Case ||--o{ Task : "entityType+entityId"
    Contract ||--o{ Task : "entityType+entityId"
    Notice ||--o{ Task : "entityType+entityId"

    Case ||--o{ Deadline : "entityType+entityId"
    Contract ||--o{ Deadline : "entityType+entityId"
    Notice ||--o{ Deadline : "entityType+entityId"

    Case ||--o{ Document : "entityType+entityId"
    Contract ||--o{ Document : "entityType+entityId"
    Notice ||--o{ Document : "entityType+entityId"

    Case ||--o{ ActivityLog : "entityType+entityId"
    Contract ||--o{ ActivityLog : "entityType+entityId"
    Notice ||--o{ ActivityLog : "entityType+entityId"
```

### 3.2 Relationship Types

| Relationship | Cardinality | Notes |
|--------------|-------------|-------|
| User → Case/Contract/Notice (owner) | 1:N | `ownerId` drives ownership-based access. Reassignable via PATCH or offboarding. |
| User → Task (assignee) | 1:N | `assigneeId`. Offboarding reassigns tasks to replacement user. |
| User → Deadline (assignee) | 1:N | `assignedToId`. Offboarding reassigns deadlines. |
| User → Document (uploader) | 1:N | `uploadedById` for audit; access still gated by parent entity. |
| User → ActivityLog (actor) | 1:N | Immutable audit trail. |
| Primary entity → Task/Deadline/Document/ActivityLog | Logical 1:N | No FK constraint to polymorphic parent (Prisma limitation); enforced in application layer via `entityType` + `entityId`. |

### 3.3 Ownership vs Assignment

- **Cases, Contracts, Notices** use `ownerId` — the counsel responsible for the record.
- **Tasks** use `assigneeId` — who must complete the work (may differ from record owner).
- **Deadlines** use `assignedToId` — who is responsible for meeting the deadline.

COUNSEL and VIEWER access is determined by **ownership** on primary entities and **assignment** on tasks/deadlines, plus inherited access when a task/deadline/document is linked to an owned parent record.

### 3.4 Access Inheritance Rules

| Resource | COUNSEL/VIEWER can access when |
|----------|-------------------------------|
| Case / Contract / Notice | `ownerId === user.id` |
| Task | `assigneeId === user.id` OR linked parent entity is owned by user |
| Deadline | `assignedToId === user.id` OR linked parent entity is owned by user |
| Document | Parent entity (`entityType` + `entityId`) is accessible to user |
| ActivityLog | Parent entity is accessible to user |

ADMIN and MANAGER bypass ownership filters (MANAGER with acceptable user-admin limitations).

### 3.5 Soft Delete Behavior

- Deleting a Case/Contract/Notice soft-deletes the parent only. Child tasks, deadlines, and documents remain but become unreachable through normal list/detail queries (parent access check fails).
- Optional cascade soft-delete of children can be implemented in the service layer for consistency.
- Activity logs are never deleted.

---

## 4. Backend Folder Structure

```
backend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── uploads/                          # gitignored; Docker volume mount
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/
    │   ├── configuration.ts          # env validation (Joi or class-validator)
    │   └── config.module.ts
    ├── common/
    │   ├── decorators/
    │   │   ├── roles.decorator.ts
    │   │   ├── current-user.decorator.ts
    │   │   └── public.decorator.ts
    │   ├── dto/
    │   │   ├── pagination.dto.ts
    │   │   └── paginated-response.dto.ts
    │   ├── enums/
    │   │   └── index.ts              # re-export Prisma enums
    │   ├── filters/
    │   │   └── http-exception.filter.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   └── roles.guard.ts
    │   ├── interceptors/
    │   │   └── transform.interceptor.ts
    │   ├── pipes/
    │   │   └── parse-uuid.pipe.ts
    │   ├── services/
    │   │   ├── ownership.service.ts
    │   │   ├── polymorphic-entity.service.ts
    │   │   └── soft-delete.extension.ts
    │   └── types/
    │       ├── jwt-payload.type.ts
    │       └── authenticated-user.type.ts
    ├── prisma/
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── strategies/
    │   │   └── jwt.strategy.ts
    │   └── dto/
    │       ├── login.dto.ts
    │       └── auth-response.dto.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   └── dto/
    ├── cases/
    │   ├── cases.module.ts
    │   ├── cases.controller.ts
    │   ├── cases.service.ts
    │   └── dto/
    ├── contracts/
    │   ├── contracts.module.ts
    │   ├── contracts.controller.ts
    │   ├── contracts.service.ts
    │   └── dto/
    ├── notices/
    │   ├── notices.module.ts
    │   ├── notices.controller.ts
    │   ├── notices.service.ts
    │   └── dto/
    ├── tasks/
    │   ├── tasks.module.ts
    │   ├── tasks.controller.ts
    │   ├── tasks.service.ts
    │   └── dto/
    ├── deadlines/
    │   ├── deadlines.module.ts
    │   ├── deadlines.controller.ts
    │   ├── deadlines.service.ts
    │   └── dto/
    ├── documents/
    │   ├── documents.module.ts
    │   ├── documents.controller.ts
    │   ├── documents.service.ts
    │   ├── documents.storage.ts        # Multer config
    │   └── dto/
    ├── activity-log/
    │   ├── activity-log.module.ts
    │   ├── activity-log.controller.ts
    │   ├── activity-log.service.ts
    │   └── dto/
    ├── dashboard/
    │   ├── dashboard.module.ts
    │   ├── dashboard.controller.ts
    │   ├── dashboard.service.ts
    │   └── dto/
    ├── search/
    │   ├── search.module.ts
    │   ├── search.controller.ts
    │   ├── search.service.ts
    │   └── dto/
    ├── offboarding/
    │   ├── offboarding.module.ts
    │   ├── offboarding.controller.ts
    │   ├── offboarding.service.ts
    │   └── dto/
    └── mail/
        ├── mail.module.ts
        ├── mail.service.ts               # Nodemailer wrapper
        └── templates/
            ├── deadline-upcoming.hbs
            └── deadline-overdue.hbs
    └── reminders/
        ├── reminders.module.ts
        └── reminders.service.ts          # @nestjs/schedule cron jobs
```

---

## 5. Frontend Folder Structure

```
frontend/
├── Dockerfile
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
└── src/
    ├── main.ts
    ├── App.vue
    ├── assets/
    │   └── styles/
    │       └── main.css
    ├── api/
    │   ├── client.ts                   # Axios instance + interceptors
    │   ├── auth.api.ts
    │   ├── users.api.ts
    │   ├── cases.api.ts
    │   ├── contracts.api.ts
    │   ├── notices.api.ts
    │   ├── tasks.api.ts
    │   ├── deadlines.api.ts
    │   ├── documents.api.ts
    │   ├── activity-log.api.ts
    │   ├── dashboard.api.ts
    │   ├── search.api.ts
    │   └── offboarding.api.ts
    ├── types/
    │   ├── auth.ts
    │   ├── user.ts
    │   ├── case.ts
    │   ├── contract.ts
    │   ├── notice.ts
    │   ├── task.ts
    │   ├── deadline.ts
    │   ├── document.ts
    │   ├── activity-log.ts
    │   ├── dashboard.ts
    │   ├── search.ts
    │   └── enums.ts
    ├── stores/
    │   ├── auth.store.ts
    │   ├── ui.store.ts
    │   └── search.store.ts
    ├── router/
    │   ├── index.ts
    │   └── guards.ts                   # auth redirect; UI hints only
    ├── composables/
    │   ├── useAuth.ts
    │   ├── usePagination.ts
    │   ├── useDebounce.ts
    │   ├── usePermissions.ts           # UI display only
    │   └── useToast.ts
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.vue
    │   │   ├── Sidebar.vue
    │   │   ├── TopBar.vue
    │   │   └── PageHeader.vue
    │   ├── common/
    │   │   ├── DataTable.vue
    │   │   ├── Pagination.vue
    │   │   ├── StatusBadge.vue
    │   │   ├── ConfirmDialog.vue
    │   │   ├── EmptyState.vue
    │   │   ├── LoadingSpinner.vue
    │   │   ├── SearchDropdown.vue
    │   │   └── FileUpload.vue
    │   ├── forms/
    │   │   ├── FormField.vue
    │   │   ├── SelectField.vue
    │   │   └── DatePicker.vue
    │   └── domain/
    │       ├── ActivityFeed.vue
    │       ├── EntityTasksPanel.vue
    │       ├── EntityDeadlinesPanel.vue
    │       ├── EntityDocumentsPanel.vue
    │       └── OwnershipSelect.vue
    └── views/
        ├── auth/
        │   └── LoginView.vue
        ├── dashboard/
        │   └── DashboardView.vue
        ├── cases/
        │   ├── CaseListView.vue
        │   ├── CaseDetailView.vue
        │   └── CaseFormView.vue
        ├── contracts/
        │   ├── ContractListView.vue
        │   ├── ContractDetailView.vue
        │   └── ContractFormView.vue
        ├── notices/
        │   ├── NoticeListView.vue
        │   ├── NoticeDetailView.vue
        │   └── NoticeFormView.vue
        ├── tasks/
        │   ├── TaskListView.vue
        │   └── TaskFormView.vue
        ├── deadlines/
        │   ├── DeadlineListView.vue
        │   └── DeadlineFormView.vue
        ├── documents/
        │   └── DocumentListView.vue
        ├── users/
        │   ├── UserListView.vue
        │   └── UserFormView.vue
        ├── activity-log/
        │   └── ActivityLogView.vue
        └── offboarding/
            └── OffboardingView.vue
```

---

## 6. API Endpoint List

Base URL: `/api/v1`  
Auth header: `Authorization: Bearer <access_token>` (except public routes)

### 6.1 Auth

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/auth/login` | Public | — | Email + password → JWT |
| GET | `/auth/me` | JWT | All | Current user profile |

### 6.2 Users

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/users` | JWT | ADMIN, MANAGER | Paginated user list |
| GET | `/users/:id` | JWT | ADMIN, MANAGER | User detail |
| POST | `/users` | JWT | ADMIN | Create user |
| PATCH | `/users/:id` | JWT | ADMIN | Update user (role, active status) |
| DELETE | `/users/:id` | JWT | ADMIN | Soft-delete user |

### 6.3 Cases

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/cases` | JWT | All* | List cases (scoped by role) |
| GET | `/cases/:id` | JWT | All* | Case detail |
| POST | `/cases` | JWT | ADMIN, MANAGER, COUNSEL | Create case |
| PATCH | `/cases/:id` | JWT | All* | Update case |
| PATCH | `/cases/:id/owner` | JWT | ADMIN, MANAGER | Reassign ownership |
| DELETE | `/cases/:id` | JWT | ADMIN, MANAGER, COUNSEL† | Soft-delete |

\* COUNSEL/VIEWER: owned records only. † COUNSEL: own records only.

### 6.4 Contracts

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/contracts` | JWT | All* | List contracts |
| GET | `/contracts/:id` | JWT | All* | Contract detail |
| POST | `/contracts` | JWT | ADMIN, MANAGER, COUNSEL | Create contract |
| PATCH | `/contracts/:id` | JWT | All* | Update contract |
| PATCH | `/contracts/:id/owner` | JWT | ADMIN, MANAGER | Reassign ownership |
| DELETE | `/contracts/:id` | JWT | ADMIN, MANAGER, COUNSEL† | Soft-delete |

### 6.5 Notices

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/notices` | JWT | All* | List notices |
| GET | `/notices/:id` | JWT | All* | Notice detail |
| POST | `/notices` | JWT | ADMIN, MANAGER, COUNSEL | Create notice |
| PATCH | `/notices/:id` | JWT | All* | Update notice |
| PATCH | `/notices/:id/owner` | JWT | ADMIN, MANAGER | Reassign ownership |
| DELETE | `/notices/:id` | JWT | ADMIN, MANAGER, COUNSEL† | Soft-delete |

### 6.6 Tasks

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/tasks` | JWT | All* | List tasks (`assigneeId`, `status`, `entityType`, `entityId` filters) |
| GET | `/tasks/:id` | JWT | All* | Task detail |
| POST | `/tasks` | JWT | ADMIN, MANAGER, COUNSEL | Create task |
| PATCH | `/tasks/:id` | JWT | All* | Update task |
| DELETE | `/tasks/:id` | JWT | ADMIN, MANAGER, COUNSEL† | Soft-delete |

### 6.7 Deadlines

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/deadlines` | JWT | All* | List deadlines |
| GET | `/deadlines/today` | JWT | All* | Today's deadlines |
| GET | `/deadlines/upcoming` | JWT | All* | Upcoming deadlines |
| GET | `/deadlines/overdue` | JWT | All* | Overdue deadlines |
| GET | `/deadlines/mine` | JWT | All* | Assigned to current user |
| GET | `/deadlines/:id` | JWT | All* | Deadline detail |
| POST | `/deadlines` | JWT | ADMIN, MANAGER, COUNSEL | Create deadline |
| PATCH | `/deadlines/:id` | JWT | All* | Update deadline |
| DELETE | `/deadlines/:id` | JWT | ADMIN, MANAGER, COUNSEL† | Soft-delete |

### 6.8 Documents

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/documents` | JWT | All* | List documents (`entityType`, `entityId` filters) |
| GET | `/documents/:id` | JWT | All* | Document metadata |
| POST | `/documents` | JWT | ADMIN, MANAGER, COUNSEL | Upload file (multipart/form-data) |
| GET | `/documents/:id/download` | JWT | All* | Download file stream |
| DELETE | `/documents/:id` | JWT | ADMIN, MANAGER, COUNSEL† | Soft-delete metadata; file retained or archived |

### 6.9 Activity Log

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/activity-log` | JWT | All* | Paginated log (`entityType`, `entityId`, `actorId` filters) |
| GET | `/activity-log/recent` | JWT | All* | Recent activity for dashboard |

### 6.10 Dashboard

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/dashboard` | JWT | All | Aggregated stats + upcoming deadlines + recent activity (permission-scoped) |

Response shape:

```json
{
  "openCasesCount": 0,
  "activeContractsCount": 0,
  "noticesCount": 0,
  "overdueDeadlinesCount": 0,
  "myTasksCount": 0,
  "upcomingDeadlines": [],
  "recentActivity": []
}
```

### 6.11 Search

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/search?q=` | JWT | All | Global search (permission-scoped) |

### 6.12 Offboarding

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/offboarding/preview?fromUserId=` | JWT | ADMIN | Preview affected record counts |
| POST | `/offboarding/transfer` | JWT | ADMIN | Transfer ownership in a transaction |

Request body:

```json
{
  "fromUserId": "uuid",
  "toUserId": "uuid"
}
```

---

## 7. Authentication and Authorization Strategy

### 7.1 Authentication (JWT)

```mermaid
flowchart LR
    A[POST /auth/login] --> B[Validate credentials]
    B --> C[bcrypt compare]
    C --> D[Sign JWT]
    D --> E[Return accessToken + user]
    E --> F[Client stores token]
    F --> G[Bearer header on requests]
    G --> H[JwtAuthGuard validates]
```

| Aspect | Decision |
|--------|----------|
| Password storage | bcrypt (cost factor 12) |
| Token type | JWT access token (stateless) |
| Token payload | `{ sub: userId, email, role }` |
| Expiry | Configurable via `JWT_EXPIRES_IN` (default: 8h) |
| Secret | `JWT_SECRET` env var |
| Refresh tokens | Not in MVP scope; re-login on expiry |

**Login flow:**

1. Client sends `{ email, password }`.
2. Server finds active, non-deleted user; verifies password.
3. Server returns `{ accessToken, user: { id, email, firstName, lastName, role } }`.
4. Axios interceptor attaches `Authorization: Bearer <token>`.
5. On `401`, client clears token and redirects to login.

### 7.2 Authorization Matrix (RBAC)

| Action | ADMIN | MANAGER | COUNSEL | VIEWER |
|--------|-------|---------|---------|--------|
| User CRUD | Full | List/read (limited write) | — | — |
| Create cases/contracts/notices | ✓ | ✓ | ✓ | — |
| Read cases/contracts/notices | All | All | Owned only | Owned only (read) |
| Update cases/contracts/notices | All | All | Owned only | — |
| Delete cases/contracts/notices | All | All | Owned only | — |
| Reassign ownership | ✓ | ✓ | — | — |
| Create tasks/deadlines/documents | ✓ | ✓ | ✓ | — |
| Read tasks/deadlines/documents | All | All | Assigned or parent-owned | Assigned or parent-owned (read) |
| Update tasks/deadlines | All | All | Assigned or parent-owned | — |
| Offboarding transfer | ✓ | — | — | — |
| Dashboard / Search | All data | All data | Scoped | Scoped (read) |

### 7.3 Ownership Enforcement (Server-Side)

Implemented in `OwnershipService` and called from every feature service:

```
canRead(user, record):
  if user.role in [ADMIN, MANAGER]: return true
  if user.role == VIEWER: return record.ownerId == user.id (read only)
  if user.role == COUNSEL: return record.ownerId == user.id

canWrite(user, record):
  if user.role == VIEWER: return false
  if user.role in [ADMIN, MANAGER]: return true
  if user.role == COUNSEL: return record.ownerId == user.id
```

For polymorphic children (`Task`, `Deadline`, `Document`):

1. Resolve parent via `entityType` + `entityId`.
2. Grant access if user is assignee/uploaded-by OR parent passes `canRead`/`canWrite`.

### 7.4 Guard Stack

| Guard | Responsibility |
|-------|----------------|
| `JwtAuthGuard` | Validates JWT; attaches `req.user` |
| `RolesGuard` | Checks `@Roles()` decorator against `req.user.role` |
| Service-level checks | Ownership and polymorphic parent resolution on every read/write |

### 7.5 Frontend Authorization (UI Only)

- `usePermissions` composable hides buttons (Create, Edit, Delete) based on role.
- Router guard redirects unauthenticated users to `/login`.
- **All security decisions are enforced on the API**; UI hints improve UX only.

---

## 8. Search Design

### 8.1 Endpoint

```
GET /api/v1/search?q=<query>&limit=10
```

- Minimum query length: 2 characters (return empty groups below threshold).
- Results are permission-scoped using the same ownership rules as list endpoints.

### 8.2 Response Format

```json
{
  "query": "smith",
  "cases": [
    { "id": "...", "title": "...", "referenceCode": "...", "status": "OPEN" }
  ],
  "contracts": [
    { "id": "...", "title": "...", "counterparty": "...", "status": "ACTIVE" }
  ],
  "notices": [
    { "id": "...", "sender": "...", "status": "RECEIVED" }
  ]
}
```

### 8.3 PostgreSQL Search Strategy

**Primary approach:** `tsvector` + `plainto_tsquery` with GIN indexes (see §2.2).

| Entity | Indexed fields |
|--------|----------------|
| Case | `title`, `referenceCode`, `description`, `involvedParties` (JSON text) |
| Contract | `title`, `counterparty`, `keyTerms` |
| Notice | `sender`, `description` |

**Query pattern (per entity, run in parallel):**

```sql
SELECT id, title, reference_code, status
FROM cases
WHERE deleted_at IS NULL
  AND search_vector @@ plainto_tsquery('english', :q)
  AND (:isScoped = false OR owner_id = :userId)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', :q)) DESC
LIMIT :limit;
```

**Fallback:** `ILIKE '%' || :q || '%'` on title/counterparty/sender when `tsvector` returns no results (typo tolerance).

### 8.4 Frontend Behavior

| Behavior | Implementation |
|----------|----------------|
| Search input | Top bar component |
| Debounce | 300ms via `useDebounce` |
| Loading | Spinner in dropdown while request in flight |
| Results | Grouped dropdown by type; click navigates to detail page |
| Empty state | "No results found" message |
| Transport | Standard HTTP GET (no WebSockets) |

### 8.5 Search Module Architecture

```
SearchController → SearchService
                     ├── buildScopedWhere(user, entity)
                     ├── searchCases(q, user)
                     ├── searchContracts(q, user)
                     └── searchNotices(q, user)
```

All three entity searches run concurrently (`Promise.all`).

---

## 9. File Upload Strategy

### 9.1 Storage Architecture

```mermaid
flowchart LR
    Client -->|multipart POST| Multer
    Multer -->|write| Disk["/uploads/{uuid}.ext"]
    Multer --> Meta[Document row in PostgreSQL]
    Client -->|GET download| API
    API -->|read stream| Disk
```

| Aspect | Decision |
|--------|----------|
| Library | Multer via `@nestjs/platform-express` |
| Storage | Local filesystem (`UPLOAD_DIR`, default `./uploads`) |
| Filename on disk | UUID + preserved extension (`{uuid}.pdf`) — prevents collisions and path traversal |
| Original name | Stored in `originalFilename` column |
| Docker | Named volume or bind mount for `uploads/` persistence |
| Max file size | `MAX_UPLOAD_SIZE_MB` env (default: 25) |
| Allowed MIME types | Configurable allowlist (pdf, doc, docx, xls, xlsx, png, jpg, jpeg) |

### 9.2 Upload Flow

1. Client sends `multipart/form-data` with fields: `file`, `entityType`, `entityId`, optional `description`.
2. `JwtAuthGuard` + role check.
3. `PolymorphicEntityService` validates parent exists and user has write access.
4. Multer `diskStorage` writes file with generated `storedFilename`.
5. `DocumentsService` creates `Document` row in a transaction.
6. `ActivityLogService` records `UPLOAD` action with metadata `{ documentId, originalFilename, size }`.
7. Returns document metadata (not file bytes).

### 9.3 Download Flow

1. `GET /documents/:id/download`
2. Load document metadata; verify not soft-deleted.
3. Resolve parent entity; run ownership check.
4. Stream file from disk via `res.download()` or `createReadStream` with correct `Content-Type` and `Content-Disposition: attachment; filename="<originalFilename>"`.

### 9.4 Delete Flow

- Soft-delete: set `deletedAt` on metadata row.
- Physical file: retained on disk (audit/compliance); optional cleanup job out of MVP scope.
- Log `DELETE` activity.

### 9.5 Security Controls

| Risk | Mitigation |
|------|------------|
| Path traversal | Store only UUID filename; never use client-provided path |
| Unauthorized access | Parent entity ownership check on every download |
| Oversized files | Multer `limits.fileSize` |
| MIME spoofing | Validate `mimetype` against allowlist; optionally inspect magic bytes |
| Direct static serving | Files are **not** served from a public static directory; only through authenticated API |

---

## 10. Email Reminder Strategy

### 10.1 Overview

Scheduled jobs via `@nestjs/schedule` send Nodemailer emails for upcoming and overdue deadlines.

```mermaid
flowchart TB
    Cron[@nestjs/schedule Cron] --> RS[RemindersService]
    RS --> Q1[Query upcoming deadlines]
    RS --> Q2[Query overdue deadlines]
    Q1 --> MS[MailService]
    Q2 --> MS
    MS --> NM[Nodemailer]
    NM --> SMTP[SMTP Server]
```

### 10.2 Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SMTP_HOST` | SMTP server host | `smtp.mailtrap.io` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_FROM` | From address | `legal@hooshpod.com` |
| `REMINDER_UPCOMING_DAYS` | Days ahead to notify | `3` |
| `REMINDER_CRON_UPCOMING` | Cron for upcoming job | `0 8 * * *` (daily 08:00) |
| `REMINDER_CRON_OVERDUE` | Cron for overdue job | `0 8 * * *` |
| `APP_URL` | Link base in emails | `http://localhost:5173` |

### 10.3 Job Definitions

| Job | Schedule | Logic |
|-----|----------|-------|
| Upcoming deadlines | Daily (configurable cron) | Find `Deadline` where `status = PENDING`, `deletedAt IS NULL`, `dueDate` between today and today + `REMINDER_UPCOMING_DAYS`; email `assignedTo` user |
| Overdue deadlines | Daily (configurable cron) | Find `Deadline` where `status IN (PENDING, OVERDUE)`, `dueDate < today`; update status to `OVERDUE` if still `PENDING`; email `assignedTo` user |

### 10.4 Idempotency

Add optional tracking to prevent duplicate emails on the same day:

- `DeadlineReminderLog` table (`deadlineId`, `reminderType`, `sentAt`) — or
- `metadata` JSON field on Deadline with `lastReminderSentAt` — or
- In-memory dedup per cron run (simpler MVP: query only deadlines due exactly N days from now for upcoming; overdue sent once per day max).

**Recommended MVP:** `DeadlineReminderLog` with unique constraint on `(deadlineId, reminderType, date)`.

### 10.5 Email Content

**Upcoming deadline:**

- Subject: `[Legal System] Upcoming deadline: {title}`
- Body: deadline title, due date, linked entity type/name, link to deadline detail page

**Overdue deadline:**

- Subject: `[Legal System] OVERDUE: {title}`
- Body: same fields with overdue emphasis

Templates: simple HTML strings or Handlebars files in `mail/templates/`.

### 10.6 Error Handling

- SMTP failures logged; job continues processing remaining deadlines.
- Inactive or soft-deleted users: skip email, log warning.
- Cron runs in backend container only (single instance in Docker Compose).

---

## 11. Docker Compose (Reference)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: legal
      POSTGRES_PASSWORD: legal
      POSTGRES_DB: legal_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U legal -d legal_db"]
      interval: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://legal:legal@postgres:5432/legal_db
      JWT_SECRET: ...
      UPLOAD_DIR: /app/uploads
    volumes:
      - uploads:/app/uploads
    ports:
      - "3000:3000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "5173:80"

volumes:
  pgdata:
  uploads:
```

Backend entrypoint: wait for DB → `prisma migrate deploy` → `prisma db seed` → `node dist/main`.

---

## 12. Seed Data Plan

| User | Email | Role | Password (documented in README) |
|------|-------|------|----------------------------------|
| Admin | admin@hooshpod.com | ADMIN | `Admin123!` |
| Manager | manager@hooshpod.com | MANAGER | `Manager123!` |
| Counsel A | counsel1@hooshpod.com | COUNSEL | `Counsel123!` |
| Counsel B | counsel2@hooshpod.com | COUNSEL | `Counsel123!` |
| Viewer | viewer@hooshpod.com | VIEWER | `Viewer123!` |

Seed includes sample cases, contracts, notices (split across counsel owners), linked tasks, deadlines, documents metadata (optional sample files), and activity logs.

---

## 13. Implementation Order (Post-Approval)

1. ✅ Docker + Prisma schema + migrations + seed (User model only in phase 1)
2. ✅ Auth module + users module
3. ✅ Cases + Documents (phase 2)
4. Contracts, Notices (shared patterns)
5. Generic Tasks, Deadlines, ActivityLog
6. Dashboard + Search
7. Offboarding
8. Email reminders
9. Frontend shell → feature pages module by module

---

## 14. Implementation Status

### Phase 1 (complete)

| Component | Status | Notes |
|-----------|--------|-------|
| Docker Compose | ✅ | postgres, backend, frontend |
| Prisma schema | ✅ | `User` model + `UserRole` enum only |
| Migrations + seed | ✅ | 5 seed users with documented credentials |
| NestJS bootstrap | ✅ | Global validation, Swagger, CORS, JWT + Roles guards |
| Auth module | ✅ | `POST /auth/login`, `GET /auth/me` |
| Users module | ✅ | Full CRUD with soft delete; ADMIN/MANAGER read, ADMIN write |
| Vue initialization | ✅ | Vite, Pinia, Router, TailwindCSS, layout shell |
| Frontend auth + users | ✅ | Login, dashboard placeholder, user list/form |

### Phase 2 (complete)

| Component | Status | Notes |
|-----------|--------|-------|
| Prisma schema | ✅ | Added `Case`, `Document`, related enums |
| Cases module | ✅ | CRUD + owner reassignment; RBAC + ownership enforcement |
| Documents module | ✅ | Multer upload, disk storage, download, list, soft delete |
| Access services | ✅ | `OwnershipService`, `PolymorphicEntityService` in `AccessModule` |
| Seed data | ✅ | 3 sample cases, 2 sample documents with files on disk |
| Frontend cases | ✅ | List, detail, create/edit with filters |
| Frontend documents | ✅ | Global list + case detail panel with upload/download |

### Prisma schema phasing

The full schema in §2 remains the target design. Phases 1–2 implement `User`, `Case`, and `Document` models. `Contract`, `Notice`, `Task`, `Deadline`, and `ActivityLog` will be added in subsequent migrations.

### Architecture adjustments from phase 1

- `PrismaService` lives in `backend/src/prisma/prisma.service.ts` (separate from module file).
- Frontend Docker build passes `VITE_API_URL` as a build arg pointing to `http://localhost:3000/api/v1` (browser calls backend directly).
- Dashboard UI is a placeholder until dashboard metrics modules are implemented.
- Backend Docker image installs Alpine build tools (`python3`, `make`, `g++`) for native `bcrypt` compilation.
- Local `npx prisma generate` may fail if `~/.cache/prisma` is not writable; use `HOME=<project-root> npx prisma generate` or fix cache permissions.

---

**Status: Phase 2 implemented (Cases + Documents).** Awaiting approval to continue with Contracts and Notices.
