export interface TestCase {
  code: string;
  evalExpect?: unknown;
  safeExpect?: unknown;
  category: string;
  ignoreTime?: boolean;
}
