# Git Workflow Rules

## Commit Messages
- Use conventional commits format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep subject line under 50 characters
- Use imperative mood ("add feature" not "added feature")

## Branch Strategy
- `main` branch is always deployable
- Create feature branches from main
- Use descriptive branch names: `feature/add-auth`, `fix/login-error`
- Delete branches after merging

## Pull Requests
- Keep PRs focused on a single change
- Write clear PR descriptions
- Review your own PR before requesting reviews
- Ensure tests pass before merging

## Best Practices
- Commit early and often
- Never commit directly to main
- Use `git stash` for work-in-progress changes
- Tag releases with semantic versioning
