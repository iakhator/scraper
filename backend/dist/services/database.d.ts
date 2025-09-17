import { DynamoItem, DynamoKey, DynamoReturn } from "../types";
export declare class DatabaseService {
    private tableName;
    constructor();
    putItem(item: DynamoItem): Promise<DynamoReturn<DynamoItem>>;
    getItem(key: DynamoKey): Promise<DynamoReturn<DynamoItem>>;
    updateItem(key: DynamoKey, updates: Record<string, any>): Promise<DynamoReturn<DynamoItem>>;
    queryItems(partitionKey: string, sortKeyPrefix?: string): Promise<DynamoReturn<DynamoItem[]>>;
}
