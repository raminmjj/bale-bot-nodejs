"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = require("../../utils/Logger");
const WebSocket = require('ws');
class ReconnectingWebSocket {
    constructor(url, protocols) {
        protocols = protocols || [];
        // These can be altered by calling code.
        this.debug = false;
        this.reconnectInterval = 1000;
        this.timeoutInterval = 2000;
        this.forcedClose = false;
        this.timedOut = false;
        this.url = url;
        this.protocols = protocols;
        this.readyState = WebSocket.CONNECTING;
        this.onopen = function (event) {
        };
        this.onclose = function (event) {
        };
        this.onconnecting = function () {
        };
        this.onmessage = function (event) {
        };
        this.onerror = function (event) {
        };
    }
    connect(reconnectAttempt) {
        this.ws = new WebSocket(this.url, this.protocols, { headers: { sorce: "nodejs" } });
        this.onconnecting();
        if (this.debug || ReconnectingWebSocket.debugAll) {
            Logger_1.Logger.debug('ReconnectingWebSocket \t attempt-connect \t' + this.url);
        }
        let This = this;
        var timeout = setTimeout(function () {
            if (This.debug || ReconnectingWebSocket.debugAll) {
                Logger_1.Logger.debug('ReconnectingWebSocket \t connection-timeout \t' + This.url);
            }
            This.timedOut = true;
            This.ws.close();
            This.timedOut = false;
        }, this.timeoutInterval);
        this.ws.onopen = function (event) {
            const interval = setInterval(function ping() {
                try {
                    if (This.ws.isAlive === false)
                        return This.ws.terminate();
                    This.ws.isAlive = false;
                    This.ws.ping('', false, true);
                }
                catch (e) {
                    This.ws = null;
                    if (This.forcedClose) {
                        This.readyState = WebSocket.CLOSED;
                        This.onclose(event);
                    }
                }
            }, 30000);
            clearTimeout(timeout);
            if (This.debug || ReconnectingWebSocket.debugAll) {
                Logger_1.Logger.debug('ReconnectingWebSocket \t onopen \t' + This.url);
            }
            This.readyState = WebSocket.OPEN;
            reconnectAttempt = false;
            if (This.onReconnectedCallback) {
                This.onReconnectedCallback();
                This.onReconnectedCallback = null;
            }
            This.onopen(event);
        };
        this.ws.on('pong', () => This.ws.isAlive = true);
        // The timeout that is set when an error has been occurred. (To check if on close is not called after the error ==> call onclose explicitely.)
        let onErrorTimeout = null;
        this.ws.onclose = function (event) {
            // ok onclose is called. no need to extra call with timeout...
            clearTimeout(onErrorTimeout);
            clearTimeout(timeout);
            This.ws = null;
            if (This.forcedClose) {
                This.readyState = WebSocket.CLOSED;
                This.onclose(event);
            }
            else {
                This.readyState = WebSocket.CONNECTING;
                // This.onconnecting();
                if (!reconnectAttempt && !This.timedOut) {
                    if (This.debug || ReconnectingWebSocket.debugAll) {
                        Logger_1.Logger.debug('ReconnectingWebSocket \t onclose \t' + This.url);
                    }
                    This.onclose(event);
                }
                setTimeout(function () {
                    This.connect(true);
                }, This.reconnectInterval);
            }
        };
        this.ws.onmessage = function (event) {
            if (This.debug || ReconnectingWebSocket.debugAll) {
                Logger_1.Logger.debug('ReconnectingWebSocket \t onmessage \t' + This.url + ' \t ' + event.data);
            }
            if (event.data)
                This.onmessage(event.data);
        };
        this.ws.onerror = function (event) {
            if (This.debug || ReconnectingWebSocket.debugAll) {
                Logger_1.Logger.debug('ReconnectingWebSocket \t onerror \t' + This.url + ' \t ' + event);
            }
            This.onerror(event);
            onErrorTimeout = setTimeout(() => {
                This.ws.onclose();
            }, 5000);
        };
        // For exception avoidance
        this.ws.on('error', (err) => {
        });
    }
    /**
     *
     * @param data
     * @returns {Promise<T>} A promise that resolves on socket flush, or rejects on any failure.
     */
    send(data) {
        return new Promise((resolve, reject) => {
            if (this.ws) {
                if (this.debug || ReconnectingWebSocket.debugAll)
                    Logger_1.Logger.debug('ReconnectingWebSocket \t send \t' + this.url + ' \t ' + data);
                try {
                    this.ws.send(data, (err) => {
                        Logger_1.Logger.trace("send callback: err: " + err);
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                }
                catch (e) {
                    reject(e);
                }
            }
            else {
                reject(new Error('INVALID_STATE_ERR : Pausing to reconnect websocket'));
            }
        });
    }
    ;
    close() {
        if (this.ws) {
            this.forcedClose = true;
            this.ws.close();
        }
    }
    ;
    /**
     * Additional public API method to refresh the connection if still open (close, re-open).
     * For example, if the app suspects bad data / missed heart beats, it can try to refresh.
     * @param callback This callback gets called when the socket is closed and connected again successfully.
     */
    refresh(callback) {
        if (this.ws) {
            this.onReconnectedCallback = callback;
            this.ws.close();
        }
    }
    ;
}
ReconnectingWebSocket.debugAll = false;
exports.ReconnectingWebSocket = ReconnectingWebSocket;
//# sourceMappingURL=ReconnectingWebSocket.js.map