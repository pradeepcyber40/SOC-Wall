# Production Security Rules

These rules are mandatory for every coding, debugging, refactoring, and feature implementation task in this project. Every single line of code and every new session must strictly comply with these rules.

1. **Identity & Authorization Authority**: Never use `localStorage`, `sessionStorage`, or client-controlled profile objects as the authoritative source for user identity or authorization.
2. **Backend Authentication**: Authentication must be verified using the real authenticated backend/session.
3. **Server-Side Authorization**: Authorization must be enforced by the backend/database/RLS.
4. **No Client Privilege Reliance**: Never use `localStorage` user IDs, `isAdmin` flags, roles, or client-side values to authorize protected operations.
5. **No Production Mock Data**: Never use mock, fake, dummy, demo, placeholder, or hardcoded application data in production code paths.
6. **No Mock Fallbacks in Production**: Do not fall back to mock data when an API fails, returns empty results, or throws an error. Show true empty states, real error messages, or real loading/degraded states.
7. **Production Data Integrity**: Real databases, real storage, real auth providers, and real backend APIs must be connected and used.
8. **No Silent Error Swallowing**: Never swallow errors silently, hide network/database failures behind synthetic success responses, or return fake successful mutations when the backend failed.
9. **No Hardcoded Secrets**: Secrets, service role keys, API keys, tokens, passwords, and private credentials must never be committed to source code or embedded into client bundles. Use server-side environment variables (`.env`).
10. **Privileged Operations**: Privileged database mutations, admin actions, role assignments, financial transactions, and policy changes must occur strictly through secure backend endpoints or trusted server-side execution.
11. **Client Storage Boundary**: Sensitive tokens, secrets, or privileged service keys must never be stored in browser `localStorage`, `sessionStorage`, or client-accessible plain text unless expressly architected as a non-sensitive public client token (e.g. Supabase anon key with RLS).
12. **Zero Trust Input Validation**: Never trust user input, request bodies, query params, or client claims without server-side validation and sanitization.
13. **Strict Audit Logging**: All security events, authentication attempts, authorization failures, and administrative actions must be immutably recorded in audit logs.
14. **Transport & Connection Security**: All agent-to-server and client-to-server communications must use encrypted transport (TLS/HTTPS/WSS) with verified signatures and valid tokens.
