# Integration Tests

This directory contains integration tests that verify end-to-end functionality with real external services.

## Firebase REST API Integration Tests

Tests the `firebase-restapi.ts` search options functionality against real Firestore.

### Prerequisites

1. **Environment Variables**: Ensure these are set in your `.dev.vars` file:

   ```bash
   FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"your-project.firebaseapp.com",...}
   FIREBASE_PROJECT_ID=your-project-id
   ```

2. **Firebase Project**: Must have Firestore enabled and proper security rules configured.

### Running Integration Tests

```bash
# Run only integration tests
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run only unit tests (excludes integration tests)
npm test
```

### Test Structure

- **Test Data**: Creates a temporary collection `test-books-integration` with sample book data
- **Setup/Teardown**: Automatically creates and cleans up test data
- **Isolation**: Each test resets data to known state
- **Timeout**: 30 seconds for setup/teardown operations

### Test Coverage

The integration tests verify:

1. **Basic Search Options**:

   - Simple where clauses (string, number, boolean equality)
   - Numeric comparisons (>, <, >=, <=)
   - Array operations (array-contains, array-contains-any, in, not-in)

2. **Advanced Search Options**:

   - Composite filters (AND/OR combinations)
   - Unary filters (IS_NULL, IS_NOT_NULL)
   - Ordering (asc/desc)
   - Pagination (limit, offset)
   - Field selection (select)

3. **Complex Queries**:

   - Multiple search options combined
   - Complex filtering logic
   - Performance optimizations

4. **Error Handling**:
   - Invalid field names
   - Invalid operators
   - Empty collections

### Test Data

The tests use a diverse set of book data with various field types:

- Strings: title, author, genre, isbn
- Numbers: year, price, rating, pages
- Booleans: available
- Arrays: tags
- Mixed data for comprehensive testing

### Notes

- Integration tests are slower than unit tests due to real API calls
- Tests require internet connection and Firebase project access
- Test data is isolated and cleaned up automatically
- These tests complement the unit tests for `buildQueryParameters()`

### Troubleshooting

If tests fail:

1. **Environment Variables**: Verify `FIREBASE_CONFIG` and `FIREBASE_PROJECT_ID` are set correctly
2. **Firebase Rules**: Ensure Firestore security rules allow read/write operations
3. **Network**: Check internet connection and Firebase project accessibility
4. **Timeouts**: Increase timeout if tests are slow due to network latency
