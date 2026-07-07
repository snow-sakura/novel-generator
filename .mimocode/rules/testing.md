# Testing Rules

## Test Structure
- Follow Arrange-Act-Assert pattern
- One assertion per test when possible
- Use descriptive test names that explain behavior
- Group related tests in describe/context blocks

## Test Coverage
- Write tests for critical business logic
- Test edge cases and error conditions
- Mock external dependencies
- Test both success and failure paths

## Test Types
- Unit tests: Test individual functions/methods
- Integration tests: Test component interactions
- E2E tests: Test complete user workflows

## Best Practices
- Keep tests independent and isolated
- Use factories or fixtures for test data
- Clean up after tests (database, files, etc.)
- Run tests before commits
- Fix failing tests immediately
