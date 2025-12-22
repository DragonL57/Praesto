# Test Suite for Praesto

This directory contains comprehensive test files for the Praesto AI chat application using Playwright.

## Test Structure

### Database Tests (`/lib/db/`)
- `document.queries.test.ts` - Tests for document database operations
- `suggestion.queries.test.ts` - Tests for suggestion database operations

### API Tests (`/api/`)
- `set-model-cookie.test.ts` - Tests for model cookie setting API
- `auth/session.test.ts` - Tests for authentication session API

### Component Tests (`/components/`)
- `theme-toggle.test.tsx` - Integration tests for theme toggle component

### Hook Tests (`/hooks/`)
- `use-mobile.test.tsx` - Integration tests for mobile detection hook

### Utility Tests (`/lib/`)
- `utils.test.ts` - Tests for utility functions

### Configuration
- `setup.ts` - Global test setup and fixtures

## Running Tests

### Prerequisites
1. Ensure the development server is running:
   ```bash
   pnpm dev
   ```

2. Ensure database is accessible for tests:
   ```bash
   pnpm db:migrate
   ```

### Running All Tests
```powershell
$env:PLAYWRIGHT='True'; pnpm exec playwright test --workers=4
```

Or, if you want to run all tests with the default script:
```powershell
pnpm test
```

### Running Specific Test Files
```bash
# Database tests
pnpm playwright test tests/lib/db/

# API tests
pnpm playwright test tests/api/

# Component tests
pnpm playwright test tests/components/

# Hook tests
pnpm playwright test tests/hooks/

# Utility tests
pnpm playwright test tests/lib/utils.test.ts
```

### Running Tests in Different Modes

#### Headed Mode (with browser UI)
```bash
pnpm playwright test --headed
```

#### Debug Mode
```bash
pnpm playwright test --debug
```

#### Specific Browser
```bash
# Chrome
pnpm playwright test --project=chromium

# Firefox
pnpm playwright test --project=firefox

# WebKit (Safari)
pnpm playwright test --project=webkit
```

#### With Coverage
```bash
pnpm playwright test --coverage
```

## Test Categories

### Database Tests
- **CRUD Operations**: Create, Read, Update, Delete operations
- **Error Handling**: Database connection errors, invalid data
- **Data Validation**: Schema compliance, required fields
- **Performance**: Query efficiency, connection pooling

### API Tests
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: 200, 400, 404, 500 responses
- **Request/Response**: JSON format, headers, cookies
- **Error Handling**: Invalid input, malformed requests
- **Authentication**: Session management, authorization

### Component Tests
- **Rendering**: Component visibility, content display
- **Interaction**: Click events, form submissions
- **Accessibility**: ARIA labels, keyboard navigation
- **Responsive Design**: Mobile, tablet, desktop layouts
- **State Management**: Props updates, state changes

### Hook Tests
- **Behavior**: Hook logic, state management
- **Side Effects**: Event listeners, cleanup
- **Performance**: Memory leaks, unnecessary re-renders
- **Responsive Behavior**: Viewport changes, breakpoints

### Utility Tests
- **Function Behavior**: Input/output, edge cases
- **Type Safety**: TypeScript type compliance
- **Error Handling**: Invalid inputs, exception cases
- **Performance**: Algorithm efficiency

## Best Practices

### Test Organization
1. **Descriptive Names**: Use clear, descriptive test names
2. **Logical Grouping**: Group related tests in `describe` blocks
3. **Setup/Teardown**: Use `beforeEach` and `afterEach` for cleanup
4. **Isolation**: Tests should not depend on each other

### Test Data
1. **Realistic Data**: Use production-like test data
2. **Edge Cases**: Test boundary conditions and error cases
3. **Privacy**: Never use real user data in tests
4. **Cleanup**: Remove test data after tests complete

### Performance
1. **Speed**: Write fast, focused tests
2. **Parallel**: Use parallel execution where possible
3. **Timeouts**: Set appropriate timeouts for operations
4. **Resources**: Clean up resources properly

## Debugging

### Test Failures
1. **Screenshots**: Playwright automatically captures screenshots on failure
2. **Videos**: Enable video recording for debugging
3. **Traces**: Use traces for detailed debugging information
4. **Console**: Check browser console for errors

### Common Issues
1. **Timing**: Use `waitForTimeout` for dynamic content
2. **Selectors**: Use reliable, stable selectors
3. **State**: Ensure proper test state isolation
4. **Network**: Mock external dependencies when needed

## Coverage

### Current Coverage
- ✅ Database operations (documents, suggestions)
- ✅ API endpoints (auth, cookies)
- ✅ Core utilities (UUID, class merging, etc.)
- ✅ Component integration (theme toggle)
- ✅ Hook behavior (mobile detection)

### Areas for Expansion
- 🔄 Chat functionality and message handling
- 🔄 File upload and attachment processing
- 🔄 User authentication flows
- 🔄 Admin panel functionality
- 🔄 Search and filtering features
- 🔄 Real-time features (WebSockets)
- 🔄 Performance monitoring
- 🔄 Security testing
- 🔄 Cross-browser compatibility

## Contributing

When adding new tests:

1. **Follow Patterns**: Use existing test patterns and conventions
2. **Add Documentation**: Document complex test scenarios
3. **Update README**: Add new test categories to this README
4. **Review**: Ensure tests provide meaningful coverage
5. **CI/CD**: Verify tests pass in CI environment

## Environment Variables

Create a `.env.test.local` file for test-specific environment variables:

```env
POSTGRES_URL=postgresql://test:test@localhost:5432/testdb
NEXTAUTH_URL=http://localhost:3000
PLAYWRIGHT=True
```

## Troubleshooting

### Common Solutions

**Tests time out:**
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify database connectivity

**Database errors:**
- Run migrations: `pnpm db:migrate`
- Check database connection string
- Ensure test database exists

**Component not found:**
- Verify import paths are correct
- Check if component is exported
- Ensure build process completed

**API 404 errors:**
- Verify API route exists
- Check route file naming convention
- Ensure dev server is running

For more detailed troubleshooting, check the Playwright documentation and test output logs.
