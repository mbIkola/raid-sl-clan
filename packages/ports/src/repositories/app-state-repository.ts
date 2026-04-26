export interface AppStateRepository {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}
