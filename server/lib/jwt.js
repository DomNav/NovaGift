"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signClaimToken = signClaimToken;
exports.verifyClaimToken = verifyClaimToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
function signClaimToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: "7d"
    });
}
function verifyClaimToken(token) {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    return decoded;
}
exports.default = {
    signClaimToken,
    verifyClaimToken
};
