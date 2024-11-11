"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidObjectId = isValidObjectId;
const mongodb_1 = require("mongodb");
function isValidObjectId(id) {
    return mongodb_1.ObjectId.isValid(id) && new mongodb_1.ObjectId(id).toString() === id;
}
