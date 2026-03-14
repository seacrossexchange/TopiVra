# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of TopiVra seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Please do not create a public GitHub issue for security vulnerabilities.

### 2. Report Privately

Send an email to: **security@topivra.com**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Time

- **Initial Response**: Within 24 hours
- **Status Update**: Within 72 hours
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### 4. Disclosure Policy

- We will acknowledge your report within 24 hours
- We will provide regular updates on our progress
- We will notify you when the vulnerability is fixed
- We will credit you in our security advisories (unless you prefer to remain anonymous)

## Security Best Practices

### For Users

1. **Keep Software Updated**: Always use the latest version
2. **Strong Passwords**: Use passwords with at least 12 characters
3. **Enable 2FA**: Enable two-factor authentication for your account
4. **Secure API Keys**: Never commit API keys to version control
5. **HTTPS Only**: Always access the platform via HTTPS

### For Developers

1. **Code Review**: All code must be reviewed before merging
2. **Dependency Scanning**: Run `npm audit` regularly
3. **Environment Variables**: Never hardcode secrets
4. **Input Validation**: Validate and sanitize all user inputs
5. **SQL Injection**: Use parameterized queries (Prisma ORM)
6. **XSS Protection**: Sanitize HTML output
7. **CSRF Protection**: Use CSRF tokens for state-changing operations
8. **Rate Limiting**: Implement rate limiting on all endpoints
9. **Audit Logging**: Log all sensitive operations

## Security Features

### Authentication & Authorization

- JWT-based authentication
- Refresh token rotation
- Two-factor authentication (TOTP)
- Role-based access control (RBAC)
- Session management
- Password hashing (bcrypt)

### Data Protection

- Field-level encryption for sensitive data
- TLS/SSL encryption in transit
- Database encryption at rest
- Secure password reset flow
- API key rotation

### Application Security

- Helmet.js security headers
- CORS configuration
- Rate limiting (express-rate-limit)
- Input validation (class-validator)
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF protection

### Infrastructure Security

- Docker container isolation
- Network segmentation
- Firewall rules
- Regular security updates
- Automated backups
- Intrusion detection

### Monitoring & Logging

- Security audit logs
- Failed login attempt tracking
- Suspicious activity detection
- Real-time alerting
- Log aggregation (Loki)
- Metrics collection (Prometheus)

## Known Security Considerations

### Third-Party Dependencies

We regularly scan our dependencies for known vulnerabilities using:
- npm audit
- Snyk
- Dependabot

### Payment Security

- PCI DSS compliance considerations
- Secure payment gateway integration
- No storage of credit card data
- Payment tokenization

### Data Privacy

- GDPR compliance
- Data minimization
- Right to erasure
- Data portability
- Privacy by design

## Security Checklist for Deployment

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (64+ characters)
- [ ] Configure HTTPS with valid SSL certificate
- [ ] Enable firewall rules
- [ ] Set up automated backups
- [ ] Configure monitoring and alerting
- [ ] Review and update CORS settings
- [ ] Enable rate limiting
- [ ] Configure secure headers
- [ ] Set up audit logging
- [ ] Review user permissions
- [ ] Test disaster recovery plan

## Security Contacts

- **Security Team**: security@topivra.com
- **Bug Bounty**: Not currently available
- **PGP Key**: Available upon request

## Acknowledgments

We would like to thank the following security researchers for responsibly disclosing vulnerabilities:

- (List will be updated as vulnerabilities are reported and fixed)

## Updates

This security policy is reviewed and updated quarterly. Last update: 2026-03-14

---

**Remember**: Security is everyone's responsibility. If you see something, say something.



