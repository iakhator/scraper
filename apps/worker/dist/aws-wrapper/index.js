"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqs = exports.dynamodb = exports.sqsClient = exports.dynamoClient = exports.config = void 0;
var config_1 = require("./config");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return config_1.config; } });
Object.defineProperty(exports, "dynamoClient", { enumerable: true, get: function () { return config_1.dynamoClient; } });
Object.defineProperty(exports, "sqsClient", { enumerable: true, get: function () { return config_1.sqsClient; } });
var index_1 = require("./clients/index");
Object.defineProperty(exports, "dynamodb", { enumerable: true, get: function () { return index_1.dynamodb; } });
Object.defineProperty(exports, "sqs", { enumerable: true, get: function () { return index_1.sqs; } });
//# sourceMappingURL=index.js.map