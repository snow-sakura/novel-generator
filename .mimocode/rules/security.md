# Security Rules

## Input Validation
- Validate all user input at system boundaries
- Use parameterized queries to prevent SQL injection
- Sanitize output to prevent XSS attacks
- Validate file uploads (type, size, content)

## Authentication & Authorization
- Never store passwords in plaintext
- Use strong, unique secrets for JWT/session tokens
- Implement proper session management
- Follow principle of least privilege

## Secrets Management
- Never commit API keys or secrets to version control
- Use environment variables for configuration
- Rotate secrets regularly
- Use `.env.example` to document required variables

## Data Protection
- Encrypt sensitive data at rest and in transit
- Don't log sensitive information
- Implement proper error handling (no stack traces in production)
- Use HTTPS for all API communications

## Common Vulnerabilities
- Prevent CSRF attacks with tokens
- Set appropriate CORS policies
- Implement rate limiting on sensitive endpoints
- Keep dependencies updated
