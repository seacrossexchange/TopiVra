# Contributing to TopiVra

Thank you for your interest in contributing to TopiVra! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop
- Git
- Code editor (VS Code recommended)

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/topivra.git
cd topivra

# Add upstream remote
git remote add upstream https://github.com/topivra/topivra.git
```

### Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install

# E2E
cd ../e2e
npm install
```

### Start Development Environment

```bash
# Windows
scripts\deploy\START-DEV-WINDOWS.bat

# Linux/Mac
docker-compose -f config/docker-compose.yml up -d
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-number-description
```

### Branch Naming Convention

- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Urgent production fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

### 2. Make Changes

- Write clean, readable code
- Follow the coding standards
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Run tests
npm run test

# Run E2E tests
cd e2e
npx playwright test
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

Go to GitHub and create a pull request from your fork to the main repository.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` type
- Use interfaces for object shapes
- Use enums for constants

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: UserRole;
}

enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

// ❌ Bad
const user: any = { ... };
```

### Naming Conventions

- **Classes**: PascalCase (`UserService`)
- **Interfaces**: PascalCase with `I` prefix (`IUser`)
- **Functions**: camelCase (`getUserById`)
- **Variables**: camelCase (`userName`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Files**: kebab-case (`user-service.ts`)

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons
- Max line length: 100 characters
- Use trailing commas

```typescript
// ✅ Good
const user = {
  name: 'John',
  email: 'john@example.com',
};

// ❌ Bad
const user = {
  name: "John",
  email: "john@example.com"
}
```

### Comments

- Write self-documenting code
- Add comments for complex logic
- Use JSDoc for public APIs

```typescript
/**
 * Calculates the total price including tax
 * @param price - Base price
 * @param taxRate - Tax rate (0-1)
 * @returns Total price with tax
 */
function calculateTotal(price: number, taxRate: number): number {
  return price * (1 + taxRate);
}
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or updates
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements

### Examples

```bash
feat(auth): add two-factor authentication

Implement TOTP-based 2FA for enhanced security.
Users can enable 2FA in their account settings.

Closes #123

---

fix(payment): handle stripe webhook timeout

Add retry logic for failed webhook processing.
Increase timeout from 5s to 30s.

Fixes #456

---

docs(api): update authentication endpoints

Add examples for JWT token refresh flow.
```

### Rules

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- First line should be 50 characters or less
- Reference issues and pull requests

## Pull Request Process

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] No linter errors
- [ ] Branch is up to date with main

### PR Title

Follow the same format as commit messages:

```
feat(auth): add two-factor authentication
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe the tests you ran

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] Added tests
- [ ] All tests passing
- [ ] No linter errors

## Screenshots (if applicable)

## Related Issues
Closes #123
```

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts
4. Up to date with main branch

### After Merge

- Delete your branch
- Update your local repository

```bash
git checkout main
git pull upstream main
git push origin main
```

## Testing

### Unit Tests

```bash
# Server
cd server
npm run test

# Client
cd client
npm run test
```

### E2E Tests

```bash
cd e2e
npx playwright test
```

### Test Coverage

Aim for at least 80% code coverage for new features.

```bash
npm run test:cov
```

### Writing Tests

```typescript
describe('UserService', () => {
  it('should create a new user', async () => {
    const user = await userService.create({
      email: 'test@example.com',
      password: 'password123',
    });
    
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Explain non-obvious code

### README Updates

Update README.md if you:
- Add new features
- Change installation steps
- Modify configuration

### API Documentation

Update `docs/API.md` for:
- New endpoints
- Changed request/response formats
- New authentication methods

## Questions?

- Open an issue for questions
- Join our Discord community
- Email: dev@topivra.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to TopiVra! 🎉



