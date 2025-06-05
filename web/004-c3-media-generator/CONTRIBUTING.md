# 🤝 Contributing to AI Card Generator

We love your input! We want to make contributing to AI Card Generator as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Development Process

We use GitHub to sync code, track issues and feature requests, as well as accept pull requests.

### Pull Requests Welcome

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm 8+
- Git

### Local Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/ai-card-generator.git
cd ai-card-generator

# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Project Structure

```
src/
├── components/        # React components
├── stores/           # Zustand state stores
├── lib/              # Utility functions and API clients
├── types/            # TypeScript type definitions
└── ...
```

## 🐛 Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/your-org/ai-card-generator/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- Browser: [e.g. Chrome 91]
- OS: [e.g. Windows 10]
- Version: [e.g. 1.0.0]

## Additional Context
Add any other context about the problem here.
```

## 💡 Feature Requests

We love feature requests! Please provide:

- **Use case**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: What other approaches did you consider?
- **Additional context**: Any other relevant information

### Feature Request Template

```markdown
## Feature Summary
A clear and concise description of the feature you'd like to see.

## Problem Statement
What problem does this feature solve? Why is it needed?

## Proposed Solution
Describe the solution you'd like to see implemented.

## Alternatives Considered
Describe any alternative solutions or features you've considered.

## Additional Context
Add any other context, mockups, or examples about the feature request.
```

## 🏗️ Code Contribution Guidelines

### Code Style

We use ESLint and Prettier to maintain code quality. Your code should:

- Follow the existing code style
- Include TypeScript types for all new code
- Have meaningful variable and function names
- Include JSDoc comments for complex functions
- Be properly formatted (run `npm run lint` to check)

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
```
feat(generation): add video workflow support
fix(template): resolve variable replacement bug
docs(readme): update installation instructions
refactor(stores): simplify state management logic
```

### Testing

- Write tests for new features
- Ensure existing tests pass
- Test in multiple browsers if making UI changes
- Test with different CSV formats for data processing changes

### Code Review Process

1. All code changes must be reviewed before merging
2. Reviews focus on:
   - Code quality and style
   - Performance implications
   - Security considerations
   - User experience impact
   - Documentation completeness

## 🎯 Contribution Areas

### High Priority

- **Bug fixes** - Always welcome!
- **Documentation improvements** - Help others understand the code
- **Performance optimizations** - Make the app faster
- **Accessibility improvements** - Make the app more inclusive
- **Test coverage** - Help ensure code quality

### Feature Development

Before starting work on a new feature:

1. Check existing issues and PRs
2. Open an issue to discuss the feature
3. Wait for maintainer feedback
4. Start development once approved

### Areas Needing Help

- [ ] **Comprehensive test suite** - Unit and integration tests
- [ ] **Accessibility audit** - WCAG compliance improvements
- [ ] **Performance profiling** - Identify and fix bottlenecks
- [ ] **Mobile optimization** - Better mobile experience
- [ ] **Documentation** - User guides and API docs
- [ ] **Internationalization** - Multi-language support

## 🔒 Security

If you discover a security vulnerability, please send an email to security@ai-card-generator.com instead of opening a public issue.

## 📄 License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Recognition

Contributors are recognized in:

- README.md acknowledgments
- Release notes for significant contributions
- GitHub contributor stats

## 💬 Community

- **GitHub Discussions** - For general questions and ideas
- **GitHub Issues** - For bugs and feature requests
- **Discord** - For real-time community discussion

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)

## ❓ Questions?

Don't hesitate to ask! You can:

- Open a GitHub Discussion
- Comment on existing issues
- Join our Discord community
- Email us at contributors@ai-card-generator.com

---

**Thank you for contributing to AI Card Generator!** 🎮✨ 