import { DynamoItem, DynamoKey, DynamoReturn } from '../types';
export declare function putItem(tableName: string, item: DynamoItem, options?: {
    conditionExpression?: string;
}): Promise<DynamoReturn<DynamoItem>>;
export declare function getItem(tableName: string, key: DynamoKey, options?: {
    consistentRead?: boolean;
}): Promise<DynamoReturn<DynamoItem>>;
export declare function updateItem(tableName: string, key: DynamoKey, updateExpression: string, expressionAttributeValues: Record<string, any>, options?: {
    conditionExpression?: string;
    returnValues?: "NONE" | "ALL_OLD" | "UPDATED_OLD" | "ALL_NEW" | "UPDATED_NEW";
    expressionAttributeNames?: Record<string, string>;
}): Promise<DynamoReturn<DynamoItem>>;
export declare function deleteItem(tableName: string, key: DynamoKey, options?: {
    conditionExpression?: string;
    returnValues?: "NONE" | "ALL_OLD";
}): Promise<DynamoReturn<DynamoItem>>;
