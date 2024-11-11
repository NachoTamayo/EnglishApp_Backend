"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizeWord = capitalizeWord;
function capitalizeWord(word) {
    if (!word)
        return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
