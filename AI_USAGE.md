# AI Usage Documentation

## 1. Tools Used

During development I evaluated multiple AI-assisted development tools.

- ChatGPT – Requirement analysis, architecture discussions, schema design, implementation planning, and code review.
- Claude Code – Attempted to use as the primary implementation agent. Due to local environment and tooling issues, I was unable to get a reliable workflow running.
- OpenAI Codex CLI – Evaluated as an alternative, but encountered similar setup limitations in my environment.
- Cursor (Free Plan) – Used for the majority of the implementation that appears in this repository.

The final implementation was produced using an AI-assisted workflow rather than manual coding alone. AI-generated code was reviewed and adjusted before being incorporated into the project.

---

# 2. Development Workflow

My workflow consisted of the following stages:

1. Read and decompose the assignment into independent modules.
2. Design the application architecture before implementation.
3. Design the database schema and shared entities.
4. Generate implementation incrementally rather than asking AI to build the entire project in one step.
5. Review generated code for correctness and consistency.
6. Adjust implementation when AI produced code that conflicted with architectural decisions.
7. Test generated functionality locally before continuing.

Instead of generating the entire application in one prompt, I implemented the project module-by-module to maintain consistency.

Implemented modules include:

- Docker environment
- Prisma setup
- Authentication
- User management
- Role-based authorization
- Case management
- Document management

Additional modules were planned but were not completed due to Cursor's free plan limitation.

---

# 3. Important Prompts

## Prompt 1

Design a production-style architecture for a Legal Management System using NestJS, Prisma, PostgreSQL, Vue 3 and Docker before generating any code.

---

## Prompt 2

Design a normalized Prisma schema that minimizes duplication by using generic entities for Documents, Tasks, Deadlines and Activity Logs linked through entity type and entity identifier.

---

## Prompt 3

Implement JWT authentication together with role-based authorization and ownership-based access control so that legal counsel and viewers only access assigned records.

---

## Prompt 4

Generate Docker configuration for PostgreSQL, backend and frontend that can be started with a single docker compose command.

---

## Prompt 5

Implement document upload using Multer with metadata stored in PostgreSQL while enforcing authorization checks before download.

---

## Prompt 6

Review the generated code for architectural inconsistencies and suggest improvements before generating additional modules.

---

# 4. AI Mistakes / Limitations

## 1. Duplication of domain models

Early generations tended to create separate implementations for Cases, Contracts and Notices instead of reusable shared entities.

I corrected this by restructuring the design around generic entities where appropriate.

---

## 2. Authorization assumptions

The AI frequently assumed that users with the same role could access all records.

The assignment required ownership-based restrictions, so authorization logic needed manual review and correction.

---

## 3. Large-context consistency

When generating multiple modules, the AI occasionally produced inconsistent naming conventions and repeated implementation patterns.

Generating the project incrementally produced more consistent results.

---

# 5. My Professional Decisions

Several architectural decisions were made intentionally instead of accepting the first AI-generated solution.

## PostgreSQL + Prisma

I selected PostgreSQL with Prisma for a strongly typed schema, clean migrations and future extensibility.

---

## Generic shared entities

Rather than creating separate document, task and deadline tables for each legal entity, I used a shared design to reduce duplication and simplify future maintenance.

---

## HTTP-based search

I chose a standard debounced HTTP search endpoint instead of WebSockets because the feature does not require real-time communication and HTTP keeps the implementation simpler.

---

## Ownership-based authorization

Beyond role-based authorization, I enforced ownership rules so that legal counsel and viewers only access records assigned to them.

---

## Incremental AI workflow

Instead of generating the complete project in one prompt, I implemented the system module-by-module and reviewed each stage before continuing. This reduced architectural drift and made it easier to verify generated code.

---

# Reflection

One challenge during development was evaluating and switching between different AI coding tools. I initially intended to use Claude Code, then evaluated Codex, but encountered environment and tooling issues that prevented a productive workflow. I ultimately completed the implementation using Cursor's AI capabilities.

This experience reinforced an important lesson: effective AI-assisted development depends not only on prompt quality but also on selecting tools that fit the development environment and continuously verifying generated code rather than accepting it without review.
