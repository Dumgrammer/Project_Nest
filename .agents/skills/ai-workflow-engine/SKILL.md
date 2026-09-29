ai-workflow-engine
Guide and build an AI-powered workflow and automation engine using NestJS. Use when the user asks to build, design, or implement Task 4, an AI workflow engine, agent orchestration, GraphQL Federation, Server-Sent Events (SSE) streaming, or Zapier/Make-like automation backends in NestJS.

Instructions
AI-Powered Workflow & Automation Engine (Task 4)
Guide the implementation of an advanced, event-driven workflow and automation backend using NestJS, styled after automation platforms like Zapier or Make.

When to Use
Designing or implementing an AI workflow/automation platform.
Creating dynamically orchestrating AI agents or third-party webhooks in NestJS.
Setting up GraphQL Federation or Server-Sent Events (SSE) for streaming AI steps.
Referenced specifically as "Task 4".
Core Capabilities & Steps
1. GraphQL Federation API Gateway (@nestjs/graphql)
Set up @nestjs/graphql with Apollo Federation to combine disparate services (Workflow Core, Agent Runner, Integration Engine) into a single schema.
Expose GraphQL queries and mutations to manage workflow definitions, node configurations, and execution triggers.
2. Server-Sent Events (SSE) for Real-Time Execution Logs
Implement @Sse() controller endpoints using RxJS Observable or Subject.
Stream real-time node execution updates, step statuses, and raw AI token outputs back to the client.
3. Dynamic Node Plugin Discovery
Leverage NestJS Reflector and @SetMetadata() custom decorators to build a modular node architecture.
Dynamically register and execute custom action nodes (e.g., LLM prompts, HTTP webhooks, database queries) at runtime based on JSON pipeline configurations.
4. Background Job & Queue Handling
Use BullMQ (@nestjs/bullmq) with Redis for retry mechanisms, rate limiting, and reliable execution of long-running workflow nodes.
Best Practices & Gotchas
Streaming Handlers: Ensure SSE connection drops clean up RxJS subscriptions to avoid memory leaks.
Error Propagation: Encapsulate node execution errors so single-step failures in a workflow trigger configured fallbacks without crashing the queue worker.
Security: Sanitize dynamic execution payloads and use custom guards (@UseGuards()) for authenticating client webhook triggers.