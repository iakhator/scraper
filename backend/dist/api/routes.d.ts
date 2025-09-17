import { QueueService } from '../services/queue';
import { DatabaseService } from '../services/database';
import { Server as SocketIOServer } from 'socket.io';
export declare function createApiRoutes(queueService: QueueService, databaseService: DatabaseService, io: SocketIOServer): import("express-serve-static-core").Router;
