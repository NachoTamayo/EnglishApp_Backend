"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWord = verifyWord;
function verifyWord(word) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = yield result.json();
            if (data[0] && data[0].word) {
                return data[0];
            }
            else {
                return false;
            }
        }
        catch (error) {
            console.error("Error al verificar la palabra:", error);
            return false;
        }
    });
}
