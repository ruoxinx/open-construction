# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenConstruction Open Science Initiative, **please do not open a public GitHub issue**.

Instead, report it by emailing the maintainers directly. You can find contact information via the contributor profiles listed in the [README](README.md) or the [contributors catalog](site/data/contributors.json).

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge your report within 5 business days and work with you on a coordinated disclosure timeline.

## Scope

OpenConstruction Open Science Initiative is a platform that indexes external resources — it does not host user data or process authentication for general users. The primary security considerations are:

- **Data integrity**: Ensuring catalog entries are accurate and not tampered with
- **Dependency vulnerabilities**: Third-party libraries used in the frontend or SDK