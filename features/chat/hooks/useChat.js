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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useChat = void 0;
var react_1 = require("react");
var useCurrentUser_1 = require("@/features/auth/hooks/useCurrentUser");
var useConversation_1 = require("./useConversation");
var react_2 = require("convex/react");
var api_1 = require("@/convex/_generated/api");
function useChat() {
    var _this = this;
    var _a = (0, react_1.useState)(""), message = _a[0], setMessage = _a[1];
    var _b = (0, useCurrentUser_1.useCurrentUser)(), convexUser = _b.convexUser, isLoading = _b.isLoading;
    var _c = (0, useConversation_1.useConversation)(convexUser === null || convexUser === void 0 ? void 0 : convexUser._id), conversationId = _c.conversationId, isReady = _c.isReady;
    var createMessage = (0, react_2.useMutation)(api_1.api.messages.createMessage);
    var _d = (0, react_1.useState)(false), isSending = _d[0], setIsSending = _d[1];
    var processUserMessage = (0, react_2.useAction)(api_1.api.chat.processUserMessage);
    var sendMessage = function () { return __awaiter(_this, void 0, void 0, function () {
        var text, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    text = message.trim();
                    if (!text)
                        return [2 /*return*/];
                    if (!conversationId)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    setIsSending(true);
                    return [4 /*yield*/, createMessage({
                            conversationId: conversationId,
                            role: "user",
                            text: text,
                            status: "complete",
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, processUserMessage({
                            conversationId: conversationId,
                            text: text,
                        })];
                case 3:
                    _a.sent();
                    setMessage("");
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    console.error("Failed to send message:", error_1);
                    return [3 /*break*/, 6];
                case 5:
                    setIsSending(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return {
        message: message,
        setMessage: setMessage,
        sendMessage: sendMessage,
        conversationId: conversationId,
        isReady: isReady,
        isLoading: isLoading,
        isSending: isSending,
    };
}
exports.useChat = useChat;
