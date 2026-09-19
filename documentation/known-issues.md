# SmartCare v0.1 Known Issues

## Release-blocking issues

1. **No production deployment or hosting decision.** The system is documented as local development only.
2. **Operational security is incomplete.** MFA, recovery, verification, session revocation, audit logs, shared rate limiting, monitoring, and incident controls are absent.
3. **Clinical file handling is absent.** Reports, uploads, protected downloads, malware scanning, retention, and S3-compatible storage are not implemented.
4. **Release reproducibility is not frozen.** Backend/schema/migration changes are uncommitted on the branch baseline.

## Functional issues

- Receptionist registration is incomplete; booking existing patients is supported.
- Department and doctor edit/archive behavior is present in current working changes but requires full regression verification.
- Queue updates use polling only; there are no patient notifications.
- Prescription output is browser print/save, not a dedicated server-generated PDF.
- Advanced analytics are not implemented.

## Quality and verification gaps

- No frontend automated test suite was found.
- No automated accessibility suite was found.
- No load/stress test suite was found.
- Existing verification evidence is a checkpoint and must be rerun after current working-tree changes.
- Production backup/restore has not been tested.

## Environment and deployment risks

- The API binds to `127.0.0.1` by default, which is appropriate for local development but requires deliberate production proxy/network configuration.
- Local PostgreSQL trust authentication is for synthetic local data only.
- The throttler is process-local; multi-instance deployments need shared rate-limit storage and a trusted proxy strategy.
- Environment secrets must never be copied from `.local` or committed `.env` files.

## Pilot handling

Use synthetic data only until the release blockers are resolved. Do not claim compliance certification or real clinical readiness. Track each issue to an owner and acceptance test before opening the pilot to external users.