"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
async function hashPassword(password) {
    const hash = await bcrypt_1.default.hash(password, 10);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
}
hashPassword('student123');
hashPassword('prof123');
//# sourceMappingURL=hash-password.js.map