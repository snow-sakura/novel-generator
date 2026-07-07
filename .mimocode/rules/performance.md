# Performance Rules

## Database
- Use indexes for frequently queried columns
- Avoid N+1 queries - use eager loading
- Implement pagination for list endpoints
- Use connection pooling

## Caching
- Cache expensive computations
- Use appropriate cache expiration
- Implement cache invalidation strategies
- Cache API responses when appropriate

## Frontend
- Lazy load non-critical components
- Optimize images (WebP format, proper sizing)
- Minimize bundle size
- Use React.memo for expensive components

## Backend
- Use async/await for I/O operations
- Implement proper error handling
- Use streaming for large responses
- Set appropriate timeouts

## Monitoring
- Log performance metrics
- Monitor memory usage
- Track API response times
- Set up alerts for anomalies
