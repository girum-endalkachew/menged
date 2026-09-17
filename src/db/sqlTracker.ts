import { Logger } from "drizzle-orm/logger";
import { AsyncLocalStorage } from "node:async_hooks";

export class SqlTrackerContext {
  queryCount = 0;
  statements: string[] = [];
}

const asyncLocalStorage = new AsyncLocalStorage<SqlTrackerContext>();
let globalQueryCount = 0;

export class SqlQueryTracker implements Logger {
  logQuery(query: string, _params: unknown[]): void {
    globalQueryCount++;
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.queryCount++;
      store.statements.push(query);
    }
  }
}

export const sqlQueryTracker = new SqlQueryTracker();

export class SqlTracker {
  /**
   * Run an asynchronous function within an isolated SQL tracking context
   */
  static async run<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; queryCount: number; statements: string[] }> {
    const context = new SqlTrackerContext();
    const result = await asyncLocalStorage.run(context, fn);
    return {
      result,
      queryCount: context.queryCount,
      statements: context.statements,
    };
  }

  /**
   * Get query count for current request context (or global count if no context active)
   */
  static getQueryCount(): number {
    const store = asyncLocalStorage.getStore();
    return store ? store.queryCount : globalQueryCount;
  }

  /**
   * Get captured statements for current request context
   */
  static getStatements(): string[] {
    const store = asyncLocalStorage.getStore();
    return store ? [...store.statements] : [];
  }

  /**
   * Check if an isolated SQL tracking context is active
   */
  static hasStore(): boolean {
    return asyncLocalStorage.getStore() !== undefined;
  }

  /**
   * Reset global query counter
   */
  static resetGlobal(): void {
    globalQueryCount = 0;
  }
}
