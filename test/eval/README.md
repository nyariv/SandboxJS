# Test Files Organization

This directory contains organized test files for the SandboxJS evaluation engine.

## Structure

- **testCases/** - Directory containing all test-related files:
  - `*.spec.ts` - Category-specific test spec files (Jest tests)
  - `*.data.ts` - Test data arrays (exported and imported by spec files)
  - `index.ts` - Central export that re-exports all test data
  - `types.ts` - TypeScript interface definitions for test cases
  - `test-utils.ts` - Reusable `run()` and `getState()` functions
- **export-tests.ts** - Script to consolidate all tests into tests.json
- **tests.json** - All tests exported to a single JSON file

## Test Categories

Tests are organized into the following categories:
- Data Types
- Security
- Arithmetic Operators
- Assignment Operators
- Bitwise Operators
- Comments
- Comparison Operators
- Complex Expressions
- Conditionals
- Error Handling
- Functions
- Logical Operators
- Loops
- Objects & Arrays
- Operator Precedence
- Other Operators
- Switch
- Template Literals

## Exporting Tests to JSON

To regenerate the `tests.json` file from the individual test files:

```bash
cd test/eval
npx tsx export-tests.ts
```

This script:
1. Imports all test arrays from `testCases/index.ts`
2. Consolidates them into a single array
4. Orders the tests with:
3. Orders the tests with:
   - **Data Types** tests first
   - **Security** tests second
   - All other categories in the order they appear
4. Preserves the original order of tests within each category
5
### Output

The script will display:
- Number of tests extracted from each file
- Total test count
- Tests per category distribution

Example output:
```
Extracted 36 tests from data-types.spec.ts
Extracted 39 tests from security.spec.ts
...
Total tests: 340
Exported to: /Users/nyariv/workspace/SandboxJS/test/eval/tests.json
```

## Running Tests

Run all tests:
```bash
npm test
```

Run specific category tests:
```bash
npm test -- test/eval/testCases/data-types.spec.ts
npm test -- test/eval/testCases/security.spec.ts
```
