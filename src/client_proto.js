/*eslint-disable*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const centrifugal = $root.centrifugal = (() => {

    /**
     * Namespace centrifugal.
     * @exports centrifugal
     * @namespace
     */
    const centrifugal = {};

    centrifugal.centrifuge = (function() {

        /**
         * Namespace centrifuge.
         * @memberof centrifugal
         * @namespace
         */
        const centrifuge = {};

        centrifuge.protocol = (function() {

            /**
             * Namespace protocol.
             * @memberof centrifugal.centrifuge
             * @namespace
             */
            const protocol = {};

            protocol.Error = (function() {

                /**
                 * Properties of an Error.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IError
                 * @property {number|null} [code] Error code
                 * @property {string|null} [message] Error message
                 * @property {boolean|null} [temporary] Error temporary
                 */

                /**
                 * Constructs a new Error.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents an Error.
                 * @implements IError
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IError=} [properties] Properties to set
                 */
                function Error(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Error code.
                 * @member {number} code
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @instance
                 */
                Error.prototype.code = 0;

                /**
                 * Error message.
                 * @member {string} message
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @instance
                 */
                Error.prototype.message = "";

                /**
                 * Error temporary.
                 * @member {boolean} temporary
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @instance
                 */
                Error.prototype.temporary = false;

                /**
                 * Encodes the specified Error message. Does not implicitly {@link centrifugal.centrifuge.protocol.Error.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IError} message Error message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Error.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.code);
                    if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
                    if (message.temporary != null && Object.hasOwnProperty.call(message, "temporary"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.temporary);
                    return writer;
                };

                /**
                 * Encodes the specified Error message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Error.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IError} message Error message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Error.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an Error message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Error} Error
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Error.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Error();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.code = reader.uint32();
                                break;
                            }
                        case 2: {
                                message.message = reader.string();
                                break;
                            }
                        case 3: {
                                message.temporary = reader.bool();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an Error message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Error} Error
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Error.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an Error message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Error.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.code != null && message.hasOwnProperty("code"))
                        if (!$util.isInteger(message.code))
                            return "code: integer expected";
                    if (message.message != null && message.hasOwnProperty("message"))
                        if (!$util.isString(message.message))
                            return "message: string expected";
                    if (message.temporary != null && message.hasOwnProperty("temporary"))
                        if (typeof message.temporary !== "boolean")
                            return "temporary: boolean expected";
                    return null;
                };

                /**
                 * Gets the default type url for Error
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Error
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Error.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Error";
                };

                return Error;
            })();

            protocol.EmulationRequest = (function() {

                /**
                 * Properties of an EmulationRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IEmulationRequest
                 * @property {string|null} [node] EmulationRequest node
                 * @property {string|null} [session] EmulationRequest session
                 * @property {Uint8Array|null} [data] EmulationRequest data
                 */

                /**
                 * Constructs a new EmulationRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents an EmulationRequest.
                 * @implements IEmulationRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IEmulationRequest=} [properties] Properties to set
                 */
                function EmulationRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * EmulationRequest node.
                 * @member {string} node
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @instance
                 */
                EmulationRequest.prototype.node = "";

                /**
                 * EmulationRequest session.
                 * @member {string} session
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @instance
                 */
                EmulationRequest.prototype.session = "";

                /**
                 * EmulationRequest data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @instance
                 */
                EmulationRequest.prototype.data = $util.newBuffer([]);

                /**
                 * Encodes the specified EmulationRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.EmulationRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IEmulationRequest} message EmulationRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                EmulationRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.node != null && Object.hasOwnProperty.call(message, "node"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.node);
                    if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.session);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified EmulationRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.EmulationRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IEmulationRequest} message EmulationRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                EmulationRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an EmulationRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.EmulationRequest} EmulationRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                EmulationRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.EmulationRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.node = reader.string();
                                break;
                            }
                        case 2: {
                                message.session = reader.string();
                                break;
                            }
                        case 3: {
                                message.data = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an EmulationRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.EmulationRequest} EmulationRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                EmulationRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an EmulationRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                EmulationRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.node != null && message.hasOwnProperty("node"))
                        if (!$util.isString(message.node))
                            return "node: string expected";
                    if (message.session != null && message.hasOwnProperty("session"))
                        if (!$util.isString(message.session))
                            return "session: string expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for EmulationRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.EmulationRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                EmulationRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.EmulationRequest";
                };

                return EmulationRequest;
            })();

            protocol.Command = (function() {

                /**
                 * Properties of a Command.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ICommand
                 * @property {number|null} [id] Command id
                 * @property {centrifugal.centrifuge.protocol.IConnectRequest|null} [connect] Command connect
                 * @property {centrifugal.centrifuge.protocol.ISubscribeRequest|null} [subscribe] Command subscribe
                 * @property {centrifugal.centrifuge.protocol.IUnsubscribeRequest|null} [unsubscribe] Command unsubscribe
                 * @property {centrifugal.centrifuge.protocol.IPublishRequest|null} [publish] Command publish
                 * @property {centrifugal.centrifuge.protocol.IPresenceRequest|null} [presence] Command presence
                 * @property {centrifugal.centrifuge.protocol.IPresenceStatsRequest|null} [presence_stats] Command presence_stats
                 * @property {centrifugal.centrifuge.protocol.IHistoryRequest|null} [history] Command history
                 * @property {centrifugal.centrifuge.protocol.IPingRequest|null} [ping] Command ping
                 * @property {centrifugal.centrifuge.protocol.ISendRequest|null} [send] Command send
                 * @property {centrifugal.centrifuge.protocol.IRPCRequest|null} [rpc] Command rpc
                 * @property {centrifugal.centrifuge.protocol.IRefreshRequest|null} [refresh] Command refresh
                 * @property {centrifugal.centrifuge.protocol.ISubRefreshRequest|null} [sub_refresh] Command sub_refresh
                 */

                /**
                 * Constructs a new Command.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Command.
                 * @implements ICommand
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ICommand=} [properties] Properties to set
                 */
                function Command(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Command id.
                 * @member {number} id
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.id = 0;

                /**
                 * Command connect.
                 * @member {centrifugal.centrifuge.protocol.IConnectRequest|null|undefined} connect
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.connect = null;

                /**
                 * Command subscribe.
                 * @member {centrifugal.centrifuge.protocol.ISubscribeRequest|null|undefined} subscribe
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.subscribe = null;

                /**
                 * Command unsubscribe.
                 * @member {centrifugal.centrifuge.protocol.IUnsubscribeRequest|null|undefined} unsubscribe
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.unsubscribe = null;

                /**
                 * Command publish.
                 * @member {centrifugal.centrifuge.protocol.IPublishRequest|null|undefined} publish
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.publish = null;

                /**
                 * Command presence.
                 * @member {centrifugal.centrifuge.protocol.IPresenceRequest|null|undefined} presence
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.presence = null;

                /**
                 * Command presence_stats.
                 * @member {centrifugal.centrifuge.protocol.IPresenceStatsRequest|null|undefined} presence_stats
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.presence_stats = null;

                /**
                 * Command history.
                 * @member {centrifugal.centrifuge.protocol.IHistoryRequest|null|undefined} history
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.history = null;

                /**
                 * Command ping.
                 * @member {centrifugal.centrifuge.protocol.IPingRequest|null|undefined} ping
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.ping = null;

                /**
                 * Command send.
                 * @member {centrifugal.centrifuge.protocol.ISendRequest|null|undefined} send
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.send = null;

                /**
                 * Command rpc.
                 * @member {centrifugal.centrifuge.protocol.IRPCRequest|null|undefined} rpc
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.rpc = null;

                /**
                 * Command refresh.
                 * @member {centrifugal.centrifuge.protocol.IRefreshRequest|null|undefined} refresh
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.refresh = null;

                /**
                 * Command sub_refresh.
                 * @member {centrifugal.centrifuge.protocol.ISubRefreshRequest|null|undefined} sub_refresh
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @instance
                 */
                Command.prototype.sub_refresh = null;

                /**
                 * Encodes the specified Command message. Does not implicitly {@link centrifugal.centrifuge.protocol.Command.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ICommand} message Command message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Command.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.id);
                    if (message.connect != null && Object.hasOwnProperty.call(message, "connect"))
                        $root.centrifugal.centrifuge.protocol.ConnectRequest.encode(message.connect, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.subscribe != null && Object.hasOwnProperty.call(message, "subscribe"))
                        $root.centrifugal.centrifuge.protocol.SubscribeRequest.encode(message.subscribe, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                    if (message.unsubscribe != null && Object.hasOwnProperty.call(message, "unsubscribe"))
                        $root.centrifugal.centrifuge.protocol.UnsubscribeRequest.encode(message.unsubscribe, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                    if (message.publish != null && Object.hasOwnProperty.call(message, "publish"))
                        $root.centrifugal.centrifuge.protocol.PublishRequest.encode(message.publish, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                    if (message.presence != null && Object.hasOwnProperty.call(message, "presence"))
                        $root.centrifugal.centrifuge.protocol.PresenceRequest.encode(message.presence, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                    if (message.presence_stats != null && Object.hasOwnProperty.call(message, "presence_stats"))
                        $root.centrifugal.centrifuge.protocol.PresenceStatsRequest.encode(message.presence_stats, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
                    if (message.history != null && Object.hasOwnProperty.call(message, "history"))
                        $root.centrifugal.centrifuge.protocol.HistoryRequest.encode(message.history, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
                    if (message.ping != null && Object.hasOwnProperty.call(message, "ping"))
                        $root.centrifugal.centrifuge.protocol.PingRequest.encode(message.ping, writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
                    if (message.send != null && Object.hasOwnProperty.call(message, "send"))
                        $root.centrifugal.centrifuge.protocol.SendRequest.encode(message.send, writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
                    if (message.rpc != null && Object.hasOwnProperty.call(message, "rpc"))
                        $root.centrifugal.centrifuge.protocol.RPCRequest.encode(message.rpc, writer.uint32(/* id 13, wireType 2 =*/106).fork()).ldelim();
                    if (message.refresh != null && Object.hasOwnProperty.call(message, "refresh"))
                        $root.centrifugal.centrifuge.protocol.RefreshRequest.encode(message.refresh, writer.uint32(/* id 14, wireType 2 =*/114).fork()).ldelim();
                    if (message.sub_refresh != null && Object.hasOwnProperty.call(message, "sub_refresh"))
                        $root.centrifugal.centrifuge.protocol.SubRefreshRequest.encode(message.sub_refresh, writer.uint32(/* id 15, wireType 2 =*/122).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Command message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Command.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ICommand} message Command message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Command.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Command message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Command} Command
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Command.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Command();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.id = reader.uint32();
                                break;
                            }
                        case 4: {
                                message.connect = $root.centrifugal.centrifuge.protocol.ConnectRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 5: {
                                message.subscribe = $root.centrifugal.centrifuge.protocol.SubscribeRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 6: {
                                message.unsubscribe = $root.centrifugal.centrifuge.protocol.UnsubscribeRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 7: {
                                message.publish = $root.centrifugal.centrifuge.protocol.PublishRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 8: {
                                message.presence = $root.centrifugal.centrifuge.protocol.PresenceRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 9: {
                                message.presence_stats = $root.centrifugal.centrifuge.protocol.PresenceStatsRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 10: {
                                message.history = $root.centrifugal.centrifuge.protocol.HistoryRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 11: {
                                message.ping = $root.centrifugal.centrifuge.protocol.PingRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 12: {
                                message.send = $root.centrifugal.centrifuge.protocol.SendRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 13: {
                                message.rpc = $root.centrifugal.centrifuge.protocol.RPCRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 14: {
                                message.refresh = $root.centrifugal.centrifuge.protocol.RefreshRequest.decode(reader, reader.uint32());
                                break;
                            }
                        case 15: {
                                message.sub_refresh = $root.centrifugal.centrifuge.protocol.SubRefreshRequest.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Command message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Command} Command
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Command.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Command message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Command.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.id != null && message.hasOwnProperty("id"))
                        if (!$util.isInteger(message.id))
                            return "id: integer expected";
                    if (message.connect != null && message.hasOwnProperty("connect")) {
                        let error = $root.centrifugal.centrifuge.protocol.ConnectRequest.verify(message.connect);
                        if (error)
                            return "connect." + error;
                    }
                    if (message.subscribe != null && message.hasOwnProperty("subscribe")) {
                        let error = $root.centrifugal.centrifuge.protocol.SubscribeRequest.verify(message.subscribe);
                        if (error)
                            return "subscribe." + error;
                    }
                    if (message.unsubscribe != null && message.hasOwnProperty("unsubscribe")) {
                        let error = $root.centrifugal.centrifuge.protocol.UnsubscribeRequest.verify(message.unsubscribe);
                        if (error)
                            return "unsubscribe." + error;
                    }
                    if (message.publish != null && message.hasOwnProperty("publish")) {
                        let error = $root.centrifugal.centrifuge.protocol.PublishRequest.verify(message.publish);
                        if (error)
                            return "publish." + error;
                    }
                    if (message.presence != null && message.hasOwnProperty("presence")) {
                        let error = $root.centrifugal.centrifuge.protocol.PresenceRequest.verify(message.presence);
                        if (error)
                            return "presence." + error;
                    }
                    if (message.presence_stats != null && message.hasOwnProperty("presence_stats")) {
                        let error = $root.centrifugal.centrifuge.protocol.PresenceStatsRequest.verify(message.presence_stats);
                        if (error)
                            return "presence_stats." + error;
                    }
                    if (message.history != null && message.hasOwnProperty("history")) {
                        let error = $root.centrifugal.centrifuge.protocol.HistoryRequest.verify(message.history);
                        if (error)
                            return "history." + error;
                    }
                    if (message.ping != null && message.hasOwnProperty("ping")) {
                        let error = $root.centrifugal.centrifuge.protocol.PingRequest.verify(message.ping);
                        if (error)
                            return "ping." + error;
                    }
                    if (message.send != null && message.hasOwnProperty("send")) {
                        let error = $root.centrifugal.centrifuge.protocol.SendRequest.verify(message.send);
                        if (error)
                            return "send." + error;
                    }
                    if (message.rpc != null && message.hasOwnProperty("rpc")) {
                        let error = $root.centrifugal.centrifuge.protocol.RPCRequest.verify(message.rpc);
                        if (error)
                            return "rpc." + error;
                    }
                    if (message.refresh != null && message.hasOwnProperty("refresh")) {
                        let error = $root.centrifugal.centrifuge.protocol.RefreshRequest.verify(message.refresh);
                        if (error)
                            return "refresh." + error;
                    }
                    if (message.sub_refresh != null && message.hasOwnProperty("sub_refresh")) {
                        let error = $root.centrifugal.centrifuge.protocol.SubRefreshRequest.verify(message.sub_refresh);
                        if (error)
                            return "sub_refresh." + error;
                    }
                    return null;
                };

                /**
                 * Gets the default type url for Command
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Command
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Command.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Command";
                };

                return Command;
            })();

            protocol.Reply = (function() {

                /**
                 * Properties of a Reply.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IReply
                 * @property {number|null} [id] Reply id
                 * @property {centrifugal.centrifuge.protocol.IError|null} [error] Reply error
                 * @property {centrifugal.centrifuge.protocol.IPush|null} [push] Reply push
                 * @property {centrifugal.centrifuge.protocol.IConnectResult|null} [connect] Reply connect
                 * @property {centrifugal.centrifuge.protocol.ISubscribeResult|null} [subscribe] Reply subscribe
                 * @property {centrifugal.centrifuge.protocol.IUnsubscribeResult|null} [unsubscribe] Reply unsubscribe
                 * @property {centrifugal.centrifuge.protocol.IPublishResult|null} [publish] Reply publish
                 * @property {centrifugal.centrifuge.protocol.IPresenceResult|null} [presence] Reply presence
                 * @property {centrifugal.centrifuge.protocol.IPresenceStatsResult|null} [presence_stats] Reply presence_stats
                 * @property {centrifugal.centrifuge.protocol.IHistoryResult|null} [history] Reply history
                 * @property {centrifugal.centrifuge.protocol.IPingResult|null} [ping] Reply ping
                 * @property {centrifugal.centrifuge.protocol.IRPCResult|null} [rpc] Reply rpc
                 * @property {centrifugal.centrifuge.protocol.IRefreshResult|null} [refresh] Reply refresh
                 * @property {centrifugal.centrifuge.protocol.ISubRefreshResult|null} [sub_refresh] Reply sub_refresh
                 */

                /**
                 * Constructs a new Reply.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Reply.
                 * @implements IReply
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IReply=} [properties] Properties to set
                 */
                function Reply(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Reply id.
                 * @member {number} id
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.id = 0;

                /**
                 * Reply error.
                 * @member {centrifugal.centrifuge.protocol.IError|null|undefined} error
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.error = null;

                /**
                 * Reply push.
                 * @member {centrifugal.centrifuge.protocol.IPush|null|undefined} push
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.push = null;

                /**
                 * Reply connect.
                 * @member {centrifugal.centrifuge.protocol.IConnectResult|null|undefined} connect
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.connect = null;

                /**
                 * Reply subscribe.
                 * @member {centrifugal.centrifuge.protocol.ISubscribeResult|null|undefined} subscribe
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.subscribe = null;

                /**
                 * Reply unsubscribe.
                 * @member {centrifugal.centrifuge.protocol.IUnsubscribeResult|null|undefined} unsubscribe
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.unsubscribe = null;

                /**
                 * Reply publish.
                 * @member {centrifugal.centrifuge.protocol.IPublishResult|null|undefined} publish
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.publish = null;

                /**
                 * Reply presence.
                 * @member {centrifugal.centrifuge.protocol.IPresenceResult|null|undefined} presence
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.presence = null;

                /**
                 * Reply presence_stats.
                 * @member {centrifugal.centrifuge.protocol.IPresenceStatsResult|null|undefined} presence_stats
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.presence_stats = null;

                /**
                 * Reply history.
                 * @member {centrifugal.centrifuge.protocol.IHistoryResult|null|undefined} history
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.history = null;

                /**
                 * Reply ping.
                 * @member {centrifugal.centrifuge.protocol.IPingResult|null|undefined} ping
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.ping = null;

                /**
                 * Reply rpc.
                 * @member {centrifugal.centrifuge.protocol.IRPCResult|null|undefined} rpc
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.rpc = null;

                /**
                 * Reply refresh.
                 * @member {centrifugal.centrifuge.protocol.IRefreshResult|null|undefined} refresh
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.refresh = null;

                /**
                 * Reply sub_refresh.
                 * @member {centrifugal.centrifuge.protocol.ISubRefreshResult|null|undefined} sub_refresh
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @instance
                 */
                Reply.prototype.sub_refresh = null;

                /**
                 * Encodes the specified Reply message. Does not implicitly {@link centrifugal.centrifuge.protocol.Reply.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IReply} message Reply message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Reply.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.id);
                    if (message.error != null && Object.hasOwnProperty.call(message, "error"))
                        $root.centrifugal.centrifuge.protocol.Error.encode(message.error, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.push != null && Object.hasOwnProperty.call(message, "push"))
                        $root.centrifugal.centrifuge.protocol.Push.encode(message.push, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.connect != null && Object.hasOwnProperty.call(message, "connect"))
                        $root.centrifugal.centrifuge.protocol.ConnectResult.encode(message.connect, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                    if (message.subscribe != null && Object.hasOwnProperty.call(message, "subscribe"))
                        $root.centrifugal.centrifuge.protocol.SubscribeResult.encode(message.subscribe, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                    if (message.unsubscribe != null && Object.hasOwnProperty.call(message, "unsubscribe"))
                        $root.centrifugal.centrifuge.protocol.UnsubscribeResult.encode(message.unsubscribe, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                    if (message.publish != null && Object.hasOwnProperty.call(message, "publish"))
                        $root.centrifugal.centrifuge.protocol.PublishResult.encode(message.publish, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                    if (message.presence != null && Object.hasOwnProperty.call(message, "presence"))
                        $root.centrifugal.centrifuge.protocol.PresenceResult.encode(message.presence, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
                    if (message.presence_stats != null && Object.hasOwnProperty.call(message, "presence_stats"))
                        $root.centrifugal.centrifuge.protocol.PresenceStatsResult.encode(message.presence_stats, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
                    if (message.history != null && Object.hasOwnProperty.call(message, "history"))
                        $root.centrifugal.centrifuge.protocol.HistoryResult.encode(message.history, writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
                    if (message.ping != null && Object.hasOwnProperty.call(message, "ping"))
                        $root.centrifugal.centrifuge.protocol.PingResult.encode(message.ping, writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
                    if (message.rpc != null && Object.hasOwnProperty.call(message, "rpc"))
                        $root.centrifugal.centrifuge.protocol.RPCResult.encode(message.rpc, writer.uint32(/* id 13, wireType 2 =*/106).fork()).ldelim();
                    if (message.refresh != null && Object.hasOwnProperty.call(message, "refresh"))
                        $root.centrifugal.centrifuge.protocol.RefreshResult.encode(message.refresh, writer.uint32(/* id 14, wireType 2 =*/114).fork()).ldelim();
                    if (message.sub_refresh != null && Object.hasOwnProperty.call(message, "sub_refresh"))
                        $root.centrifugal.centrifuge.protocol.SubRefreshResult.encode(message.sub_refresh, writer.uint32(/* id 15, wireType 2 =*/122).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Reply message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Reply.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IReply} message Reply message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Reply.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Reply message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Reply} Reply
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Reply.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Reply();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.id = reader.uint32();
                                break;
                            }
                        case 2: {
                                message.error = $root.centrifugal.centrifuge.protocol.Error.decode(reader, reader.uint32());
                                break;
                            }
                        case 4: {
                                message.push = $root.centrifugal.centrifuge.protocol.Push.decode(reader, reader.uint32());
                                break;
                            }
                        case 5: {
                                message.connect = $root.centrifugal.centrifuge.protocol.ConnectResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 6: {
                                message.subscribe = $root.centrifugal.centrifuge.protocol.SubscribeResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 7: {
                                message.unsubscribe = $root.centrifugal.centrifuge.protocol.UnsubscribeResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 8: {
                                message.publish = $root.centrifugal.centrifuge.protocol.PublishResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 9: {
                                message.presence = $root.centrifugal.centrifuge.protocol.PresenceResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 10: {
                                message.presence_stats = $root.centrifugal.centrifuge.protocol.PresenceStatsResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 11: {
                                message.history = $root.centrifugal.centrifuge.protocol.HistoryResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 12: {
                                message.ping = $root.centrifugal.centrifuge.protocol.PingResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 13: {
                                message.rpc = $root.centrifugal.centrifuge.protocol.RPCResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 14: {
                                message.refresh = $root.centrifugal.centrifuge.protocol.RefreshResult.decode(reader, reader.uint32());
                                break;
                            }
                        case 15: {
                                message.sub_refresh = $root.centrifugal.centrifuge.protocol.SubRefreshResult.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Reply message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Reply} Reply
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Reply.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Reply message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Reply.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.id != null && message.hasOwnProperty("id"))
                        if (!$util.isInteger(message.id))
                            return "id: integer expected";
                    if (message.error != null && message.hasOwnProperty("error")) {
                        let error = $root.centrifugal.centrifuge.protocol.Error.verify(message.error);
                        if (error)
                            return "error." + error;
                    }
                    if (message.push != null && message.hasOwnProperty("push")) {
                        let error = $root.centrifugal.centrifuge.protocol.Push.verify(message.push);
                        if (error)
                            return "push." + error;
                    }
                    if (message.connect != null && message.hasOwnProperty("connect")) {
                        let error = $root.centrifugal.centrifuge.protocol.ConnectResult.verify(message.connect);
                        if (error)
                            return "connect." + error;
                    }
                    if (message.subscribe != null && message.hasOwnProperty("subscribe")) {
                        let error = $root.centrifugal.centrifuge.protocol.SubscribeResult.verify(message.subscribe);
                        if (error)
                            return "subscribe." + error;
                    }
                    if (message.unsubscribe != null && message.hasOwnProperty("unsubscribe")) {
                        let error = $root.centrifugal.centrifuge.protocol.UnsubscribeResult.verify(message.unsubscribe);
                        if (error)
                            return "unsubscribe." + error;
                    }
                    if (message.publish != null && message.hasOwnProperty("publish")) {
                        let error = $root.centrifugal.centrifuge.protocol.PublishResult.verify(message.publish);
                        if (error)
                            return "publish." + error;
                    }
                    if (message.presence != null && message.hasOwnProperty("presence")) {
                        let error = $root.centrifugal.centrifuge.protocol.PresenceResult.verify(message.presence);
                        if (error)
                            return "presence." + error;
                    }
                    if (message.presence_stats != null && message.hasOwnProperty("presence_stats")) {
                        let error = $root.centrifugal.centrifuge.protocol.PresenceStatsResult.verify(message.presence_stats);
                        if (error)
                            return "presence_stats." + error;
                    }
                    if (message.history != null && message.hasOwnProperty("history")) {
                        let error = $root.centrifugal.centrifuge.protocol.HistoryResult.verify(message.history);
                        if (error)
                            return "history." + error;
                    }
                    if (message.ping != null && message.hasOwnProperty("ping")) {
                        let error = $root.centrifugal.centrifuge.protocol.PingResult.verify(message.ping);
                        if (error)
                            return "ping." + error;
                    }
                    if (message.rpc != null && message.hasOwnProperty("rpc")) {
                        let error = $root.centrifugal.centrifuge.protocol.RPCResult.verify(message.rpc);
                        if (error)
                            return "rpc." + error;
                    }
                    if (message.refresh != null && message.hasOwnProperty("refresh")) {
                        let error = $root.centrifugal.centrifuge.protocol.RefreshResult.verify(message.refresh);
                        if (error)
                            return "refresh." + error;
                    }
                    if (message.sub_refresh != null && message.hasOwnProperty("sub_refresh")) {
                        let error = $root.centrifugal.centrifuge.protocol.SubRefreshResult.verify(message.sub_refresh);
                        if (error)
                            return "sub_refresh." + error;
                    }
                    return null;
                };

                /**
                 * Gets the default type url for Reply
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Reply
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Reply.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Reply";
                };

                return Reply;
            })();

            protocol.Push = (function() {

                /**
                 * Properties of a Push.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPush
                 * @property {string|null} [channel] Push channel
                 * @property {centrifugal.centrifuge.protocol.IPublication|null} [pub] Push pub
                 * @property {centrifugal.centrifuge.protocol.IJoin|null} [join] Push join
                 * @property {centrifugal.centrifuge.protocol.ILeave|null} [leave] Push leave
                 * @property {centrifugal.centrifuge.protocol.IUnsubscribe|null} [unsubscribe] Push unsubscribe
                 * @property {centrifugal.centrifuge.protocol.IMessage|null} [message] Push message
                 * @property {centrifugal.centrifuge.protocol.ISubscribe|null} [subscribe] Push subscribe
                 * @property {centrifugal.centrifuge.protocol.IConnect|null} [connect] Push connect
                 * @property {centrifugal.centrifuge.protocol.IDisconnect|null} [disconnect] Push disconnect
                 * @property {centrifugal.centrifuge.protocol.IRefresh|null} [refresh] Push refresh
                 */

                /**
                 * Constructs a new Push.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Push.
                 * @implements IPush
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPush=} [properties] Properties to set
                 */
                function Push(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Push channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.channel = "";

                /**
                 * Push pub.
                 * @member {centrifugal.centrifuge.protocol.IPublication|null|undefined} pub
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.pub = null;

                /**
                 * Push join.
                 * @member {centrifugal.centrifuge.protocol.IJoin|null|undefined} join
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.join = null;

                /**
                 * Push leave.
                 * @member {centrifugal.centrifuge.protocol.ILeave|null|undefined} leave
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.leave = null;

                /**
                 * Push unsubscribe.
                 * @member {centrifugal.centrifuge.protocol.IUnsubscribe|null|undefined} unsubscribe
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.unsubscribe = null;

                /**
                 * Push message.
                 * @member {centrifugal.centrifuge.protocol.IMessage|null|undefined} message
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.message = null;

                /**
                 * Push subscribe.
                 * @member {centrifugal.centrifuge.protocol.ISubscribe|null|undefined} subscribe
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.subscribe = null;

                /**
                 * Push connect.
                 * @member {centrifugal.centrifuge.protocol.IConnect|null|undefined} connect
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.connect = null;

                /**
                 * Push disconnect.
                 * @member {centrifugal.centrifuge.protocol.IDisconnect|null|undefined} disconnect
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.disconnect = null;

                /**
                 * Push refresh.
                 * @member {centrifugal.centrifuge.protocol.IRefresh|null|undefined} refresh
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @instance
                 */
                Push.prototype.refresh = null;

                /**
                 * Encodes the specified Push message. Does not implicitly {@link centrifugal.centrifuge.protocol.Push.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPush} message Push message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Push.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.channel);
                    if (message.pub != null && Object.hasOwnProperty.call(message, "pub"))
                        $root.centrifugal.centrifuge.protocol.Publication.encode(message.pub, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.join != null && Object.hasOwnProperty.call(message, "join"))
                        $root.centrifugal.centrifuge.protocol.Join.encode(message.join, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                    if (message.leave != null && Object.hasOwnProperty.call(message, "leave"))
                        $root.centrifugal.centrifuge.protocol.Leave.encode(message.leave, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                    if (message.unsubscribe != null && Object.hasOwnProperty.call(message, "unsubscribe"))
                        $root.centrifugal.centrifuge.protocol.Unsubscribe.encode(message.unsubscribe, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                    if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                        $root.centrifugal.centrifuge.protocol.Message.encode(message.message, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                    if (message.subscribe != null && Object.hasOwnProperty.call(message, "subscribe"))
                        $root.centrifugal.centrifuge.protocol.Subscribe.encode(message.subscribe, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
                    if (message.connect != null && Object.hasOwnProperty.call(message, "connect"))
                        $root.centrifugal.centrifuge.protocol.Connect.encode(message.connect, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
                    if (message.disconnect != null && Object.hasOwnProperty.call(message, "disconnect"))
                        $root.centrifugal.centrifuge.protocol.Disconnect.encode(message.disconnect, writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
                    if (message.refresh != null && Object.hasOwnProperty.call(message, "refresh"))
                        $root.centrifugal.centrifuge.protocol.Refresh.encode(message.refresh, writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Push message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Push.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPush} message Push message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Push.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Push message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Push} Push
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Push.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Push();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 2: {
                                message.channel = reader.string();
                                break;
                            }
                        case 4: {
                                message.pub = $root.centrifugal.centrifuge.protocol.Publication.decode(reader, reader.uint32());
                                break;
                            }
                        case 5: {
                                message.join = $root.centrifugal.centrifuge.protocol.Join.decode(reader, reader.uint32());
                                break;
                            }
                        case 6: {
                                message.leave = $root.centrifugal.centrifuge.protocol.Leave.decode(reader, reader.uint32());
                                break;
                            }
                        case 7: {
                                message.unsubscribe = $root.centrifugal.centrifuge.protocol.Unsubscribe.decode(reader, reader.uint32());
                                break;
                            }
                        case 8: {
                                message.message = $root.centrifugal.centrifuge.protocol.Message.decode(reader, reader.uint32());
                                break;
                            }
                        case 9: {
                                message.subscribe = $root.centrifugal.centrifuge.protocol.Subscribe.decode(reader, reader.uint32());
                                break;
                            }
                        case 10: {
                                message.connect = $root.centrifugal.centrifuge.protocol.Connect.decode(reader, reader.uint32());
                                break;
                            }
                        case 11: {
                                message.disconnect = $root.centrifugal.centrifuge.protocol.Disconnect.decode(reader, reader.uint32());
                                break;
                            }
                        case 12: {
                                message.refresh = $root.centrifugal.centrifuge.protocol.Refresh.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Push message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Push} Push
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Push.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Push message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Push.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    if (message.pub != null && message.hasOwnProperty("pub")) {
                        let error = $root.centrifugal.centrifuge.protocol.Publication.verify(message.pub);
                        if (error)
                            return "pub." + error;
                    }
                    if (message.join != null && message.hasOwnProperty("join")) {
                        let error = $root.centrifugal.centrifuge.protocol.Join.verify(message.join);
                        if (error)
                            return "join." + error;
                    }
                    if (message.leave != null && message.hasOwnProperty("leave")) {
                        let error = $root.centrifugal.centrifuge.protocol.Leave.verify(message.leave);
                        if (error)
                            return "leave." + error;
                    }
                    if (message.unsubscribe != null && message.hasOwnProperty("unsubscribe")) {
                        let error = $root.centrifugal.centrifuge.protocol.Unsubscribe.verify(message.unsubscribe);
                        if (error)
                            return "unsubscribe." + error;
                    }
                    if (message.message != null && message.hasOwnProperty("message")) {
                        let error = $root.centrifugal.centrifuge.protocol.Message.verify(message.message);
                        if (error)
                            return "message." + error;
                    }
                    if (message.subscribe != null && message.hasOwnProperty("subscribe")) {
                        let error = $root.centrifugal.centrifuge.protocol.Subscribe.verify(message.subscribe);
                        if (error)
                            return "subscribe." + error;
                    }
                    if (message.connect != null && message.hasOwnProperty("connect")) {
                        let error = $root.centrifugal.centrifuge.protocol.Connect.verify(message.connect);
                        if (error)
                            return "connect." + error;
                    }
                    if (message.disconnect != null && message.hasOwnProperty("disconnect")) {
                        let error = $root.centrifugal.centrifuge.protocol.Disconnect.verify(message.disconnect);
                        if (error)
                            return "disconnect." + error;
                    }
                    if (message.refresh != null && message.hasOwnProperty("refresh")) {
                        let error = $root.centrifugal.centrifuge.protocol.Refresh.verify(message.refresh);
                        if (error)
                            return "refresh." + error;
                    }
                    return null;
                };

                /**
                 * Gets the default type url for Push
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Push
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Push.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Push";
                };

                return Push;
            })();

            protocol.ClientInfo = (function() {

                /**
                 * Properties of a ClientInfo.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IClientInfo
                 * @property {string|null} [user] ClientInfo user
                 * @property {string|null} [client] ClientInfo client
                 * @property {Uint8Array|null} [conn_info] ClientInfo conn_info
                 * @property {Uint8Array|null} [chan_info] ClientInfo chan_info
                 */

                /**
                 * Constructs a new ClientInfo.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a ClientInfo.
                 * @implements IClientInfo
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IClientInfo=} [properties] Properties to set
                 */
                function ClientInfo(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ClientInfo user.
                 * @member {string} user
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @instance
                 */
                ClientInfo.prototype.user = "";

                /**
                 * ClientInfo client.
                 * @member {string} client
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @instance
                 */
                ClientInfo.prototype.client = "";

                /**
                 * ClientInfo conn_info.
                 * @member {Uint8Array} conn_info
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @instance
                 */
                ClientInfo.prototype.conn_info = $util.newBuffer([]);

                /**
                 * ClientInfo chan_info.
                 * @member {Uint8Array} chan_info
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @instance
                 */
                ClientInfo.prototype.chan_info = $util.newBuffer([]);

                /**
                 * Encodes the specified ClientInfo message. Does not implicitly {@link centrifugal.centrifuge.protocol.ClientInfo.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IClientInfo} message ClientInfo message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ClientInfo.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.user != null && Object.hasOwnProperty.call(message, "user"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.user);
                    if (message.client != null && Object.hasOwnProperty.call(message, "client"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.client);
                    if (message.conn_info != null && Object.hasOwnProperty.call(message, "conn_info"))
                        writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.conn_info);
                    if (message.chan_info != null && Object.hasOwnProperty.call(message, "chan_info"))
                        writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.chan_info);
                    return writer;
                };

                /**
                 * Encodes the specified ClientInfo message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.ClientInfo.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IClientInfo} message ClientInfo message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ClientInfo.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a ClientInfo message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.ClientInfo} ClientInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ClientInfo.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.ClientInfo();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.user = reader.string();
                                break;
                            }
                        case 2: {
                                message.client = reader.string();
                                break;
                            }
                        case 3: {
                                message.conn_info = reader.bytes();
                                break;
                            }
                        case 4: {
                                message.chan_info = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a ClientInfo message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.ClientInfo} ClientInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ClientInfo.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a ClientInfo message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ClientInfo.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.user != null && message.hasOwnProperty("user"))
                        if (!$util.isString(message.user))
                            return "user: string expected";
                    if (message.client != null && message.hasOwnProperty("client"))
                        if (!$util.isString(message.client))
                            return "client: string expected";
                    if (message.conn_info != null && message.hasOwnProperty("conn_info"))
                        if (!(message.conn_info && typeof message.conn_info.length === "number" || $util.isString(message.conn_info)))
                            return "conn_info: buffer expected";
                    if (message.chan_info != null && message.hasOwnProperty("chan_info"))
                        if (!(message.chan_info && typeof message.chan_info.length === "number" || $util.isString(message.chan_info)))
                            return "chan_info: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for ClientInfo
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.ClientInfo
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                ClientInfo.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.ClientInfo";
                };

                return ClientInfo;
            })();

            protocol.Publication = (function() {

                /**
                 * Properties of a Publication.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPublication
                 * @property {Uint8Array|null} [data] Publication data
                 * @property {centrifugal.centrifuge.protocol.IClientInfo|null} [info] Publication info
                 * @property {number|Long|null} [offset] Publication offset
                 * @property {Object.<string,string>|null} [tags] Publication tags
                 * @property {boolean|null} [delta] Publication delta
                 * @property {number|Long|null} [time] Publication time
                 * @property {string|null} [channel] Publication channel
                 */

                /**
                 * Constructs a new Publication.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Publication.
                 * @implements IPublication
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPublication=} [properties] Properties to set
                 */
                function Publication(properties) {
                    this.tags = {};
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Publication data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.data = $util.newBuffer([]);

                /**
                 * Publication info.
                 * @member {centrifugal.centrifuge.protocol.IClientInfo|null|undefined} info
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.info = null;

                /**
                 * Publication offset.
                 * @member {number|Long} offset
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * Publication tags.
                 * @member {Object.<string,string>} tags
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.tags = $util.emptyObject;

                /**
                 * Publication delta.
                 * @member {boolean} delta
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.delta = false;

                /**
                 * Publication time.
                 * @member {number|Long} time
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.time = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

                /**
                 * Publication channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @instance
                 */
                Publication.prototype.channel = "";

                /**
                 * Encodes the specified Publication message. Does not implicitly {@link centrifugal.centrifuge.protocol.Publication.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPublication} message Publication message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Publication.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.data);
                    if (message.info != null && Object.hasOwnProperty.call(message, "info"))
                        $root.centrifugal.centrifuge.protocol.ClientInfo.encode(message.info, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                    if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                        writer.uint32(/* id 6, wireType 0 =*/48).uint64(message.offset);
                    if (message.tags != null && Object.hasOwnProperty.call(message, "tags"))
                        for (let keys = Object.keys(message.tags), i = 0; i < keys.length; ++i)
                            writer.uint32(/* id 7, wireType 2 =*/58).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.tags[keys[i]]).ldelim();
                    if (message.delta != null && Object.hasOwnProperty.call(message, "delta"))
                        writer.uint32(/* id 8, wireType 0 =*/64).bool(message.delta);
                    if (message.time != null && Object.hasOwnProperty.call(message, "time"))
                        writer.uint32(/* id 9, wireType 0 =*/72).int64(message.time);
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 10, wireType 2 =*/82).string(message.channel);
                    return writer;
                };

                /**
                 * Encodes the specified Publication message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Publication.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPublication} message Publication message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Publication.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Publication message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Publication} Publication
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Publication.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Publication(), key, value;
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 4: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 5: {
                                message.info = $root.centrifugal.centrifuge.protocol.ClientInfo.decode(reader, reader.uint32());
                                break;
                            }
                        case 6: {
                                message.offset = reader.uint64();
                                break;
                            }
                        case 7: {
                                if (message.tags === $util.emptyObject)
                                    message.tags = {};
                                let end2 = reader.uint32() + reader.pos;
                                key = "";
                                value = "";
                                while (reader.pos < end2) {
                                    let tag2 = reader.uint32();
                                    switch (tag2 >>> 3) {
                                    case 1:
                                        key = reader.string();
                                        break;
                                    case 2:
                                        value = reader.string();
                                        break;
                                    default:
                                        reader.skipType(tag2 & 7);
                                        break;
                                    }
                                }
                                message.tags[key] = value;
                                break;
                            }
                        case 8: {
                                message.delta = reader.bool();
                                break;
                            }
                        case 9: {
                                message.time = reader.int64();
                                break;
                            }
                        case 10: {
                                message.channel = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Publication message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Publication} Publication
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Publication.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Publication message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Publication.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.info != null && message.hasOwnProperty("info")) {
                        let error = $root.centrifugal.centrifuge.protocol.ClientInfo.verify(message.info);
                        if (error)
                            return "info." + error;
                    }
                    if (message.offset != null && message.hasOwnProperty("offset"))
                        if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                            return "offset: integer|Long expected";
                    if (message.tags != null && message.hasOwnProperty("tags")) {
                        if (!$util.isObject(message.tags))
                            return "tags: object expected";
                        let key = Object.keys(message.tags);
                        for (let i = 0; i < key.length; ++i)
                            if (!$util.isString(message.tags[key[i]]))
                                return "tags: string{k:string} expected";
                    }
                    if (message.delta != null && message.hasOwnProperty("delta"))
                        if (typeof message.delta !== "boolean")
                            return "delta: boolean expected";
                    if (message.time != null && message.hasOwnProperty("time"))
                        if (!$util.isInteger(message.time) && !(message.time && $util.isInteger(message.time.low) && $util.isInteger(message.time.high)))
                            return "time: integer|Long expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for Publication
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Publication
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Publication.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Publication";
                };

                return Publication;
            })();

            protocol.Join = (function() {

                /**
                 * Properties of a Join.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IJoin
                 * @property {centrifugal.centrifuge.protocol.IClientInfo|null} [info] Join info
                 */

                /**
                 * Constructs a new Join.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Join.
                 * @implements IJoin
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IJoin=} [properties] Properties to set
                 */
                function Join(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Join info.
                 * @member {centrifugal.centrifuge.protocol.IClientInfo|null|undefined} info
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @instance
                 */
                Join.prototype.info = null;

                /**
                 * Encodes the specified Join message. Does not implicitly {@link centrifugal.centrifuge.protocol.Join.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IJoin} message Join message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Join.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.info != null && Object.hasOwnProperty.call(message, "info"))
                        $root.centrifugal.centrifuge.protocol.ClientInfo.encode(message.info, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Join message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Join.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IJoin} message Join message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Join.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Join message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Join} Join
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Join.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Join();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.info = $root.centrifugal.centrifuge.protocol.ClientInfo.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Join message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Join} Join
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Join.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Join message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Join.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.info != null && message.hasOwnProperty("info")) {
                        let error = $root.centrifugal.centrifuge.protocol.ClientInfo.verify(message.info);
                        if (error)
                            return "info." + error;
                    }
                    return null;
                };

                /**
                 * Gets the default type url for Join
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Join
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Join.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Join";
                };

                return Join;
            })();

            protocol.Leave = (function() {

                /**
                 * Properties of a Leave.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ILeave
                 * @property {centrifugal.centrifuge.protocol.IClientInfo|null} [info] Leave info
                 */

                /**
                 * Constructs a new Leave.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Leave.
                 * @implements ILeave
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ILeave=} [properties] Properties to set
                 */
                function Leave(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Leave info.
                 * @member {centrifugal.centrifuge.protocol.IClientInfo|null|undefined} info
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @instance
                 */
                Leave.prototype.info = null;

                /**
                 * Encodes the specified Leave message. Does not implicitly {@link centrifugal.centrifuge.protocol.Leave.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ILeave} message Leave message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Leave.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.info != null && Object.hasOwnProperty.call(message, "info"))
                        $root.centrifugal.centrifuge.protocol.ClientInfo.encode(message.info, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified Leave message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Leave.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ILeave} message Leave message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Leave.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Leave message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Leave} Leave
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Leave.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Leave();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.info = $root.centrifugal.centrifuge.protocol.ClientInfo.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Leave message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Leave} Leave
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Leave.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Leave message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Leave.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.info != null && message.hasOwnProperty("info")) {
                        let error = $root.centrifugal.centrifuge.protocol.ClientInfo.verify(message.info);
                        if (error)
                            return "info." + error;
                    }
                    return null;
                };

                /**
                 * Gets the default type url for Leave
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Leave
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Leave.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Leave";
                };

                return Leave;
            })();

            protocol.Unsubscribe = (function() {

                /**
                 * Properties of an Unsubscribe.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IUnsubscribe
                 * @property {number|null} [code] Unsubscribe code
                 * @property {string|null} [reason] Unsubscribe reason
                 */

                /**
                 * Constructs a new Unsubscribe.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents an Unsubscribe.
                 * @implements IUnsubscribe
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribe=} [properties] Properties to set
                 */
                function Unsubscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Unsubscribe code.
                 * @member {number} code
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @instance
                 */
                Unsubscribe.prototype.code = 0;

                /**
                 * Unsubscribe reason.
                 * @member {string} reason
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @instance
                 */
                Unsubscribe.prototype.reason = "";

                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link centrifugal.centrifuge.protocol.Unsubscribe.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribe} message Unsubscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Unsubscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.code);
                    if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.reason);
                    return writer;
                };

                /**
                 * Encodes the specified Unsubscribe message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Unsubscribe.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribe} message Unsubscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Unsubscribe.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Unsubscribe} Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Unsubscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Unsubscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 2: {
                                message.code = reader.uint32();
                                break;
                            }
                        case 3: {
                                message.reason = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Unsubscribe} Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Unsubscribe.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an Unsubscribe message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Unsubscribe.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.code != null && message.hasOwnProperty("code"))
                        if (!$util.isInteger(message.code))
                            return "code: integer expected";
                    if (message.reason != null && message.hasOwnProperty("reason"))
                        if (!$util.isString(message.reason))
                            return "reason: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for Unsubscribe
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Unsubscribe
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Unsubscribe.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Unsubscribe";
                };

                return Unsubscribe;
            })();

            protocol.Subscribe = (function() {

                /**
                 * Properties of a Subscribe.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ISubscribe
                 * @property {boolean|null} [recoverable] Subscribe recoverable
                 * @property {string|null} [epoch] Subscribe epoch
                 * @property {number|Long|null} [offset] Subscribe offset
                 * @property {boolean|null} [positioned] Subscribe positioned
                 * @property {Uint8Array|null} [data] Subscribe data
                 */

                /**
                 * Constructs a new Subscribe.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Subscribe.
                 * @implements ISubscribe
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ISubscribe=} [properties] Properties to set
                 */
                function Subscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Subscribe recoverable.
                 * @member {boolean} recoverable
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @instance
                 */
                Subscribe.prototype.recoverable = false;

                /**
                 * Subscribe epoch.
                 * @member {string} epoch
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @instance
                 */
                Subscribe.prototype.epoch = "";

                /**
                 * Subscribe offset.
                 * @member {number|Long} offset
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @instance
                 */
                Subscribe.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * Subscribe positioned.
                 * @member {boolean} positioned
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @instance
                 */
                Subscribe.prototype.positioned = false;

                /**
                 * Subscribe data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @instance
                 */
                Subscribe.prototype.data = $util.newBuffer([]);

                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link centrifugal.centrifuge.protocol.Subscribe.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubscribe} message Subscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Subscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.recoverable != null && Object.hasOwnProperty.call(message, "recoverable"))
                        writer.uint32(/* id 1, wireType 0 =*/8).bool(message.recoverable);
                    if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.epoch);
                    if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                        writer.uint32(/* id 5, wireType 0 =*/40).uint64(message.offset);
                    if (message.positioned != null && Object.hasOwnProperty.call(message, "positioned"))
                        writer.uint32(/* id 6, wireType 0 =*/48).bool(message.positioned);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified Subscribe message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Subscribe.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubscribe} message Subscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Subscribe.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Subscribe} Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Subscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Subscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.recoverable = reader.bool();
                                break;
                            }
                        case 4: {
                                message.epoch = reader.string();
                                break;
                            }
                        case 5: {
                                message.offset = reader.uint64();
                                break;
                            }
                        case 6: {
                                message.positioned = reader.bool();
                                break;
                            }
                        case 7: {
                                message.data = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Subscribe message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Subscribe} Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Subscribe.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Subscribe message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Subscribe.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.recoverable != null && message.hasOwnProperty("recoverable"))
                        if (typeof message.recoverable !== "boolean")
                            return "recoverable: boolean expected";
                    if (message.epoch != null && message.hasOwnProperty("epoch"))
                        if (!$util.isString(message.epoch))
                            return "epoch: string expected";
                    if (message.offset != null && message.hasOwnProperty("offset"))
                        if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                            return "offset: integer|Long expected";
                    if (message.positioned != null && message.hasOwnProperty("positioned"))
                        if (typeof message.positioned !== "boolean")
                            return "positioned: boolean expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for Subscribe
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Subscribe
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Subscribe.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Subscribe";
                };

                return Subscribe;
            })();

            protocol.Message = (function() {

                /**
                 * Properties of a Message.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IMessage
                 * @property {Uint8Array|null} [data] Message data
                 */

                /**
                 * Constructs a new Message.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Message.
                 * @implements IMessage
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IMessage=} [properties] Properties to set
                 */
                function Message(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Message data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @instance
                 */
                Message.prototype.data = $util.newBuffer([]);

                /**
                 * Encodes the specified Message message. Does not implicitly {@link centrifugal.centrifuge.protocol.Message.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IMessage} message Message message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Message.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified Message message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Message.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IMessage} message Message message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Message.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Message message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Message} Message
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Message.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Message();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.data = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Message message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Message} Message
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Message.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Message message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Message.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for Message
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Message
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Message.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Message";
                };

                return Message;
            })();

            protocol.Connect = (function() {

                /**
                 * Properties of a Connect.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IConnect
                 * @property {string|null} [client] Connect client
                 * @property {string|null} [version] Connect version
                 * @property {Uint8Array|null} [data] Connect data
                 * @property {Object.<string,centrifugal.centrifuge.protocol.ISubscribeResult>|null} [subs] Connect subs
                 * @property {boolean|null} [expires] Connect expires
                 * @property {number|null} [ttl] Connect ttl
                 * @property {number|null} [ping] Connect ping
                 * @property {boolean|null} [pong] Connect pong
                 * @property {string|null} [session] Connect session
                 * @property {string|null} [node] Connect node
                 * @property {number|Long|null} [time] Connect time
                 */

                /**
                 * Constructs a new Connect.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Connect.
                 * @implements IConnect
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IConnect=} [properties] Properties to set
                 */
                function Connect(properties) {
                    this.subs = {};
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Connect client.
                 * @member {string} client
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.client = "";

                /**
                 * Connect version.
                 * @member {string} version
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.version = "";

                /**
                 * Connect data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.data = $util.newBuffer([]);

                /**
                 * Connect subs.
                 * @member {Object.<string,centrifugal.centrifuge.protocol.ISubscribeResult>} subs
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.subs = $util.emptyObject;

                /**
                 * Connect expires.
                 * @member {boolean} expires
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.expires = false;

                /**
                 * Connect ttl.
                 * @member {number} ttl
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.ttl = 0;

                /**
                 * Connect ping.
                 * @member {number} ping
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.ping = 0;

                /**
                 * Connect pong.
                 * @member {boolean} pong
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.pong = false;

                /**
                 * Connect session.
                 * @member {string} session
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.session = "";

                /**
                 * Connect node.
                 * @member {string} node
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.node = "";

                /**
                 * Connect time.
                 * @member {number|Long} time
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @instance
                 */
                Connect.prototype.time = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

                /**
                 * Encodes the specified Connect message. Does not implicitly {@link centrifugal.centrifuge.protocol.Connect.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IConnect} message Connect message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Connect.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.client != null && Object.hasOwnProperty.call(message, "client"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.client);
                    if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.version);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.data);
                    if (message.subs != null && Object.hasOwnProperty.call(message, "subs"))
                        for (let keys = Object.keys(message.subs), i = 0; i < keys.length; ++i) {
                            writer.uint32(/* id 4, wireType 2 =*/34).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                            $root.centrifugal.centrifuge.protocol.SubscribeResult.encode(message.subs[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                        }
                    if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                        writer.uint32(/* id 5, wireType 0 =*/40).bool(message.expires);
                    if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                        writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.ttl);
                    if (message.ping != null && Object.hasOwnProperty.call(message, "ping"))
                        writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.ping);
                    if (message.pong != null && Object.hasOwnProperty.call(message, "pong"))
                        writer.uint32(/* id 8, wireType 0 =*/64).bool(message.pong);
                    if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                        writer.uint32(/* id 9, wireType 2 =*/74).string(message.session);
                    if (message.node != null && Object.hasOwnProperty.call(message, "node"))
                        writer.uint32(/* id 10, wireType 2 =*/82).string(message.node);
                    if (message.time != null && Object.hasOwnProperty.call(message, "time"))
                        writer.uint32(/* id 11, wireType 0 =*/88).int64(message.time);
                    return writer;
                };

                /**
                 * Encodes the specified Connect message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Connect.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IConnect} message Connect message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Connect.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Connect message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Connect} Connect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Connect.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Connect(), key, value;
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.client = reader.string();
                                break;
                            }
                        case 2: {
                                message.version = reader.string();
                                break;
                            }
                        case 3: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 4: {
                                if (message.subs === $util.emptyObject)
                                    message.subs = {};
                                let end2 = reader.uint32() + reader.pos;
                                key = "";
                                value = null;
                                while (reader.pos < end2) {
                                    let tag2 = reader.uint32();
                                    switch (tag2 >>> 3) {
                                    case 1:
                                        key = reader.string();
                                        break;
                                    case 2:
                                        value = $root.centrifugal.centrifuge.protocol.SubscribeResult.decode(reader, reader.uint32());
                                        break;
                                    default:
                                        reader.skipType(tag2 & 7);
                                        break;
                                    }
                                }
                                message.subs[key] = value;
                                break;
                            }
                        case 5: {
                                message.expires = reader.bool();
                                break;
                            }
                        case 6: {
                                message.ttl = reader.uint32();
                                break;
                            }
                        case 7: {
                                message.ping = reader.uint32();
                                break;
                            }
                        case 8: {
                                message.pong = reader.bool();
                                break;
                            }
                        case 9: {
                                message.session = reader.string();
                                break;
                            }
                        case 10: {
                                message.node = reader.string();
                                break;
                            }
                        case 11: {
                                message.time = reader.int64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Connect message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Connect} Connect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Connect.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Connect message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Connect.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.client != null && message.hasOwnProperty("client"))
                        if (!$util.isString(message.client))
                            return "client: string expected";
                    if (message.version != null && message.hasOwnProperty("version"))
                        if (!$util.isString(message.version))
                            return "version: string expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.subs != null && message.hasOwnProperty("subs")) {
                        if (!$util.isObject(message.subs))
                            return "subs: object expected";
                        let key = Object.keys(message.subs);
                        for (let i = 0; i < key.length; ++i) {
                            let error = $root.centrifugal.centrifuge.protocol.SubscribeResult.verify(message.subs[key[i]]);
                            if (error)
                                return "subs." + error;
                        }
                    }
                    if (message.expires != null && message.hasOwnProperty("expires"))
                        if (typeof message.expires !== "boolean")
                            return "expires: boolean expected";
                    if (message.ttl != null && message.hasOwnProperty("ttl"))
                        if (!$util.isInteger(message.ttl))
                            return "ttl: integer expected";
                    if (message.ping != null && message.hasOwnProperty("ping"))
                        if (!$util.isInteger(message.ping))
                            return "ping: integer expected";
                    if (message.pong != null && message.hasOwnProperty("pong"))
                        if (typeof message.pong !== "boolean")
                            return "pong: boolean expected";
                    if (message.session != null && message.hasOwnProperty("session"))
                        if (!$util.isString(message.session))
                            return "session: string expected";
                    if (message.node != null && message.hasOwnProperty("node"))
                        if (!$util.isString(message.node))
                            return "node: string expected";
                    if (message.time != null && message.hasOwnProperty("time"))
                        if (!$util.isInteger(message.time) && !(message.time && $util.isInteger(message.time.low) && $util.isInteger(message.time.high)))
                            return "time: integer|Long expected";
                    return null;
                };

                /**
                 * Gets the default type url for Connect
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Connect
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Connect.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Connect";
                };

                return Connect;
            })();

            protocol.Disconnect = (function() {

                /**
                 * Properties of a Disconnect.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IDisconnect
                 * @property {number|null} [code] Disconnect code
                 * @property {string|null} [reason] Disconnect reason
                 * @property {boolean|null} [reconnect] Disconnect reconnect
                 */

                /**
                 * Constructs a new Disconnect.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Disconnect.
                 * @implements IDisconnect
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IDisconnect=} [properties] Properties to set
                 */
                function Disconnect(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Disconnect code.
                 * @member {number} code
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @instance
                 */
                Disconnect.prototype.code = 0;

                /**
                 * Disconnect reason.
                 * @member {string} reason
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @instance
                 */
                Disconnect.prototype.reason = "";

                /**
                 * Disconnect reconnect.
                 * @member {boolean} reconnect
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @instance
                 */
                Disconnect.prototype.reconnect = false;

                /**
                 * Encodes the specified Disconnect message. Does not implicitly {@link centrifugal.centrifuge.protocol.Disconnect.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IDisconnect} message Disconnect message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Disconnect.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.code != null && Object.hasOwnProperty.call(message, "code"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.code);
                    if (message.reason != null && Object.hasOwnProperty.call(message, "reason"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.reason);
                    if (message.reconnect != null && Object.hasOwnProperty.call(message, "reconnect"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.reconnect);
                    return writer;
                };

                /**
                 * Encodes the specified Disconnect message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Disconnect.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IDisconnect} message Disconnect message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Disconnect.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Disconnect message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Disconnect} Disconnect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Disconnect.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Disconnect();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.code = reader.uint32();
                                break;
                            }
                        case 2: {
                                message.reason = reader.string();
                                break;
                            }
                        case 3: {
                                message.reconnect = reader.bool();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Disconnect message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Disconnect} Disconnect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Disconnect.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Disconnect message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Disconnect.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.code != null && message.hasOwnProperty("code"))
                        if (!$util.isInteger(message.code))
                            return "code: integer expected";
                    if (message.reason != null && message.hasOwnProperty("reason"))
                        if (!$util.isString(message.reason))
                            return "reason: string expected";
                    if (message.reconnect != null && message.hasOwnProperty("reconnect"))
                        if (typeof message.reconnect !== "boolean")
                            return "reconnect: boolean expected";
                    return null;
                };

                /**
                 * Gets the default type url for Disconnect
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Disconnect
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Disconnect.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Disconnect";
                };

                return Disconnect;
            })();

            protocol.Refresh = (function() {

                /**
                 * Properties of a Refresh.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IRefresh
                 * @property {boolean|null} [expires] Refresh expires
                 * @property {number|null} [ttl] Refresh ttl
                 */

                /**
                 * Constructs a new Refresh.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a Refresh.
                 * @implements IRefresh
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IRefresh=} [properties] Properties to set
                 */
                function Refresh(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Refresh expires.
                 * @member {boolean} expires
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @instance
                 */
                Refresh.prototype.expires = false;

                /**
                 * Refresh ttl.
                 * @member {number} ttl
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @instance
                 */
                Refresh.prototype.ttl = 0;

                /**
                 * Encodes the specified Refresh message. Does not implicitly {@link centrifugal.centrifuge.protocol.Refresh.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRefresh} message Refresh message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Refresh.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                        writer.uint32(/* id 1, wireType 0 =*/8).bool(message.expires);
                    if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.ttl);
                    return writer;
                };

                /**
                 * Encodes the specified Refresh message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Refresh.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRefresh} message Refresh message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Refresh.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a Refresh message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.Refresh} Refresh
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Refresh.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.Refresh();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.expires = reader.bool();
                                break;
                            }
                        case 2: {
                                message.ttl = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a Refresh message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.Refresh} Refresh
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Refresh.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a Refresh message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                Refresh.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.expires != null && message.hasOwnProperty("expires"))
                        if (typeof message.expires !== "boolean")
                            return "expires: boolean expected";
                    if (message.ttl != null && message.hasOwnProperty("ttl"))
                        if (!$util.isInteger(message.ttl))
                            return "ttl: integer expected";
                    return null;
                };

                /**
                 * Gets the default type url for Refresh
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.Refresh
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                Refresh.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.Refresh";
                };

                return Refresh;
            })();

            protocol.ConnectRequest = (function() {

                /**
                 * Properties of a ConnectRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IConnectRequest
                 * @property {string|null} [token] ConnectRequest token
                 * @property {Uint8Array|null} [data] ConnectRequest data
                 * @property {Object.<string,centrifugal.centrifuge.protocol.ISubscribeRequest>|null} [subs] ConnectRequest subs
                 * @property {string|null} [name] ConnectRequest name
                 * @property {string|null} [version] ConnectRequest version
                 * @property {Object.<string,string>|null} [headers] ConnectRequest headers
                 */

                /**
                 * Constructs a new ConnectRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a ConnectRequest.
                 * @implements IConnectRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IConnectRequest=} [properties] Properties to set
                 */
                function ConnectRequest(properties) {
                    this.subs = {};
                    this.headers = {};
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ConnectRequest token.
                 * @member {string} token
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @instance
                 */
                ConnectRequest.prototype.token = "";

                /**
                 * ConnectRequest data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @instance
                 */
                ConnectRequest.prototype.data = $util.newBuffer([]);

                /**
                 * ConnectRequest subs.
                 * @member {Object.<string,centrifugal.centrifuge.protocol.ISubscribeRequest>} subs
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @instance
                 */
                ConnectRequest.prototype.subs = $util.emptyObject;

                /**
                 * ConnectRequest name.
                 * @member {string} name
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @instance
                 */
                ConnectRequest.prototype.name = "";

                /**
                 * ConnectRequest version.
                 * @member {string} version
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @instance
                 */
                ConnectRequest.prototype.version = "";

                /**
                 * ConnectRequest headers.
                 * @member {Object.<string,string>} headers
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @instance
                 */
                ConnectRequest.prototype.headers = $util.emptyObject;

                /**
                 * Encodes the specified ConnectRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IConnectRequest} message ConnectRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ConnectRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.token);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.data);
                    if (message.subs != null && Object.hasOwnProperty.call(message, "subs"))
                        for (let keys = Object.keys(message.subs), i = 0; i < keys.length; ++i) {
                            writer.uint32(/* id 3, wireType 2 =*/26).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                            $root.centrifugal.centrifuge.protocol.SubscribeRequest.encode(message.subs[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                        }
                    if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                        writer.uint32(/* id 4, wireType 2 =*/34).string(message.name);
                    if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 5, wireType 2 =*/42).string(message.version);
                    if (message.headers != null && Object.hasOwnProperty.call(message, "headers"))
                        for (let keys = Object.keys(message.headers), i = 0; i < keys.length; ++i)
                            writer.uint32(/* id 6, wireType 2 =*/50).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]).uint32(/* id 2, wireType 2 =*/18).string(message.headers[keys[i]]).ldelim();
                    return writer;
                };

                /**
                 * Encodes the specified ConnectRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IConnectRequest} message ConnectRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ConnectRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a ConnectRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.ConnectRequest} ConnectRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ConnectRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.ConnectRequest(), key, value;
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.token = reader.string();
                                break;
                            }
                        case 2: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 3: {
                                if (message.subs === $util.emptyObject)
                                    message.subs = {};
                                let end2 = reader.uint32() + reader.pos;
                                key = "";
                                value = null;
                                while (reader.pos < end2) {
                                    let tag2 = reader.uint32();
                                    switch (tag2 >>> 3) {
                                    case 1:
                                        key = reader.string();
                                        break;
                                    case 2:
                                        value = $root.centrifugal.centrifuge.protocol.SubscribeRequest.decode(reader, reader.uint32());
                                        break;
                                    default:
                                        reader.skipType(tag2 & 7);
                                        break;
                                    }
                                }
                                message.subs[key] = value;
                                break;
                            }
                        case 4: {
                                message.name = reader.string();
                                break;
                            }
                        case 5: {
                                message.version = reader.string();
                                break;
                            }
                        case 6: {
                                if (message.headers === $util.emptyObject)
                                    message.headers = {};
                                let end2 = reader.uint32() + reader.pos;
                                key = "";
                                value = "";
                                while (reader.pos < end2) {
                                    let tag2 = reader.uint32();
                                    switch (tag2 >>> 3) {
                                    case 1:
                                        key = reader.string();
                                        break;
                                    case 2:
                                        value = reader.string();
                                        break;
                                    default:
                                        reader.skipType(tag2 & 7);
                                        break;
                                    }
                                }
                                message.headers[key] = value;
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a ConnectRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.ConnectRequest} ConnectRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ConnectRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a ConnectRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ConnectRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.token != null && message.hasOwnProperty("token"))
                        if (!$util.isString(message.token))
                            return "token: string expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.subs != null && message.hasOwnProperty("subs")) {
                        if (!$util.isObject(message.subs))
                            return "subs: object expected";
                        let key = Object.keys(message.subs);
                        for (let i = 0; i < key.length; ++i) {
                            let error = $root.centrifugal.centrifuge.protocol.SubscribeRequest.verify(message.subs[key[i]]);
                            if (error)
                                return "subs." + error;
                        }
                    }
                    if (message.name != null && message.hasOwnProperty("name"))
                        if (!$util.isString(message.name))
                            return "name: string expected";
                    if (message.version != null && message.hasOwnProperty("version"))
                        if (!$util.isString(message.version))
                            return "version: string expected";
                    if (message.headers != null && message.hasOwnProperty("headers")) {
                        if (!$util.isObject(message.headers))
                            return "headers: object expected";
                        let key = Object.keys(message.headers);
                        for (let i = 0; i < key.length; ++i)
                            if (!$util.isString(message.headers[key[i]]))
                                return "headers: string{k:string} expected";
                    }
                    return null;
                };

                /**
                 * Gets the default type url for ConnectRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.ConnectRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                ConnectRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.ConnectRequest";
                };

                return ConnectRequest;
            })();

            protocol.ConnectResult = (function() {

                /**
                 * Properties of a ConnectResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IConnectResult
                 * @property {string|null} [client] ConnectResult client
                 * @property {string|null} [version] ConnectResult version
                 * @property {boolean|null} [expires] ConnectResult expires
                 * @property {number|null} [ttl] ConnectResult ttl
                 * @property {Uint8Array|null} [data] ConnectResult data
                 * @property {Object.<string,centrifugal.centrifuge.protocol.ISubscribeResult>|null} [subs] ConnectResult subs
                 * @property {number|null} [ping] ConnectResult ping
                 * @property {boolean|null} [pong] ConnectResult pong
                 * @property {string|null} [session] ConnectResult session
                 * @property {string|null} [node] ConnectResult node
                 * @property {number|Long|null} [time] ConnectResult time
                 */

                /**
                 * Constructs a new ConnectResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a ConnectResult.
                 * @implements IConnectResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IConnectResult=} [properties] Properties to set
                 */
                function ConnectResult(properties) {
                    this.subs = {};
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ConnectResult client.
                 * @member {string} client
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.client = "";

                /**
                 * ConnectResult version.
                 * @member {string} version
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.version = "";

                /**
                 * ConnectResult expires.
                 * @member {boolean} expires
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.expires = false;

                /**
                 * ConnectResult ttl.
                 * @member {number} ttl
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.ttl = 0;

                /**
                 * ConnectResult data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.data = $util.newBuffer([]);

                /**
                 * ConnectResult subs.
                 * @member {Object.<string,centrifugal.centrifuge.protocol.ISubscribeResult>} subs
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.subs = $util.emptyObject;

                /**
                 * ConnectResult ping.
                 * @member {number} ping
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.ping = 0;

                /**
                 * ConnectResult pong.
                 * @member {boolean} pong
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.pong = false;

                /**
                 * ConnectResult session.
                 * @member {string} session
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.session = "";

                /**
                 * ConnectResult node.
                 * @member {string} node
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.node = "";

                /**
                 * ConnectResult time.
                 * @member {number|Long} time
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @instance
                 */
                ConnectResult.prototype.time = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

                /**
                 * Encodes the specified ConnectResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IConnectResult} message ConnectResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ConnectResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.client != null && Object.hasOwnProperty.call(message, "client"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.client);
                    if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.version);
                    if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.expires);
                    if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                        writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.ttl);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.data);
                    if (message.subs != null && Object.hasOwnProperty.call(message, "subs"))
                        for (let keys = Object.keys(message.subs), i = 0; i < keys.length; ++i) {
                            writer.uint32(/* id 6, wireType 2 =*/50).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                            $root.centrifugal.centrifuge.protocol.SubscribeResult.encode(message.subs[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                        }
                    if (message.ping != null && Object.hasOwnProperty.call(message, "ping"))
                        writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.ping);
                    if (message.pong != null && Object.hasOwnProperty.call(message, "pong"))
                        writer.uint32(/* id 8, wireType 0 =*/64).bool(message.pong);
                    if (message.session != null && Object.hasOwnProperty.call(message, "session"))
                        writer.uint32(/* id 9, wireType 2 =*/74).string(message.session);
                    if (message.node != null && Object.hasOwnProperty.call(message, "node"))
                        writer.uint32(/* id 10, wireType 2 =*/82).string(message.node);
                    if (message.time != null && Object.hasOwnProperty.call(message, "time"))
                        writer.uint32(/* id 11, wireType 0 =*/88).int64(message.time);
                    return writer;
                };

                /**
                 * Encodes the specified ConnectResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IConnectResult} message ConnectResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ConnectResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a ConnectResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.ConnectResult} ConnectResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ConnectResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.ConnectResult(), key, value;
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.client = reader.string();
                                break;
                            }
                        case 2: {
                                message.version = reader.string();
                                break;
                            }
                        case 3: {
                                message.expires = reader.bool();
                                break;
                            }
                        case 4: {
                                message.ttl = reader.uint32();
                                break;
                            }
                        case 5: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 6: {
                                if (message.subs === $util.emptyObject)
                                    message.subs = {};
                                let end2 = reader.uint32() + reader.pos;
                                key = "";
                                value = null;
                                while (reader.pos < end2) {
                                    let tag2 = reader.uint32();
                                    switch (tag2 >>> 3) {
                                    case 1:
                                        key = reader.string();
                                        break;
                                    case 2:
                                        value = $root.centrifugal.centrifuge.protocol.SubscribeResult.decode(reader, reader.uint32());
                                        break;
                                    default:
                                        reader.skipType(tag2 & 7);
                                        break;
                                    }
                                }
                                message.subs[key] = value;
                                break;
                            }
                        case 7: {
                                message.ping = reader.uint32();
                                break;
                            }
                        case 8: {
                                message.pong = reader.bool();
                                break;
                            }
                        case 9: {
                                message.session = reader.string();
                                break;
                            }
                        case 10: {
                                message.node = reader.string();
                                break;
                            }
                        case 11: {
                                message.time = reader.int64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a ConnectResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.ConnectResult} ConnectResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ConnectResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a ConnectResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                ConnectResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.client != null && message.hasOwnProperty("client"))
                        if (!$util.isString(message.client))
                            return "client: string expected";
                    if (message.version != null && message.hasOwnProperty("version"))
                        if (!$util.isString(message.version))
                            return "version: string expected";
                    if (message.expires != null && message.hasOwnProperty("expires"))
                        if (typeof message.expires !== "boolean")
                            return "expires: boolean expected";
                    if (message.ttl != null && message.hasOwnProperty("ttl"))
                        if (!$util.isInteger(message.ttl))
                            return "ttl: integer expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.subs != null && message.hasOwnProperty("subs")) {
                        if (!$util.isObject(message.subs))
                            return "subs: object expected";
                        let key = Object.keys(message.subs);
                        for (let i = 0; i < key.length; ++i) {
                            let error = $root.centrifugal.centrifuge.protocol.SubscribeResult.verify(message.subs[key[i]]);
                            if (error)
                                return "subs." + error;
                        }
                    }
                    if (message.ping != null && message.hasOwnProperty("ping"))
                        if (!$util.isInteger(message.ping))
                            return "ping: integer expected";
                    if (message.pong != null && message.hasOwnProperty("pong"))
                        if (typeof message.pong !== "boolean")
                            return "pong: boolean expected";
                    if (message.session != null && message.hasOwnProperty("session"))
                        if (!$util.isString(message.session))
                            return "session: string expected";
                    if (message.node != null && message.hasOwnProperty("node"))
                        if (!$util.isString(message.node))
                            return "node: string expected";
                    if (message.time != null && message.hasOwnProperty("time"))
                        if (!$util.isInteger(message.time) && !(message.time && $util.isInteger(message.time.low) && $util.isInteger(message.time.high)))
                            return "time: integer|Long expected";
                    return null;
                };

                /**
                 * Gets the default type url for ConnectResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.ConnectResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                ConnectResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.ConnectResult";
                };

                return ConnectResult;
            })();

            protocol.RefreshRequest = (function() {

                /**
                 * Properties of a RefreshRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IRefreshRequest
                 * @property {string|null} [token] RefreshRequest token
                 */

                /**
                 * Constructs a new RefreshRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a RefreshRequest.
                 * @implements IRefreshRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IRefreshRequest=} [properties] Properties to set
                 */
                function RefreshRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * RefreshRequest token.
                 * @member {string} token
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @instance
                 */
                RefreshRequest.prototype.token = "";

                /**
                 * Encodes the specified RefreshRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRefreshRequest} message RefreshRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RefreshRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.token);
                    return writer;
                };

                /**
                 * Encodes the specified RefreshRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRefreshRequest} message RefreshRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RefreshRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a RefreshRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.RefreshRequest} RefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RefreshRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.RefreshRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.token = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a RefreshRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.RefreshRequest} RefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RefreshRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a RefreshRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                RefreshRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.token != null && message.hasOwnProperty("token"))
                        if (!$util.isString(message.token))
                            return "token: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for RefreshRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.RefreshRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                RefreshRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.RefreshRequest";
                };

                return RefreshRequest;
            })();

            protocol.RefreshResult = (function() {

                /**
                 * Properties of a RefreshResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IRefreshResult
                 * @property {string|null} [client] RefreshResult client
                 * @property {string|null} [version] RefreshResult version
                 * @property {boolean|null} [expires] RefreshResult expires
                 * @property {number|null} [ttl] RefreshResult ttl
                 */

                /**
                 * Constructs a new RefreshResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a RefreshResult.
                 * @implements IRefreshResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IRefreshResult=} [properties] Properties to set
                 */
                function RefreshResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * RefreshResult client.
                 * @member {string} client
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @instance
                 */
                RefreshResult.prototype.client = "";

                /**
                 * RefreshResult version.
                 * @member {string} version
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @instance
                 */
                RefreshResult.prototype.version = "";

                /**
                 * RefreshResult expires.
                 * @member {boolean} expires
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @instance
                 */
                RefreshResult.prototype.expires = false;

                /**
                 * RefreshResult ttl.
                 * @member {number} ttl
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @instance
                 */
                RefreshResult.prototype.ttl = 0;

                /**
                 * Encodes the specified RefreshResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRefreshResult} message RefreshResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RefreshResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.client != null && Object.hasOwnProperty.call(message, "client"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.client);
                    if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.version);
                    if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.expires);
                    if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                        writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.ttl);
                    return writer;
                };

                /**
                 * Encodes the specified RefreshResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRefreshResult} message RefreshResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RefreshResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a RefreshResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.RefreshResult} RefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RefreshResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.RefreshResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.client = reader.string();
                                break;
                            }
                        case 2: {
                                message.version = reader.string();
                                break;
                            }
                        case 3: {
                                message.expires = reader.bool();
                                break;
                            }
                        case 4: {
                                message.ttl = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a RefreshResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.RefreshResult} RefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RefreshResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a RefreshResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                RefreshResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.client != null && message.hasOwnProperty("client"))
                        if (!$util.isString(message.client))
                            return "client: string expected";
                    if (message.version != null && message.hasOwnProperty("version"))
                        if (!$util.isString(message.version))
                            return "version: string expected";
                    if (message.expires != null && message.hasOwnProperty("expires"))
                        if (typeof message.expires !== "boolean")
                            return "expires: boolean expected";
                    if (message.ttl != null && message.hasOwnProperty("ttl"))
                        if (!$util.isInteger(message.ttl))
                            return "ttl: integer expected";
                    return null;
                };

                /**
                 * Gets the default type url for RefreshResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.RefreshResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                RefreshResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.RefreshResult";
                };

                return RefreshResult;
            })();

            protocol.SubscribeRequest = (function() {

                /**
                 * Properties of a SubscribeRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ISubscribeRequest
                 * @property {string|null} [channel] SubscribeRequest channel
                 * @property {string|null} [token] SubscribeRequest token
                 * @property {boolean|null} [recover] SubscribeRequest recover
                 * @property {string|null} [epoch] SubscribeRequest epoch
                 * @property {number|Long|null} [offset] SubscribeRequest offset
                 * @property {Uint8Array|null} [data] SubscribeRequest data
                 * @property {boolean|null} [positioned] SubscribeRequest positioned
                 * @property {boolean|null} [recoverable] SubscribeRequest recoverable
                 * @property {boolean|null} [join_leave] SubscribeRequest join_leave
                 * @property {string|null} [delta] SubscribeRequest delta
                 */

                /**
                 * Constructs a new SubscribeRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a SubscribeRequest.
                 * @implements ISubscribeRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ISubscribeRequest=} [properties] Properties to set
                 */
                function SubscribeRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * SubscribeRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.channel = "";

                /**
                 * SubscribeRequest token.
                 * @member {string} token
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.token = "";

                /**
                 * SubscribeRequest recover.
                 * @member {boolean} recover
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.recover = false;

                /**
                 * SubscribeRequest epoch.
                 * @member {string} epoch
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.epoch = "";

                /**
                 * SubscribeRequest offset.
                 * @member {number|Long} offset
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * SubscribeRequest data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.data = $util.newBuffer([]);

                /**
                 * SubscribeRequest positioned.
                 * @member {boolean} positioned
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.positioned = false;

                /**
                 * SubscribeRequest recoverable.
                 * @member {boolean} recoverable
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.recoverable = false;

                /**
                 * SubscribeRequest join_leave.
                 * @member {boolean} join_leave
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.join_leave = false;

                /**
                 * SubscribeRequest delta.
                 * @member {string} delta
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @instance
                 */
                SubscribeRequest.prototype.delta = "";

                /**
                 * Encodes the specified SubscribeRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubscribeRequest} message SubscribeRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubscribeRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.token);
                    if (message.recover != null && Object.hasOwnProperty.call(message, "recover"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.recover);
                    if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                        writer.uint32(/* id 6, wireType 2 =*/50).string(message.epoch);
                    if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                        writer.uint32(/* id 7, wireType 0 =*/56).uint64(message.offset);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 8, wireType 2 =*/66).bytes(message.data);
                    if (message.positioned != null && Object.hasOwnProperty.call(message, "positioned"))
                        writer.uint32(/* id 9, wireType 0 =*/72).bool(message.positioned);
                    if (message.recoverable != null && Object.hasOwnProperty.call(message, "recoverable"))
                        writer.uint32(/* id 10, wireType 0 =*/80).bool(message.recoverable);
                    if (message.join_leave != null && Object.hasOwnProperty.call(message, "join_leave"))
                        writer.uint32(/* id 11, wireType 0 =*/88).bool(message.join_leave);
                    if (message.delta != null && Object.hasOwnProperty.call(message, "delta"))
                        writer.uint32(/* id 12, wireType 2 =*/98).string(message.delta);
                    return writer;
                };

                /**
                 * Encodes the specified SubscribeRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubscribeRequest} message SubscribeRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubscribeRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a SubscribeRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.SubscribeRequest} SubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubscribeRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.SubscribeRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        case 2: {
                                message.token = reader.string();
                                break;
                            }
                        case 3: {
                                message.recover = reader.bool();
                                break;
                            }
                        case 6: {
                                message.epoch = reader.string();
                                break;
                            }
                        case 7: {
                                message.offset = reader.uint64();
                                break;
                            }
                        case 8: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 9: {
                                message.positioned = reader.bool();
                                break;
                            }
                        case 10: {
                                message.recoverable = reader.bool();
                                break;
                            }
                        case 11: {
                                message.join_leave = reader.bool();
                                break;
                            }
                        case 12: {
                                message.delta = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a SubscribeRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.SubscribeRequest} SubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubscribeRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a SubscribeRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SubscribeRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    if (message.token != null && message.hasOwnProperty("token"))
                        if (!$util.isString(message.token))
                            return "token: string expected";
                    if (message.recover != null && message.hasOwnProperty("recover"))
                        if (typeof message.recover !== "boolean")
                            return "recover: boolean expected";
                    if (message.epoch != null && message.hasOwnProperty("epoch"))
                        if (!$util.isString(message.epoch))
                            return "epoch: string expected";
                    if (message.offset != null && message.hasOwnProperty("offset"))
                        if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                            return "offset: integer|Long expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.positioned != null && message.hasOwnProperty("positioned"))
                        if (typeof message.positioned !== "boolean")
                            return "positioned: boolean expected";
                    if (message.recoverable != null && message.hasOwnProperty("recoverable"))
                        if (typeof message.recoverable !== "boolean")
                            return "recoverable: boolean expected";
                    if (message.join_leave != null && message.hasOwnProperty("join_leave"))
                        if (typeof message.join_leave !== "boolean")
                            return "join_leave: boolean expected";
                    if (message.delta != null && message.hasOwnProperty("delta"))
                        if (!$util.isString(message.delta))
                            return "delta: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for SubscribeRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.SubscribeRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                SubscribeRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.SubscribeRequest";
                };

                return SubscribeRequest;
            })();

            protocol.SubscribeResult = (function() {

                /**
                 * Properties of a SubscribeResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ISubscribeResult
                 * @property {boolean|null} [expires] SubscribeResult expires
                 * @property {number|null} [ttl] SubscribeResult ttl
                 * @property {boolean|null} [recoverable] SubscribeResult recoverable
                 * @property {string|null} [epoch] SubscribeResult epoch
                 * @property {Array.<centrifugal.centrifuge.protocol.IPublication>|null} [publications] SubscribeResult publications
                 * @property {boolean|null} [recovered] SubscribeResult recovered
                 * @property {number|Long|null} [offset] SubscribeResult offset
                 * @property {boolean|null} [positioned] SubscribeResult positioned
                 * @property {Uint8Array|null} [data] SubscribeResult data
                 * @property {boolean|null} [was_recovering] SubscribeResult was_recovering
                 * @property {boolean|null} [delta] SubscribeResult delta
                 */

                /**
                 * Constructs a new SubscribeResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a SubscribeResult.
                 * @implements ISubscribeResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ISubscribeResult=} [properties] Properties to set
                 */
                function SubscribeResult(properties) {
                    this.publications = [];
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * SubscribeResult expires.
                 * @member {boolean} expires
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.expires = false;

                /**
                 * SubscribeResult ttl.
                 * @member {number} ttl
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.ttl = 0;

                /**
                 * SubscribeResult recoverable.
                 * @member {boolean} recoverable
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.recoverable = false;

                /**
                 * SubscribeResult epoch.
                 * @member {string} epoch
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.epoch = "";

                /**
                 * SubscribeResult publications.
                 * @member {Array.<centrifugal.centrifuge.protocol.IPublication>} publications
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.publications = $util.emptyArray;

                /**
                 * SubscribeResult recovered.
                 * @member {boolean} recovered
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.recovered = false;

                /**
                 * SubscribeResult offset.
                 * @member {number|Long} offset
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * SubscribeResult positioned.
                 * @member {boolean} positioned
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.positioned = false;

                /**
                 * SubscribeResult data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.data = $util.newBuffer([]);

                /**
                 * SubscribeResult was_recovering.
                 * @member {boolean} was_recovering
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.was_recovering = false;

                /**
                 * SubscribeResult delta.
                 * @member {boolean} delta
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @instance
                 */
                SubscribeResult.prototype.delta = false;

                /**
                 * Encodes the specified SubscribeResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubscribeResult} message SubscribeResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubscribeResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                        writer.uint32(/* id 1, wireType 0 =*/8).bool(message.expires);
                    if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.ttl);
                    if (message.recoverable != null && Object.hasOwnProperty.call(message, "recoverable"))
                        writer.uint32(/* id 3, wireType 0 =*/24).bool(message.recoverable);
                    if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                        writer.uint32(/* id 6, wireType 2 =*/50).string(message.epoch);
                    if (message.publications != null && message.publications.length)
                        for (let i = 0; i < message.publications.length; ++i)
                            $root.centrifugal.centrifuge.protocol.Publication.encode(message.publications[i], writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
                    if (message.recovered != null && Object.hasOwnProperty.call(message, "recovered"))
                        writer.uint32(/* id 8, wireType 0 =*/64).bool(message.recovered);
                    if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                        writer.uint32(/* id 9, wireType 0 =*/72).uint64(message.offset);
                    if (message.positioned != null && Object.hasOwnProperty.call(message, "positioned"))
                        writer.uint32(/* id 10, wireType 0 =*/80).bool(message.positioned);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 11, wireType 2 =*/90).bytes(message.data);
                    if (message.was_recovering != null && Object.hasOwnProperty.call(message, "was_recovering"))
                        writer.uint32(/* id 12, wireType 0 =*/96).bool(message.was_recovering);
                    if (message.delta != null && Object.hasOwnProperty.call(message, "delta"))
                        writer.uint32(/* id 13, wireType 0 =*/104).bool(message.delta);
                    return writer;
                };

                /**
                 * Encodes the specified SubscribeResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubscribeResult} message SubscribeResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubscribeResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a SubscribeResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.SubscribeResult} SubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubscribeResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.SubscribeResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.expires = reader.bool();
                                break;
                            }
                        case 2: {
                                message.ttl = reader.uint32();
                                break;
                            }
                        case 3: {
                                message.recoverable = reader.bool();
                                break;
                            }
                        case 6: {
                                message.epoch = reader.string();
                                break;
                            }
                        case 7: {
                                if (!(message.publications && message.publications.length))
                                    message.publications = [];
                                message.publications.push($root.centrifugal.centrifuge.protocol.Publication.decode(reader, reader.uint32()));
                                break;
                            }
                        case 8: {
                                message.recovered = reader.bool();
                                break;
                            }
                        case 9: {
                                message.offset = reader.uint64();
                                break;
                            }
                        case 10: {
                                message.positioned = reader.bool();
                                break;
                            }
                        case 11: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 12: {
                                message.was_recovering = reader.bool();
                                break;
                            }
                        case 13: {
                                message.delta = reader.bool();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a SubscribeResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.SubscribeResult} SubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubscribeResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a SubscribeResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SubscribeResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.expires != null && message.hasOwnProperty("expires"))
                        if (typeof message.expires !== "boolean")
                            return "expires: boolean expected";
                    if (message.ttl != null && message.hasOwnProperty("ttl"))
                        if (!$util.isInteger(message.ttl))
                            return "ttl: integer expected";
                    if (message.recoverable != null && message.hasOwnProperty("recoverable"))
                        if (typeof message.recoverable !== "boolean")
                            return "recoverable: boolean expected";
                    if (message.epoch != null && message.hasOwnProperty("epoch"))
                        if (!$util.isString(message.epoch))
                            return "epoch: string expected";
                    if (message.publications != null && message.hasOwnProperty("publications")) {
                        if (!Array.isArray(message.publications))
                            return "publications: array expected";
                        for (let i = 0; i < message.publications.length; ++i) {
                            let error = $root.centrifugal.centrifuge.protocol.Publication.verify(message.publications[i]);
                            if (error)
                                return "publications." + error;
                        }
                    }
                    if (message.recovered != null && message.hasOwnProperty("recovered"))
                        if (typeof message.recovered !== "boolean")
                            return "recovered: boolean expected";
                    if (message.offset != null && message.hasOwnProperty("offset"))
                        if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                            return "offset: integer|Long expected";
                    if (message.positioned != null && message.hasOwnProperty("positioned"))
                        if (typeof message.positioned !== "boolean")
                            return "positioned: boolean expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.was_recovering != null && message.hasOwnProperty("was_recovering"))
                        if (typeof message.was_recovering !== "boolean")
                            return "was_recovering: boolean expected";
                    if (message.delta != null && message.hasOwnProperty("delta"))
                        if (typeof message.delta !== "boolean")
                            return "delta: boolean expected";
                    return null;
                };

                /**
                 * Gets the default type url for SubscribeResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.SubscribeResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                SubscribeResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.SubscribeResult";
                };

                return SubscribeResult;
            })();

            protocol.SubRefreshRequest = (function() {

                /**
                 * Properties of a SubRefreshRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ISubRefreshRequest
                 * @property {string|null} [channel] SubRefreshRequest channel
                 * @property {string|null} [token] SubRefreshRequest token
                 */

                /**
                 * Constructs a new SubRefreshRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a SubRefreshRequest.
                 * @implements ISubRefreshRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ISubRefreshRequest=} [properties] Properties to set
                 */
                function SubRefreshRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * SubRefreshRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @instance
                 */
                SubRefreshRequest.prototype.channel = "";

                /**
                 * SubRefreshRequest token.
                 * @member {string} token
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @instance
                 */
                SubRefreshRequest.prototype.token = "";

                /**
                 * Encodes the specified SubRefreshRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubRefreshRequest} message SubRefreshRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubRefreshRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.token);
                    return writer;
                };

                /**
                 * Encodes the specified SubRefreshRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubRefreshRequest} message SubRefreshRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubRefreshRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a SubRefreshRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.SubRefreshRequest} SubRefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubRefreshRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.SubRefreshRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        case 2: {
                                message.token = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a SubRefreshRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.SubRefreshRequest} SubRefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubRefreshRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a SubRefreshRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SubRefreshRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    if (message.token != null && message.hasOwnProperty("token"))
                        if (!$util.isString(message.token))
                            return "token: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for SubRefreshRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                SubRefreshRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.SubRefreshRequest";
                };

                return SubRefreshRequest;
            })();

            protocol.SubRefreshResult = (function() {

                /**
                 * Properties of a SubRefreshResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ISubRefreshResult
                 * @property {boolean|null} [expires] SubRefreshResult expires
                 * @property {number|null} [ttl] SubRefreshResult ttl
                 */

                /**
                 * Constructs a new SubRefreshResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a SubRefreshResult.
                 * @implements ISubRefreshResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ISubRefreshResult=} [properties] Properties to set
                 */
                function SubRefreshResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * SubRefreshResult expires.
                 * @member {boolean} expires
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @instance
                 */
                SubRefreshResult.prototype.expires = false;

                /**
                 * SubRefreshResult ttl.
                 * @member {number} ttl
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @instance
                 */
                SubRefreshResult.prototype.ttl = 0;

                /**
                 * Encodes the specified SubRefreshResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubRefreshResult} message SubRefreshResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubRefreshResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.expires != null && Object.hasOwnProperty.call(message, "expires"))
                        writer.uint32(/* id 1, wireType 0 =*/8).bool(message.expires);
                    if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.ttl);
                    return writer;
                };

                /**
                 * Encodes the specified SubRefreshResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISubRefreshResult} message SubRefreshResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SubRefreshResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a SubRefreshResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.SubRefreshResult} SubRefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubRefreshResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.SubRefreshResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.expires = reader.bool();
                                break;
                            }
                        case 2: {
                                message.ttl = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a SubRefreshResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.SubRefreshResult} SubRefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SubRefreshResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a SubRefreshResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SubRefreshResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.expires != null && message.hasOwnProperty("expires"))
                        if (typeof message.expires !== "boolean")
                            return "expires: boolean expected";
                    if (message.ttl != null && message.hasOwnProperty("ttl"))
                        if (!$util.isInteger(message.ttl))
                            return "ttl: integer expected";
                    return null;
                };

                /**
                 * Gets the default type url for SubRefreshResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.SubRefreshResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                SubRefreshResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.SubRefreshResult";
                };

                return SubRefreshResult;
            })();

            protocol.UnsubscribeRequest = (function() {

                /**
                 * Properties of an UnsubscribeRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IUnsubscribeRequest
                 * @property {string|null} [channel] UnsubscribeRequest channel
                 */

                /**
                 * Constructs a new UnsubscribeRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents an UnsubscribeRequest.
                 * @implements IUnsubscribeRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribeRequest=} [properties] Properties to set
                 */
                function UnsubscribeRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * UnsubscribeRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @instance
                 */
                UnsubscribeRequest.prototype.channel = "";

                /**
                 * Encodes the specified UnsubscribeRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribeRequest} message UnsubscribeRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UnsubscribeRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    return writer;
                };

                /**
                 * Encodes the specified UnsubscribeRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribeRequest} message UnsubscribeRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UnsubscribeRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an UnsubscribeRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.UnsubscribeRequest} UnsubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UnsubscribeRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.UnsubscribeRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an UnsubscribeRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.UnsubscribeRequest} UnsubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UnsubscribeRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an UnsubscribeRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                UnsubscribeRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for UnsubscribeRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                UnsubscribeRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.UnsubscribeRequest";
                };

                return UnsubscribeRequest;
            })();

            protocol.UnsubscribeResult = (function() {

                /**
                 * Properties of an UnsubscribeResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IUnsubscribeResult
                 */

                /**
                 * Constructs a new UnsubscribeResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents an UnsubscribeResult.
                 * @implements IUnsubscribeResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribeResult=} [properties] Properties to set
                 */
                function UnsubscribeResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified UnsubscribeResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribeResult} message UnsubscribeResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UnsubscribeResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Encodes the specified UnsubscribeResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IUnsubscribeResult} message UnsubscribeResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                UnsubscribeResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes an UnsubscribeResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.UnsubscribeResult} UnsubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UnsubscribeResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.UnsubscribeResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes an UnsubscribeResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.UnsubscribeResult} UnsubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                UnsubscribeResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies an UnsubscribeResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                UnsubscribeResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    return null;
                };

                /**
                 * Gets the default type url for UnsubscribeResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.UnsubscribeResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                UnsubscribeResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.UnsubscribeResult";
                };

                return UnsubscribeResult;
            })();

            protocol.PublishRequest = (function() {

                /**
                 * Properties of a PublishRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPublishRequest
                 * @property {string|null} [channel] PublishRequest channel
                 * @property {Uint8Array|null} [data] PublishRequest data
                 */

                /**
                 * Constructs a new PublishRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PublishRequest.
                 * @implements IPublishRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPublishRequest=} [properties] Properties to set
                 */
                function PublishRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * PublishRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @instance
                 */
                PublishRequest.prototype.channel = "";

                /**
                 * PublishRequest data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @instance
                 */
                PublishRequest.prototype.data = $util.newBuffer([]);

                /**
                 * Encodes the specified PublishRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPublishRequest} message PublishRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PublishRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified PublishRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPublishRequest} message PublishRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PublishRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PublishRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PublishRequest} PublishRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PublishRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PublishRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        case 2: {
                                message.data = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PublishRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PublishRequest} PublishRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PublishRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PublishRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PublishRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for PublishRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PublishRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PublishRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PublishRequest";
                };

                return PublishRequest;
            })();

            protocol.PublishResult = (function() {

                /**
                 * Properties of a PublishResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPublishResult
                 */

                /**
                 * Constructs a new PublishResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PublishResult.
                 * @implements IPublishResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPublishResult=} [properties] Properties to set
                 */
                function PublishResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified PublishResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PublishResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPublishResult} message PublishResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PublishResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Encodes the specified PublishResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PublishResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPublishResult} message PublishResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PublishResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PublishResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PublishResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PublishResult} PublishResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PublishResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PublishResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PublishResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PublishResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PublishResult} PublishResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PublishResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PublishResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PublishResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PublishResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    return null;
                };

                /**
                 * Gets the default type url for PublishResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PublishResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PublishResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PublishResult";
                };

                return PublishResult;
            })();

            protocol.PresenceRequest = (function() {

                /**
                 * Properties of a PresenceRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPresenceRequest
                 * @property {string|null} [channel] PresenceRequest channel
                 */

                /**
                 * Constructs a new PresenceRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PresenceRequest.
                 * @implements IPresenceRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPresenceRequest=} [properties] Properties to set
                 */
                function PresenceRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * PresenceRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @instance
                 */
                PresenceRequest.prototype.channel = "";

                /**
                 * Encodes the specified PresenceRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceRequest} message PresenceRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    return writer;
                };

                /**
                 * Encodes the specified PresenceRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceRequest} message PresenceRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PresenceRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PresenceRequest} PresenceRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PresenceRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PresenceRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PresenceRequest} PresenceRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PresenceRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PresenceRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for PresenceRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PresenceRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PresenceRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PresenceRequest";
                };

                return PresenceRequest;
            })();

            protocol.PresenceResult = (function() {

                /**
                 * Properties of a PresenceResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPresenceResult
                 * @property {Object.<string,centrifugal.centrifuge.protocol.IClientInfo>|null} [presence] PresenceResult presence
                 */

                /**
                 * Constructs a new PresenceResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PresenceResult.
                 * @implements IPresenceResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPresenceResult=} [properties] Properties to set
                 */
                function PresenceResult(properties) {
                    this.presence = {};
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * PresenceResult presence.
                 * @member {Object.<string,centrifugal.centrifuge.protocol.IClientInfo>} presence
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @instance
                 */
                PresenceResult.prototype.presence = $util.emptyObject;

                /**
                 * Encodes the specified PresenceResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceResult} message PresenceResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.presence != null && Object.hasOwnProperty.call(message, "presence"))
                        for (let keys = Object.keys(message.presence), i = 0; i < keys.length; ++i) {
                            writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                            $root.centrifugal.centrifuge.protocol.ClientInfo.encode(message.presence[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                        }
                    return writer;
                };

                /**
                 * Encodes the specified PresenceResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceResult} message PresenceResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PresenceResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PresenceResult} PresenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PresenceResult(), key, value;
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                if (message.presence === $util.emptyObject)
                                    message.presence = {};
                                let end2 = reader.uint32() + reader.pos;
                                key = "";
                                value = null;
                                while (reader.pos < end2) {
                                    let tag2 = reader.uint32();
                                    switch (tag2 >>> 3) {
                                    case 1:
                                        key = reader.string();
                                        break;
                                    case 2:
                                        value = $root.centrifugal.centrifuge.protocol.ClientInfo.decode(reader, reader.uint32());
                                        break;
                                    default:
                                        reader.skipType(tag2 & 7);
                                        break;
                                    }
                                }
                                message.presence[key] = value;
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PresenceResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PresenceResult} PresenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PresenceResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PresenceResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.presence != null && message.hasOwnProperty("presence")) {
                        if (!$util.isObject(message.presence))
                            return "presence: object expected";
                        let key = Object.keys(message.presence);
                        for (let i = 0; i < key.length; ++i) {
                            let error = $root.centrifugal.centrifuge.protocol.ClientInfo.verify(message.presence[key[i]]);
                            if (error)
                                return "presence." + error;
                        }
                    }
                    return null;
                };

                /**
                 * Gets the default type url for PresenceResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PresenceResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PresenceResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PresenceResult";
                };

                return PresenceResult;
            })();

            protocol.PresenceStatsRequest = (function() {

                /**
                 * Properties of a PresenceStatsRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPresenceStatsRequest
                 * @property {string|null} [channel] PresenceStatsRequest channel
                 */

                /**
                 * Constructs a new PresenceStatsRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PresenceStatsRequest.
                 * @implements IPresenceStatsRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPresenceStatsRequest=} [properties] Properties to set
                 */
                function PresenceStatsRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * PresenceStatsRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @instance
                 */
                PresenceStatsRequest.prototype.channel = "";

                /**
                 * Encodes the specified PresenceStatsRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceStatsRequest} message PresenceStatsRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceStatsRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    return writer;
                };

                /**
                 * Encodes the specified PresenceStatsRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceStatsRequest} message PresenceStatsRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceStatsRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PresenceStatsRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PresenceStatsRequest} PresenceStatsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceStatsRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PresenceStatsRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PresenceStatsRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PresenceStatsRequest} PresenceStatsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceStatsRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PresenceStatsRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PresenceStatsRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for PresenceStatsRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PresenceStatsRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PresenceStatsRequest";
                };

                return PresenceStatsRequest;
            })();

            protocol.PresenceStatsResult = (function() {

                /**
                 * Properties of a PresenceStatsResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPresenceStatsResult
                 * @property {number|null} [num_clients] PresenceStatsResult num_clients
                 * @property {number|null} [num_users] PresenceStatsResult num_users
                 */

                /**
                 * Constructs a new PresenceStatsResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PresenceStatsResult.
                 * @implements IPresenceStatsResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPresenceStatsResult=} [properties] Properties to set
                 */
                function PresenceStatsResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * PresenceStatsResult num_clients.
                 * @member {number} num_clients
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @instance
                 */
                PresenceStatsResult.prototype.num_clients = 0;

                /**
                 * PresenceStatsResult num_users.
                 * @member {number} num_users
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @instance
                 */
                PresenceStatsResult.prototype.num_users = 0;

                /**
                 * Encodes the specified PresenceStatsResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceStatsResult} message PresenceStatsResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceStatsResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.num_clients != null && Object.hasOwnProperty.call(message, "num_clients"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.num_clients);
                    if (message.num_users != null && Object.hasOwnProperty.call(message, "num_users"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.num_users);
                    return writer;
                };

                /**
                 * Encodes the specified PresenceStatsResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPresenceStatsResult} message PresenceStatsResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PresenceStatsResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PresenceStatsResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PresenceStatsResult} PresenceStatsResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceStatsResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PresenceStatsResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.num_clients = reader.uint32();
                                break;
                            }
                        case 2: {
                                message.num_users = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PresenceStatsResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PresenceStatsResult} PresenceStatsResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PresenceStatsResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PresenceStatsResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PresenceStatsResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.num_clients != null && message.hasOwnProperty("num_clients"))
                        if (!$util.isInteger(message.num_clients))
                            return "num_clients: integer expected";
                    if (message.num_users != null && message.hasOwnProperty("num_users"))
                        if (!$util.isInteger(message.num_users))
                            return "num_users: integer expected";
                    return null;
                };

                /**
                 * Gets the default type url for PresenceStatsResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PresenceStatsResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PresenceStatsResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PresenceStatsResult";
                };

                return PresenceStatsResult;
            })();

            protocol.StreamPosition = (function() {

                /**
                 * Properties of a StreamPosition.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IStreamPosition
                 * @property {number|Long|null} [offset] StreamPosition offset
                 * @property {string|null} [epoch] StreamPosition epoch
                 */

                /**
                 * Constructs a new StreamPosition.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a StreamPosition.
                 * @implements IStreamPosition
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IStreamPosition=} [properties] Properties to set
                 */
                function StreamPosition(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * StreamPosition offset.
                 * @member {number|Long} offset
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @instance
                 */
                StreamPosition.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * StreamPosition epoch.
                 * @member {string} epoch
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @instance
                 */
                StreamPosition.prototype.epoch = "";

                /**
                 * Encodes the specified StreamPosition message. Does not implicitly {@link centrifugal.centrifuge.protocol.StreamPosition.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IStreamPosition} message StreamPosition message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                StreamPosition.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.offset);
                    if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.epoch);
                    return writer;
                };

                /**
                 * Encodes the specified StreamPosition message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.StreamPosition.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IStreamPosition} message StreamPosition message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                StreamPosition.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a StreamPosition message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.StreamPosition} StreamPosition
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                StreamPosition.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.StreamPosition();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.offset = reader.uint64();
                                break;
                            }
                        case 2: {
                                message.epoch = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a StreamPosition message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.StreamPosition} StreamPosition
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                StreamPosition.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a StreamPosition message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                StreamPosition.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.offset != null && message.hasOwnProperty("offset"))
                        if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                            return "offset: integer|Long expected";
                    if (message.epoch != null && message.hasOwnProperty("epoch"))
                        if (!$util.isString(message.epoch))
                            return "epoch: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for StreamPosition
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.StreamPosition
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                StreamPosition.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.StreamPosition";
                };

                return StreamPosition;
            })();

            protocol.HistoryRequest = (function() {

                /**
                 * Properties of a HistoryRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IHistoryRequest
                 * @property {string|null} [channel] HistoryRequest channel
                 * @property {number|null} [limit] HistoryRequest limit
                 * @property {centrifugal.centrifuge.protocol.IStreamPosition|null} [since] HistoryRequest since
                 * @property {boolean|null} [reverse] HistoryRequest reverse
                 */

                /**
                 * Constructs a new HistoryRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a HistoryRequest.
                 * @implements IHistoryRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IHistoryRequest=} [properties] Properties to set
                 */
                function HistoryRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * HistoryRequest channel.
                 * @member {string} channel
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @instance
                 */
                HistoryRequest.prototype.channel = "";

                /**
                 * HistoryRequest limit.
                 * @member {number} limit
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @instance
                 */
                HistoryRequest.prototype.limit = 0;

                /**
                 * HistoryRequest since.
                 * @member {centrifugal.centrifuge.protocol.IStreamPosition|null|undefined} since
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @instance
                 */
                HistoryRequest.prototype.since = null;

                /**
                 * HistoryRequest reverse.
                 * @member {boolean} reverse
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @instance
                 */
                HistoryRequest.prototype.reverse = false;

                /**
                 * Encodes the specified HistoryRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IHistoryRequest} message HistoryRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                HistoryRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.channel != null && Object.hasOwnProperty.call(message, "channel"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.channel);
                    if (message.limit != null && Object.hasOwnProperty.call(message, "limit"))
                        writer.uint32(/* id 7, wireType 0 =*/56).int32(message.limit);
                    if (message.since != null && Object.hasOwnProperty.call(message, "since"))
                        $root.centrifugal.centrifuge.protocol.StreamPosition.encode(message.since, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
                    if (message.reverse != null && Object.hasOwnProperty.call(message, "reverse"))
                        writer.uint32(/* id 9, wireType 0 =*/72).bool(message.reverse);
                    return writer;
                };

                /**
                 * Encodes the specified HistoryRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IHistoryRequest} message HistoryRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                HistoryRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a HistoryRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.HistoryRequest} HistoryRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                HistoryRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.HistoryRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.channel = reader.string();
                                break;
                            }
                        case 7: {
                                message.limit = reader.int32();
                                break;
                            }
                        case 8: {
                                message.since = $root.centrifugal.centrifuge.protocol.StreamPosition.decode(reader, reader.uint32());
                                break;
                            }
                        case 9: {
                                message.reverse = reader.bool();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a HistoryRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.HistoryRequest} HistoryRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                HistoryRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a HistoryRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                HistoryRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.channel != null && message.hasOwnProperty("channel"))
                        if (!$util.isString(message.channel))
                            return "channel: string expected";
                    if (message.limit != null && message.hasOwnProperty("limit"))
                        if (!$util.isInteger(message.limit))
                            return "limit: integer expected";
                    if (message.since != null && message.hasOwnProperty("since")) {
                        let error = $root.centrifugal.centrifuge.protocol.StreamPosition.verify(message.since);
                        if (error)
                            return "since." + error;
                    }
                    if (message.reverse != null && message.hasOwnProperty("reverse"))
                        if (typeof message.reverse !== "boolean")
                            return "reverse: boolean expected";
                    return null;
                };

                /**
                 * Gets the default type url for HistoryRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.HistoryRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                HistoryRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.HistoryRequest";
                };

                return HistoryRequest;
            })();

            protocol.HistoryResult = (function() {

                /**
                 * Properties of a HistoryResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IHistoryResult
                 * @property {Array.<centrifugal.centrifuge.protocol.IPublication>|null} [publications] HistoryResult publications
                 * @property {string|null} [epoch] HistoryResult epoch
                 * @property {number|Long|null} [offset] HistoryResult offset
                 */

                /**
                 * Constructs a new HistoryResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a HistoryResult.
                 * @implements IHistoryResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IHistoryResult=} [properties] Properties to set
                 */
                function HistoryResult(properties) {
                    this.publications = [];
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * HistoryResult publications.
                 * @member {Array.<centrifugal.centrifuge.protocol.IPublication>} publications
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @instance
                 */
                HistoryResult.prototype.publications = $util.emptyArray;

                /**
                 * HistoryResult epoch.
                 * @member {string} epoch
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @instance
                 */
                HistoryResult.prototype.epoch = "";

                /**
                 * HistoryResult offset.
                 * @member {number|Long} offset
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @instance
                 */
                HistoryResult.prototype.offset = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

                /**
                 * Encodes the specified HistoryResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IHistoryResult} message HistoryResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                HistoryResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.publications != null && message.publications.length)
                        for (let i = 0; i < message.publications.length; ++i)
                            $root.centrifugal.centrifuge.protocol.Publication.encode(message.publications[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.epoch);
                    if (message.offset != null && Object.hasOwnProperty.call(message, "offset"))
                        writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.offset);
                    return writer;
                };

                /**
                 * Encodes the specified HistoryResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IHistoryResult} message HistoryResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                HistoryResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a HistoryResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.HistoryResult} HistoryResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                HistoryResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.HistoryResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                if (!(message.publications && message.publications.length))
                                    message.publications = [];
                                message.publications.push($root.centrifugal.centrifuge.protocol.Publication.decode(reader, reader.uint32()));
                                break;
                            }
                        case 2: {
                                message.epoch = reader.string();
                                break;
                            }
                        case 3: {
                                message.offset = reader.uint64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a HistoryResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.HistoryResult} HistoryResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                HistoryResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a HistoryResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                HistoryResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.publications != null && message.hasOwnProperty("publications")) {
                        if (!Array.isArray(message.publications))
                            return "publications: array expected";
                        for (let i = 0; i < message.publications.length; ++i) {
                            let error = $root.centrifugal.centrifuge.protocol.Publication.verify(message.publications[i]);
                            if (error)
                                return "publications." + error;
                        }
                    }
                    if (message.epoch != null && message.hasOwnProperty("epoch"))
                        if (!$util.isString(message.epoch))
                            return "epoch: string expected";
                    if (message.offset != null && message.hasOwnProperty("offset"))
                        if (!$util.isInteger(message.offset) && !(message.offset && $util.isInteger(message.offset.low) && $util.isInteger(message.offset.high)))
                            return "offset: integer|Long expected";
                    return null;
                };

                /**
                 * Gets the default type url for HistoryResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.HistoryResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                HistoryResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.HistoryResult";
                };

                return HistoryResult;
            })();

            protocol.PingRequest = (function() {

                /**
                 * Properties of a PingRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPingRequest
                 */

                /**
                 * Constructs a new PingRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PingRequest.
                 * @implements IPingRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPingRequest=} [properties] Properties to set
                 */
                function PingRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified PingRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PingRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PingRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPingRequest} message PingRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PingRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Encodes the specified PingRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PingRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PingRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPingRequest} message PingRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PingRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PingRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PingRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PingRequest} PingRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PingRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PingRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PingRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PingRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PingRequest} PingRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PingRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PingRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PingRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PingRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    return null;
                };

                /**
                 * Gets the default type url for PingRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PingRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PingRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PingRequest";
                };

                return PingRequest;
            })();

            protocol.PingResult = (function() {

                /**
                 * Properties of a PingResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IPingResult
                 */

                /**
                 * Constructs a new PingResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a PingResult.
                 * @implements IPingResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IPingResult=} [properties] Properties to set
                 */
                function PingResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified PingResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PingResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.PingResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPingResult} message PingResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PingResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Encodes the specified PingResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PingResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PingResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IPingResult} message PingResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PingResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a PingResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.PingResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.PingResult} PingResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PingResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.PingResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a PingResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.PingResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.PingResult} PingResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PingResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a PingResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.PingResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                PingResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    return null;
                };

                /**
                 * Gets the default type url for PingResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.PingResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                PingResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.PingResult";
                };

                return PingResult;
            })();

            protocol.RPCRequest = (function() {

                /**
                 * Properties of a RPCRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IRPCRequest
                 * @property {Uint8Array|null} [data] RPCRequest data
                 * @property {string|null} [method] RPCRequest method
                 */

                /**
                 * Constructs a new RPCRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a RPCRequest.
                 * @implements IRPCRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IRPCRequest=} [properties] Properties to set
                 */
                function RPCRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * RPCRequest data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @instance
                 */
                RPCRequest.prototype.data = $util.newBuffer([]);

                /**
                 * RPCRequest method.
                 * @member {string} method
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @instance
                 */
                RPCRequest.prototype.method = "";

                /**
                 * Encodes the specified RPCRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRPCRequest} message RPCRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RPCRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    if (message.method != null && Object.hasOwnProperty.call(message, "method"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.method);
                    return writer;
                };

                /**
                 * Encodes the specified RPCRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRPCRequest} message RPCRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RPCRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a RPCRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.RPCRequest} RPCRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RPCRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.RPCRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.data = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.method = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a RPCRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.RPCRequest} RPCRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RPCRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a RPCRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                RPCRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    if (message.method != null && message.hasOwnProperty("method"))
                        if (!$util.isString(message.method))
                            return "method: string expected";
                    return null;
                };

                /**
                 * Gets the default type url for RPCRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.RPCRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                RPCRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.RPCRequest";
                };

                return RPCRequest;
            })();

            protocol.RPCResult = (function() {

                /**
                 * Properties of a RPCResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface IRPCResult
                 * @property {Uint8Array|null} [data] RPCResult data
                 */

                /**
                 * Constructs a new RPCResult.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a RPCResult.
                 * @implements IRPCResult
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.IRPCResult=} [properties] Properties to set
                 */
                function RPCResult(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * RPCResult data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @instance
                 */
                RPCResult.prototype.data = $util.newBuffer([]);

                /**
                 * Encodes the specified RPCResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCResult.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRPCResult} message RPCResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RPCResult.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified RPCResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCResult.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @static
                 * @param {centrifugal.centrifuge.protocol.IRPCResult} message RPCResult message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                RPCResult.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a RPCResult message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.RPCResult} RPCResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RPCResult.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.RPCResult();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.data = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a RPCResult message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.RPCResult} RPCResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                RPCResult.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a RPCResult message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                RPCResult.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for RPCResult
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.RPCResult
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                RPCResult.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.RPCResult";
                };

                return RPCResult;
            })();

            protocol.SendRequest = (function() {

                /**
                 * Properties of a SendRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @interface ISendRequest
                 * @property {Uint8Array|null} [data] SendRequest data
                 */

                /**
                 * Constructs a new SendRequest.
                 * @memberof centrifugal.centrifuge.protocol
                 * @classdesc Represents a SendRequest.
                 * @implements ISendRequest
                 * @constructor
                 * @param {centrifugal.centrifuge.protocol.ISendRequest=} [properties] Properties to set
                 */
                function SendRequest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * SendRequest data.
                 * @member {Uint8Array} data
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @instance
                 */
                SendRequest.prototype.data = $util.newBuffer([]);

                /**
                 * Encodes the specified SendRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.SendRequest.verify|verify} messages.
                 * @function encode
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISendRequest} message SendRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SendRequest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.data);
                    return writer;
                };

                /**
                 * Encodes the specified SendRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SendRequest.verify|verify} messages.
                 * @function encodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @static
                 * @param {centrifugal.centrifuge.protocol.ISendRequest} message SendRequest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                SendRequest.encodeDelimited = function encodeDelimited(message, writer) {
                    return this.encode(message, writer).ldelim();
                };

                /**
                 * Decodes a SendRequest message from the specified reader or buffer.
                 * @function decode
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {centrifugal.centrifuge.protocol.SendRequest} SendRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SendRequest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.centrifugal.centrifuge.protocol.SendRequest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.data = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Decodes a SendRequest message from the specified reader or buffer, length delimited.
                 * @function decodeDelimited
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @returns {centrifugal.centrifuge.protocol.SendRequest} SendRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                SendRequest.decodeDelimited = function decodeDelimited(reader) {
                    if (!(reader instanceof $Reader))
                        reader = new $Reader(reader);
                    return this.decode(reader, reader.uint32());
                };

                /**
                 * Verifies a SendRequest message.
                 * @function verify
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @static
                 * @param {Object.<string,*>} message Plain object to verify
                 * @returns {string|null} `null` if valid, otherwise the reason why it is not
                 */
                SendRequest.verify = function verify(message) {
                    if (typeof message !== "object" || message === null)
                        return "object expected";
                    if (message.data != null && message.hasOwnProperty("data"))
                        if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                            return "data: buffer expected";
                    return null;
                };

                /**
                 * Gets the default type url for SendRequest
                 * @function getTypeUrl
                 * @memberof centrifugal.centrifuge.protocol.SendRequest
                 * @static
                 * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns {string} The default type url
                 */
                SendRequest.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                    if (typeUrlPrefix === undefined) {
                        typeUrlPrefix = "type.googleapis.com";
                    }
                    return typeUrlPrefix + "/centrifugal.centrifuge.protocol.SendRequest";
                };

                return SendRequest;
            })();

            return protocol;
        })();

        return centrifuge;
    })();

    return centrifugal;
})();

export { $root as default };
