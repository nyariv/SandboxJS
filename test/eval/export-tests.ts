#!/usr/bin/env tsx
'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TestCase } from './testCases/types.js';
import * as allTestModules from './testCases/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Collect all tests from imported modules
async function extractTests() {
  const allTests: TestCase[] = [];
  
  // Get all test arrays from the imported modules
  for (const [moduleName, tests] of Object.entries(allTestModules)) {
    if (Array.isArray(tests)) {
      allTests.push(...tests);
      console.log(`Extracted ${tests.length} tests from ${moduleName}`);
    }
  }
  
  // Group tests by category, preserving order within each category
  const testsByCategory: Record<string, TestCase[]> = {};
  const categoryOrder: string[] = [];

  allTests.forEach(test => {
    const category = test.category;
    if (!testsByCategory[category]) {
      testsByCategory[category] = [];
      categoryOrder.push(category);
    }
    testsByCategory[category].push(test);
  });

  // Build final array: Data Types first, Security second, rest in original order
  const sortedTests: TestCase[] = [];

  // Add Data Types first
  if (testsByCategory['Data Types']) {
    sortedTests.push(...testsByCategory['Data Types']);
  }

  // Add Security second
  if (testsByCategory['Security']) {
    sortedTests.push(...testsByCategory['Security']);
  }

  // Add all other categories in the order they appeared
  categoryOrder.forEach(category => {
    if (category !== 'Data Types' && category !== 'Security') {
      sortedTests.push(...testsByCategory[category]);
    }
  });

  // Write to tests.json
  const outputPath = path.join(__dirname, 'tests.json');
  const jsonContent = JSON.stringify(sortedTests, null, 2);
  // Ensure consistent LF line endings
  const normalizedContent = jsonContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  fs.writeFileSync(outputPath, normalizedContent + '\n', 'utf8');

  console.log(`\nTotal tests: ${sortedTests.length}`);
  console.log(`Exported to: ${outputPath}`);

  // Show category distribution
  const categories: Record<string, number> = {};
  sortedTests.forEach(test => {
    categories[test.category] = (categories[test.category] || 0) + 1;
  });

  console.log('\nTests per category:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

extractTests().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
