"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUrlSchema = exports.urlSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.urlSchema = joi_1.default.object({
    url: joi_1.default.string().uri().required(),
    priority: joi_1.default.string().valid('low', 'medium', 'high').default('medium'),
});
exports.bulkUrlSchema = joi_1.default.object({
    urls: joi_1.default.array().items(joi_1.default.string().uri()).min(1).max(100).required(),
    priority: joi_1.default.string().valid('low', 'medium', 'high').default('medium'),
});
//# sourceMappingURL=validators.js.map