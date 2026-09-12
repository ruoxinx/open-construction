# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenConstruction Open Science Initiative, **please do not open a public GitHub issue**.

Instead, report it by emailing **support@openconstruction.org**.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact

We will acknowledge your report within 5 business days and work with you on a coordinated disclosure timeline.

## Scope

OpenConstruction Open Science Initiative indexes external resources and may use Supabase Auth for optional user accounts, saved resources, contribution summaries, and badge views. OpenConstruction does not manage passwords; sign-in is delegated to OAuth providers such as GitHub and Google.

The primary security considerations are:

- **Data integrity**: Ensuring catalog entries are accurate and not tampered with
- **Dependency vulnerabilities**: Third-party libraries used in the frontend or SDK
- **Authentication and authorization**: Supabase Row Level Security must protect user-owned profile and bookmark rows
- **Secrets handling**: Supabase service-role keys and GitHub tokens must remain in provider dashboards or GitHub Actions secrets, never in repository files

## Deployment security headers

The static pages include a source-level Content Security Policy and Permissions Policy. GitHub Pages does not let this repository set arbitrary HTTP response headers, so the production host must also enforce these response headers at the CDN, reverse proxy, or custom hosting layer:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'
X-Frame-Options: DENY
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()
```

Use `Strict-Transport-Security` only after HTTPS is working on every subdomain. The CI security-source check verifies that every HTML page retains its source policies and that GitHub Actions references remain pinned to full commit SHAs.
