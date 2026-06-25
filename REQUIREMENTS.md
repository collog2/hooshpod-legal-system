You are a senior software architect and principal engineer.

Build a complete full-stack Legal Management System from scratch.

Do not generate a prototype. Build a coherent, production-style MVP with clean architecture, maintainable code, proper authorization, Docker support, seed data, and a polished business application UI.

Technology stack:

Backend:

- NestJS
- Prisma
- PostgreSQL
- JWT Authentication
- RBAC Authorization
- Multer for uploads
- Nodemailer for emails
- @nestjs/schedule for reminders

Frontend:

- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router
- Axios
- TailwindCSS

Infrastructure:

- Docker
- Docker Compose

The application must run with:

docker compose up

and start:

- frontend
- backend
- postgres

without additional setup.

====================================================
BUSINESS DOMAIN
===============

This is a Legal Management System.

Core modules:

1. Authentication
2. Users
3. Cases
4. Contracts
5. Notices
6. Deadlines
7. Tasks
8. Documents
9. Activity Logs
10. Dashboard
11. Search
12. Ownership Transfer / Offboarding

====================================================
ROLES
=====

Implement RBAC roles:

ADMIN
MANAGER
COUNSEL
VIEWER

Permissions:

ADMIN

- Full access

MANAGER

- Full access except user administration limitations are acceptable

COUNSEL

- Can only access records assigned to them

VIEWER

- Read-only access to records assigned to them

IMPORTANT:

This system uses BOTH:

1. Role-Based Access Control
2. Ownership-Based Access Control

Counsels must NOT see other counsels' records.

Viewers must NOT see records not assigned to them.

All APIs must enforce authorization server-side.

Never rely on frontend authorization.

====================================================
OWNERSHIP MODEL
===============

Every primary business entity must contain:

ownerId
createdById
updatedById

Support reassignment of ownership.

====================================================
SOFT DELETE
===========

Implement soft deletes everywhere.

Use:

deletedAt

Never permanently delete records through normal UI actions.

Queries should automatically exclude deleted records.

====================================================
CORE ENTITIES
=============

CASES

Fields:

- title
- referenceCode
- type
- status
- priority
- ownerId
- involvedParties
- description
- openedDate
- closedDate

CONTRACTS

Fields:

- title
- type
- counterparty
- status
- ownerId
- effectiveDate
- expirationDate
- renewalDate
- keyTerms

NOTICES

Fields:

- sender
- receivedDate
- responseDeadline
- status
- ownerId
- description

TASKS

Fields:

- title
- description
- assigneeId
- dueDate
- status

====================================================
GENERIC DESIGN REQUIREMENT
==========================

Use a generic design.

DO NOT create:

CaseTask
ContractTask
NoticeTask

DO NOT create:

CaseDocument
ContractDocument
NoticeDocument

DO NOT create:

CaseDeadline
ContractDeadline
NoticeDeadline

Instead create generic entities:

Task
Deadline
Document
ActivityLog

using:

entityType
entityId

pattern.

Example:

Document

- entityType
- entityId

where entityType can be:

CASE
CONTRACT
NOTICE

This generic architecture is REQUIRED.

====================================================
DOCUMENT MANAGEMENT
===================

Take document management seriously.

Implement actual uploads.

Use Multer.

Store files on disk.

Store metadata in PostgreSQL.

Document fields:

- originalFilename
- storedFilename
- mimeType
- size
- entityType
- entityId
- uploadedById
- description
- uploadDate

Support:

- upload
- download
- listing
- access control

Users must only access documents for records they are allowed to access.

====================================================
ACTIVITY LOG / AUDIT TRAIL
==========================

Implement a generic activity log.

Fields:

- entityType
- entityId
- action
- actorId
- timestamp
- metadata

Track:

- create
- update
- reassignment
- status changes
- uploads
- ownership transfer

Dashboard must show recent activity.

====================================================
DEADLINES
=========

Implement a generic Deadline entity.

Fields:

- title
- dueDate
- assignedToId
- entityType
- entityId
- status

Required views:

- Today's deadlines
- Upcoming deadlines
- Overdue deadlines
- Assigned to me

====================================================
SEARCH
======

Build global search.

DO NOT use WebSockets.

DO NOT use Socket.IO.

Use normal HTTP requests.

Frontend behavior:

- search input
- 300ms debounce
- loading indicator
- dropdown results

Endpoint:

GET /search?q=

Search across:

- cases
- contracts
- notices

Response should be grouped by type.

Use PostgreSQL search capabilities where practical.

====================================================
DASHBOARD
=========

Dashboard should include:

- open cases count
- active contracts count
- notices count
- overdue deadlines count
- my tasks count
- upcoming deadlines
- recent activity feed

Dashboard must respect permissions.

====================================================
EMAIL REMINDERS
===============

Implement email reminders.

Use:

@nestjs/schedule

Run scheduled jobs.

Send emails for:

- upcoming deadlines
- overdue deadlines

Use Nodemailer.

Environment variables should configure SMTP.

====================================================
OFFBOARDING
===========

Implement ownership transfer.

Workflow:

1. Select user
2. Select replacement user
3. Preview affected records
4. Transfer ownership

Transfer:

- cases
- contracts
- notices
- tasks
- deadlines

Use transactions.

====================================================
DATABASE
========

Use PostgreSQL.

Use Prisma.

Create a clean schema.

Use enums where appropriate.

Add indexes.

Add timestamps everywhere.

createdAt
updatedAt

====================================================
API DESIGN
==========

Use feature modules.

Suggested modules:

auth
users
cases
contracts
notices
tasks
deadlines
documents
activity-log
dashboard
search
offboarding

Use DTO validation.

Use guards.

Use interceptors where useful.

Generate OpenAPI/Swagger documentation.

====================================================
FRONTEND
========

Create a clean SaaS-style UI.

Not flashy.

Professional business application.

Use:

- sidebar navigation
- top search bar
- responsive tables
- filters
- pagination
- detail pages
- create/edit forms

Pages:

- Dashboard
- Cases
- Contracts
- Notices
- Tasks
- Deadlines
- Documents
- Users
- Activity Log

====================================================
SEED DATA
=========

Create seed scripts.

Reviewer should be able to run:

docker compose up

and immediately log in.

Seed:

- Admin user
- Manager user
- Counsel users
- Viewer user

Create:

- sample cases
- sample contracts
- sample notices
- sample tasks
- sample deadlines
- sample activity logs

Provide credentials in README.

====================================================
DOCKER
======

Provide:

docker-compose.yml

Services:

- postgres
- backend
- frontend

Backend waits for database.

Database migrations run automatically.

====================================================
CODE QUALITY
============

Requirements:

- TypeScript everywhere
- Strong typing
- No TODO placeholders
- No mock implementations
- No fake APIs
- No unfinished screens
- Consistent naming
- Reusable components
- Production-style folder structure

Before generating code, first generate:

1. Full architecture plan
2. Database schema design
3. API design
4. Folder structure

Then implement the project module by module.

Do not simplify requirements.
Do not replace features with placeholders.
Use clean architecture and maintainability as primary goals.
