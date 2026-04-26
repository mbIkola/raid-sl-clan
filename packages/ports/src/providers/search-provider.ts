export interface SearchProvider<TResult = unknown> {
  search(query: string): Promise<TResult[]>;
}
