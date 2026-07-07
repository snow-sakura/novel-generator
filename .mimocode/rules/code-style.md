# Code Style Rules

## Python (Backend)
- Use type hints for all function parameters and return values
- Follow PEP 8 style guide
- Use async/await for I/O-bound operations
- Keep functions under 50 lines when possible
- Use dataclasses or Pydantic models for structured data

## JavaScript/JSX (Frontend)
- Use functional components with hooks
- Destructure props in function parameters
- Use const for variables that don't change
- Prefer optional chaining (?.) over null checks
- Keep components under 200 lines when possible

## General
- Write self-documenting code with clear variable names
- Avoid magic numbers - use named constants
- Handle errors explicitly at system boundaries
- Prefer composition over inheritance
- Don't repeat yourself (DRY principle)
