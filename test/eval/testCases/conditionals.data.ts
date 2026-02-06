'use strict';
import { TestCase } from './types.js';

export const tests: TestCase[] = [
  {
    "code": "test[test2] ? true : false ? 'not ok' : 'ok'",
    "evalExpect": "ok",
    "safeExpect": "ok",
    "category": "Conditionals"
  },
  {
    "code": "let ok = true; false ? ok = false : ok; return ok",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Conditionals"
  },
  {
    "code": "if (true) { return true; } else return false",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Conditionals"
  },
  {
    "code": "let a = false; if (a) { return false; } else return true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Conditionals"
  },
  {
    "code": "let a = null; if (a?.a) { return false; } else return true",
    "evalExpect": true,
    "safeExpect": true,
    "category": "Conditionals"
  },
  {
    "code": "if (false) return true; else if (false) {return true} else return false",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Conditionals"
  },
  {
    "code": "if (false) { return true; } else return false",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Conditionals"
  },
  {
    "code": "if (false) return true; return false",
    "evalExpect": false,
    "safeExpect": false,
    "category": "Conditionals"
  },
  {
    "code": "if (true) {\n  if (false)\n    if (true)\n      if (false)\n        return 1\n      else if (true)\n        return 2\n      else\n        return 3\n    else\n      return 4\n  else if (true)\n    if (false)\n      return 5\n    else if (true)\n      return 6\n    else\n      return 7\n  else\n    return 8\n} else if (true)\n  return 9;",
    "evalExpect": 6,
    "safeExpect": 6,
    "category": "Conditionals"
  }
];
