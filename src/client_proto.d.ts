import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace centrifugal. */
export namespace centrifugal {

    /** Namespace centrifuge. */
    namespace centrifuge {

        /** Namespace protocol. */
        namespace protocol {

            /** Properties of an Error. */
            interface IError {

                /** Error code */
                code?: (number|null);

                /** Error message */
                message?: (string|null);

                /** Error temporary */
                temporary?: (boolean|null);
            }

            /** Represents an Error. */
            class Error implements IError {

                /**
                 * Constructs a new Error.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IError);

                /** Error code. */
                public code: number;

                /** Error message. */
                public message: string;

                /** Error temporary. */
                public temporary: boolean;

                /**
                 * Encodes the specified Error message. Does not implicitly {@link centrifugal.centrifuge.protocol.Error.verify|verify} messages.
                 * @param message Error message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IError, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Error message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Error.verify|verify} messages.
                 * @param message Error message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IError, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an Error message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Error
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Error;

                /**
                 * Decodes an Error message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Error
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Error;

                /**
                 * Verifies an Error message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Error
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of an EmulationRequest. */
            interface IEmulationRequest {

                /** EmulationRequest node */
                node?: (string|null);

                /** EmulationRequest session */
                session?: (string|null);

                /** EmulationRequest data */
                data?: (Uint8Array|null);
            }

            /** Represents an EmulationRequest. */
            class EmulationRequest implements IEmulationRequest {

                /**
                 * Constructs a new EmulationRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IEmulationRequest);

                /** EmulationRequest node. */
                public node: string;

                /** EmulationRequest session. */
                public session: string;

                /** EmulationRequest data. */
                public data: Uint8Array;

                /**
                 * Encodes the specified EmulationRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.EmulationRequest.verify|verify} messages.
                 * @param message EmulationRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IEmulationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified EmulationRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.EmulationRequest.verify|verify} messages.
                 * @param message EmulationRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IEmulationRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an EmulationRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns EmulationRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.EmulationRequest;

                /**
                 * Decodes an EmulationRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns EmulationRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.EmulationRequest;

                /**
                 * Verifies an EmulationRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for EmulationRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Command. */
            interface ICommand {

                /** Command id */
                id?: (number|null);

                /** Command connect */
                connect?: (centrifugal.centrifuge.protocol.IConnectRequest|null);

                /** Command subscribe */
                subscribe?: (centrifugal.centrifuge.protocol.ISubscribeRequest|null);

                /** Command unsubscribe */
                unsubscribe?: (centrifugal.centrifuge.protocol.IUnsubscribeRequest|null);

                /** Command publish */
                publish?: (centrifugal.centrifuge.protocol.IPublishRequest|null);

                /** Command presence */
                presence?: (centrifugal.centrifuge.protocol.IPresenceRequest|null);

                /** Command presence_stats */
                presence_stats?: (centrifugal.centrifuge.protocol.IPresenceStatsRequest|null);

                /** Command history */
                history?: (centrifugal.centrifuge.protocol.IHistoryRequest|null);

                /** Command ping */
                ping?: (centrifugal.centrifuge.protocol.IPingRequest|null);

                /** Command send */
                send?: (centrifugal.centrifuge.protocol.ISendRequest|null);

                /** Command rpc */
                rpc?: (centrifugal.centrifuge.protocol.IRPCRequest|null);

                /** Command refresh */
                refresh?: (centrifugal.centrifuge.protocol.IRefreshRequest|null);

                /** Command sub_refresh */
                sub_refresh?: (centrifugal.centrifuge.protocol.ISubRefreshRequest|null);
            }

            /** Represents a Command. */
            class Command implements ICommand {

                /**
                 * Constructs a new Command.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ICommand);

                /** Command id. */
                public id: number;

                /** Command connect. */
                public connect?: (centrifugal.centrifuge.protocol.IConnectRequest|null);

                /** Command subscribe. */
                public subscribe?: (centrifugal.centrifuge.protocol.ISubscribeRequest|null);

                /** Command unsubscribe. */
                public unsubscribe?: (centrifugal.centrifuge.protocol.IUnsubscribeRequest|null);

                /** Command publish. */
                public publish?: (centrifugal.centrifuge.protocol.IPublishRequest|null);

                /** Command presence. */
                public presence?: (centrifugal.centrifuge.protocol.IPresenceRequest|null);

                /** Command presence_stats. */
                public presence_stats?: (centrifugal.centrifuge.protocol.IPresenceStatsRequest|null);

                /** Command history. */
                public history?: (centrifugal.centrifuge.protocol.IHistoryRequest|null);

                /** Command ping. */
                public ping?: (centrifugal.centrifuge.protocol.IPingRequest|null);

                /** Command send. */
                public send?: (centrifugal.centrifuge.protocol.ISendRequest|null);

                /** Command rpc. */
                public rpc?: (centrifugal.centrifuge.protocol.IRPCRequest|null);

                /** Command refresh. */
                public refresh?: (centrifugal.centrifuge.protocol.IRefreshRequest|null);

                /** Command sub_refresh. */
                public sub_refresh?: (centrifugal.centrifuge.protocol.ISubRefreshRequest|null);

                /**
                 * Encodes the specified Command message. Does not implicitly {@link centrifugal.centrifuge.protocol.Command.verify|verify} messages.
                 * @param message Command message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Command message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Command.verify|verify} messages.
                 * @param message Command message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Command message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Command
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Command;

                /**
                 * Decodes a Command message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Command
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Command;

                /**
                 * Verifies a Command message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Command
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Reply. */
            interface IReply {

                /** Reply id */
                id?: (number|null);

                /** Reply error */
                error?: (centrifugal.centrifuge.protocol.IError|null);

                /** Reply push */
                push?: (centrifugal.centrifuge.protocol.IPush|null);

                /** Reply connect */
                connect?: (centrifugal.centrifuge.protocol.IConnectResult|null);

                /** Reply subscribe */
                subscribe?: (centrifugal.centrifuge.protocol.ISubscribeResult|null);

                /** Reply unsubscribe */
                unsubscribe?: (centrifugal.centrifuge.protocol.IUnsubscribeResult|null);

                /** Reply publish */
                publish?: (centrifugal.centrifuge.protocol.IPublishResult|null);

                /** Reply presence */
                presence?: (centrifugal.centrifuge.protocol.IPresenceResult|null);

                /** Reply presence_stats */
                presence_stats?: (centrifugal.centrifuge.protocol.IPresenceStatsResult|null);

                /** Reply history */
                history?: (centrifugal.centrifuge.protocol.IHistoryResult|null);

                /** Reply ping */
                ping?: (centrifugal.centrifuge.protocol.IPingResult|null);

                /** Reply rpc */
                rpc?: (centrifugal.centrifuge.protocol.IRPCResult|null);

                /** Reply refresh */
                refresh?: (centrifugal.centrifuge.protocol.IRefreshResult|null);

                /** Reply sub_refresh */
                sub_refresh?: (centrifugal.centrifuge.protocol.ISubRefreshResult|null);
            }

            /** Represents a Reply. */
            class Reply implements IReply {

                /**
                 * Constructs a new Reply.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IReply);

                /** Reply id. */
                public id: number;

                /** Reply error. */
                public error?: (centrifugal.centrifuge.protocol.IError|null);

                /** Reply push. */
                public push?: (centrifugal.centrifuge.protocol.IPush|null);

                /** Reply connect. */
                public connect?: (centrifugal.centrifuge.protocol.IConnectResult|null);

                /** Reply subscribe. */
                public subscribe?: (centrifugal.centrifuge.protocol.ISubscribeResult|null);

                /** Reply unsubscribe. */
                public unsubscribe?: (centrifugal.centrifuge.protocol.IUnsubscribeResult|null);

                /** Reply publish. */
                public publish?: (centrifugal.centrifuge.protocol.IPublishResult|null);

                /** Reply presence. */
                public presence?: (centrifugal.centrifuge.protocol.IPresenceResult|null);

                /** Reply presence_stats. */
                public presence_stats?: (centrifugal.centrifuge.protocol.IPresenceStatsResult|null);

                /** Reply history. */
                public history?: (centrifugal.centrifuge.protocol.IHistoryResult|null);

                /** Reply ping. */
                public ping?: (centrifugal.centrifuge.protocol.IPingResult|null);

                /** Reply rpc. */
                public rpc?: (centrifugal.centrifuge.protocol.IRPCResult|null);

                /** Reply refresh. */
                public refresh?: (centrifugal.centrifuge.protocol.IRefreshResult|null);

                /** Reply sub_refresh. */
                public sub_refresh?: (centrifugal.centrifuge.protocol.ISubRefreshResult|null);

                /**
                 * Encodes the specified Reply message. Does not implicitly {@link centrifugal.centrifuge.protocol.Reply.verify|verify} messages.
                 * @param message Reply message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IReply, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Reply message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Reply.verify|verify} messages.
                 * @param message Reply message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IReply, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Reply message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Reply
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Reply;

                /**
                 * Decodes a Reply message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Reply
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Reply;

                /**
                 * Verifies a Reply message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Reply
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Push. */
            interface IPush {

                /** Push id */
                id?: (number|Long|null);

                /** Push channel */
                channel?: (string|null);

                /** Push pub */
                pub?: (centrifugal.centrifuge.protocol.IPublication|null);

                /** Push join */
                join?: (centrifugal.centrifuge.protocol.IJoin|null);

                /** Push leave */
                leave?: (centrifugal.centrifuge.protocol.ILeave|null);

                /** Push unsubscribe */
                unsubscribe?: (centrifugal.centrifuge.protocol.IUnsubscribe|null);

                /** Push message */
                message?: (centrifugal.centrifuge.protocol.IMessage|null);

                /** Push subscribe */
                subscribe?: (centrifugal.centrifuge.protocol.ISubscribe|null);

                /** Push connect */
                connect?: (centrifugal.centrifuge.protocol.IConnect|null);

                /** Push disconnect */
                disconnect?: (centrifugal.centrifuge.protocol.IDisconnect|null);

                /** Push refresh */
                refresh?: (centrifugal.centrifuge.protocol.IRefresh|null);
            }

            /** Represents a Push. */
            class Push implements IPush {

                /**
                 * Constructs a new Push.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPush);

                /** Push id. */
                public id: (number|Long);

                /** Push channel. */
                public channel: string;

                /** Push pub. */
                public pub?: (centrifugal.centrifuge.protocol.IPublication|null);

                /** Push join. */
                public join?: (centrifugal.centrifuge.protocol.IJoin|null);

                /** Push leave. */
                public leave?: (centrifugal.centrifuge.protocol.ILeave|null);

                /** Push unsubscribe. */
                public unsubscribe?: (centrifugal.centrifuge.protocol.IUnsubscribe|null);

                /** Push message. */
                public message?: (centrifugal.centrifuge.protocol.IMessage|null);

                /** Push subscribe. */
                public subscribe?: (centrifugal.centrifuge.protocol.ISubscribe|null);

                /** Push connect. */
                public connect?: (centrifugal.centrifuge.protocol.IConnect|null);

                /** Push disconnect. */
                public disconnect?: (centrifugal.centrifuge.protocol.IDisconnect|null);

                /** Push refresh. */
                public refresh?: (centrifugal.centrifuge.protocol.IRefresh|null);

                /**
                 * Encodes the specified Push message. Does not implicitly {@link centrifugal.centrifuge.protocol.Push.verify|verify} messages.
                 * @param message Push message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPush, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Push message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Push.verify|verify} messages.
                 * @param message Push message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPush, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Push message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Push
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Push;

                /**
                 * Decodes a Push message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Push
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Push;

                /**
                 * Verifies a Push message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Push
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a ClientInfo. */
            interface IClientInfo {

                /** ClientInfo user */
                user?: (string|null);

                /** ClientInfo client */
                client?: (string|null);

                /** ClientInfo conn_info */
                conn_info?: (Uint8Array|null);

                /** ClientInfo chan_info */
                chan_info?: (Uint8Array|null);
            }

            /** Represents a ClientInfo. */
            class ClientInfo implements IClientInfo {

                /**
                 * Constructs a new ClientInfo.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IClientInfo);

                /** ClientInfo user. */
                public user: string;

                /** ClientInfo client. */
                public client: string;

                /** ClientInfo conn_info. */
                public conn_info: Uint8Array;

                /** ClientInfo chan_info. */
                public chan_info: Uint8Array;

                /**
                 * Encodes the specified ClientInfo message. Does not implicitly {@link centrifugal.centrifuge.protocol.ClientInfo.verify|verify} messages.
                 * @param message ClientInfo message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IClientInfo, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ClientInfo message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.ClientInfo.verify|verify} messages.
                 * @param message ClientInfo message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IClientInfo, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ClientInfo message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ClientInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.ClientInfo;

                /**
                 * Decodes a ClientInfo message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ClientInfo
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.ClientInfo;

                /**
                 * Verifies a ClientInfo message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for ClientInfo
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Publication. */
            interface IPublication {

                /** Publication data */
                data?: (Uint8Array|null);

                /** Publication info */
                info?: (centrifugal.centrifuge.protocol.IClientInfo|null);

                /** Publication offset */
                offset?: (number|Long|null);

                /** Publication tags */
                tags?: ({ [k: string]: string }|null);

                /** Publication delta */
                delta?: (boolean|null);

                /** Publication time */
                time?: (number|Long|null);

                /** Publication channel */
                channel?: (string|null);

                /** Publication meta */
                meta?: (Uint8Array|null);
            }

            /** Represents a Publication. */
            class Publication implements IPublication {

                /**
                 * Constructs a new Publication.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPublication);

                /** Publication data. */
                public data: Uint8Array;

                /** Publication info. */
                public info?: (centrifugal.centrifuge.protocol.IClientInfo|null);

                /** Publication offset. */
                public offset: (number|Long);

                /** Publication tags. */
                public tags: { [k: string]: string };

                /** Publication delta. */
                public delta: boolean;

                /** Publication time. */
                public time: (number|Long);

                /** Publication channel. */
                public channel: string;

                /** Publication meta. */
                public meta: Uint8Array;

                /**
                 * Encodes the specified Publication message. Does not implicitly {@link centrifugal.centrifuge.protocol.Publication.verify|verify} messages.
                 * @param message Publication message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPublication, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Publication message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Publication.verify|verify} messages.
                 * @param message Publication message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPublication, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Publication message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Publication
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Publication;

                /**
                 * Decodes a Publication message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Publication
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Publication;

                /**
                 * Verifies a Publication message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Publication
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Join. */
            interface IJoin {

                /** Join info */
                info?: (centrifugal.centrifuge.protocol.IClientInfo|null);
            }

            /** Represents a Join. */
            class Join implements IJoin {

                /**
                 * Constructs a new Join.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IJoin);

                /** Join info. */
                public info?: (centrifugal.centrifuge.protocol.IClientInfo|null);

                /**
                 * Encodes the specified Join message. Does not implicitly {@link centrifugal.centrifuge.protocol.Join.verify|verify} messages.
                 * @param message Join message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IJoin, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Join message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Join.verify|verify} messages.
                 * @param message Join message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IJoin, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Join message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Join
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Join;

                /**
                 * Decodes a Join message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Join
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Join;

                /**
                 * Verifies a Join message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Join
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Leave. */
            interface ILeave {

                /** Leave info */
                info?: (centrifugal.centrifuge.protocol.IClientInfo|null);
            }

            /** Represents a Leave. */
            class Leave implements ILeave {

                /**
                 * Constructs a new Leave.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ILeave);

                /** Leave info. */
                public info?: (centrifugal.centrifuge.protocol.IClientInfo|null);

                /**
                 * Encodes the specified Leave message. Does not implicitly {@link centrifugal.centrifuge.protocol.Leave.verify|verify} messages.
                 * @param message Leave message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ILeave, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Leave message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Leave.verify|verify} messages.
                 * @param message Leave message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ILeave, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Leave message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Leave
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Leave;

                /**
                 * Decodes a Leave message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Leave
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Leave;

                /**
                 * Verifies a Leave message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Leave
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of an Unsubscribe. */
            interface IUnsubscribe {

                /** Unsubscribe code */
                code?: (number|null);

                /** Unsubscribe reason */
                reason?: (string|null);
            }

            /** Represents an Unsubscribe. */
            class Unsubscribe implements IUnsubscribe {

                /**
                 * Constructs a new Unsubscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IUnsubscribe);

                /** Unsubscribe code. */
                public code: number;

                /** Unsubscribe reason. */
                public reason: string;

                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link centrifugal.centrifuge.protocol.Unsubscribe.verify|verify} messages.
                 * @param message Unsubscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IUnsubscribe, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Unsubscribe message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Unsubscribe.verify|verify} messages.
                 * @param message Unsubscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IUnsubscribe, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Unsubscribe;

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Unsubscribe;

                /**
                 * Verifies an Unsubscribe message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Unsubscribe
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Subscribe. */
            interface ISubscribe {

                /** Subscribe recoverable */
                recoverable?: (boolean|null);

                /** Subscribe epoch */
                epoch?: (string|null);

                /** Subscribe offset */
                offset?: (number|Long|null);

                /** Subscribe positioned */
                positioned?: (boolean|null);

                /** Subscribe data */
                data?: (Uint8Array|null);
            }

            /** Represents a Subscribe. */
            class Subscribe implements ISubscribe {

                /**
                 * Constructs a new Subscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ISubscribe);

                /** Subscribe recoverable. */
                public recoverable: boolean;

                /** Subscribe epoch. */
                public epoch: string;

                /** Subscribe offset. */
                public offset: (number|Long);

                /** Subscribe positioned. */
                public positioned: boolean;

                /** Subscribe data. */
                public data: Uint8Array;

                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link centrifugal.centrifuge.protocol.Subscribe.verify|verify} messages.
                 * @param message Subscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ISubscribe, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Subscribe message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Subscribe.verify|verify} messages.
                 * @param message Subscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ISubscribe, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Subscribe;

                /**
                 * Decodes a Subscribe message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Subscribe;

                /**
                 * Verifies a Subscribe message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Subscribe
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Message. */
            interface IMessage {

                /** Message data */
                data?: (Uint8Array|null);
            }

            /** Represents a Message. */
            class Message implements IMessage {

                /**
                 * Constructs a new Message.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IMessage);

                /** Message data. */
                public data: Uint8Array;

                /**
                 * Encodes the specified Message message. Does not implicitly {@link centrifugal.centrifuge.protocol.Message.verify|verify} messages.
                 * @param message Message message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Message message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Message.verify|verify} messages.
                 * @param message Message message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IMessage, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Message message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Message
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Message;

                /**
                 * Decodes a Message message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Message
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Message;

                /**
                 * Verifies a Message message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Message
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Connect. */
            interface IConnect {

                /** Connect client */
                client?: (string|null);

                /** Connect version */
                version?: (string|null);

                /** Connect data */
                data?: (Uint8Array|null);

                /** Connect subs */
                subs?: ({ [k: string]: centrifugal.centrifuge.protocol.ISubscribeResult }|null);

                /** Connect expires */
                expires?: (boolean|null);

                /** Connect ttl */
                ttl?: (number|null);

                /** Connect ping */
                ping?: (number|null);

                /** Connect pong */
                pong?: (boolean|null);

                /** Connect session */
                session?: (string|null);

                /** Connect node */
                node?: (string|null);

                /** Connect time */
                time?: (number|Long|null);
            }

            /** Represents a Connect. */
            class Connect implements IConnect {

                /**
                 * Constructs a new Connect.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IConnect);

                /** Connect client. */
                public client: string;

                /** Connect version. */
                public version: string;

                /** Connect data. */
                public data: Uint8Array;

                /** Connect subs. */
                public subs: { [k: string]: centrifugal.centrifuge.protocol.ISubscribeResult };

                /** Connect expires. */
                public expires: boolean;

                /** Connect ttl. */
                public ttl: number;

                /** Connect ping. */
                public ping: number;

                /** Connect pong. */
                public pong: boolean;

                /** Connect session. */
                public session: string;

                /** Connect node. */
                public node: string;

                /** Connect time. */
                public time: (number|Long);

                /**
                 * Encodes the specified Connect message. Does not implicitly {@link centrifugal.centrifuge.protocol.Connect.verify|verify} messages.
                 * @param message Connect message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IConnect, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Connect message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Connect.verify|verify} messages.
                 * @param message Connect message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IConnect, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Connect message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Connect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Connect;

                /**
                 * Decodes a Connect message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Connect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Connect;

                /**
                 * Verifies a Connect message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Connect
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Disconnect. */
            interface IDisconnect {

                /** Disconnect code */
                code?: (number|null);

                /** Disconnect reason */
                reason?: (string|null);

                /** Disconnect reconnect */
                reconnect?: (boolean|null);
            }

            /** Represents a Disconnect. */
            class Disconnect implements IDisconnect {

                /**
                 * Constructs a new Disconnect.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IDisconnect);

                /** Disconnect code. */
                public code: number;

                /** Disconnect reason. */
                public reason: string;

                /** Disconnect reconnect. */
                public reconnect: boolean;

                /**
                 * Encodes the specified Disconnect message. Does not implicitly {@link centrifugal.centrifuge.protocol.Disconnect.verify|verify} messages.
                 * @param message Disconnect message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IDisconnect, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Disconnect message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Disconnect.verify|verify} messages.
                 * @param message Disconnect message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IDisconnect, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Disconnect message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Disconnect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Disconnect;

                /**
                 * Decodes a Disconnect message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Disconnect
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Disconnect;

                /**
                 * Verifies a Disconnect message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Disconnect
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a Refresh. */
            interface IRefresh {

                /** Refresh expires */
                expires?: (boolean|null);

                /** Refresh ttl */
                ttl?: (number|null);
            }

            /** Represents a Refresh. */
            class Refresh implements IRefresh {

                /**
                 * Constructs a new Refresh.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IRefresh);

                /** Refresh expires. */
                public expires: boolean;

                /** Refresh ttl. */
                public ttl: number;

                /**
                 * Encodes the specified Refresh message. Does not implicitly {@link centrifugal.centrifuge.protocol.Refresh.verify|verify} messages.
                 * @param message Refresh message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IRefresh, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified Refresh message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.Refresh.verify|verify} messages.
                 * @param message Refresh message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IRefresh, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a Refresh message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Refresh
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.Refresh;

                /**
                 * Decodes a Refresh message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns Refresh
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.Refresh;

                /**
                 * Verifies a Refresh message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for Refresh
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a ConnectRequest. */
            interface IConnectRequest {

                /** ConnectRequest token */
                token?: (string|null);

                /** ConnectRequest data */
                data?: (Uint8Array|null);

                /** ConnectRequest subs */
                subs?: ({ [k: string]: centrifugal.centrifuge.protocol.ISubscribeRequest }|null);

                /** ConnectRequest name */
                name?: (string|null);

                /** ConnectRequest version */
                version?: (string|null);

                /** ConnectRequest headers */
                headers?: ({ [k: string]: string }|null);

                /** ConnectRequest flag */
                flag?: (number|Long|null);
            }

            /** Represents a ConnectRequest. */
            class ConnectRequest implements IConnectRequest {

                /**
                 * Constructs a new ConnectRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IConnectRequest);

                /** ConnectRequest token. */
                public token: string;

                /** ConnectRequest data. */
                public data: Uint8Array;

                /** ConnectRequest subs. */
                public subs: { [k: string]: centrifugal.centrifuge.protocol.ISubscribeRequest };

                /** ConnectRequest name. */
                public name: string;

                /** ConnectRequest version. */
                public version: string;

                /** ConnectRequest headers. */
                public headers: { [k: string]: string };

                /** ConnectRequest flag. */
                public flag: (number|Long);

                /**
                 * Encodes the specified ConnectRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectRequest.verify|verify} messages.
                 * @param message ConnectRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IConnectRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ConnectRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectRequest.verify|verify} messages.
                 * @param message ConnectRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IConnectRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ConnectRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ConnectRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.ConnectRequest;

                /**
                 * Decodes a ConnectRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ConnectRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.ConnectRequest;

                /**
                 * Verifies a ConnectRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for ConnectRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a ConnectResult. */
            interface IConnectResult {

                /** ConnectResult client */
                client?: (string|null);

                /** ConnectResult version */
                version?: (string|null);

                /** ConnectResult expires */
                expires?: (boolean|null);

                /** ConnectResult ttl */
                ttl?: (number|null);

                /** ConnectResult data */
                data?: (Uint8Array|null);

                /** ConnectResult subs */
                subs?: ({ [k: string]: centrifugal.centrifuge.protocol.ISubscribeResult }|null);

                /** ConnectResult ping */
                ping?: (number|null);

                /** ConnectResult pong */
                pong?: (boolean|null);

                /** ConnectResult session */
                session?: (string|null);

                /** ConnectResult node */
                node?: (string|null);

                /** ConnectResult time */
                time?: (number|Long|null);
            }

            /** Represents a ConnectResult. */
            class ConnectResult implements IConnectResult {

                /**
                 * Constructs a new ConnectResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IConnectResult);

                /** ConnectResult client. */
                public client: string;

                /** ConnectResult version. */
                public version: string;

                /** ConnectResult expires. */
                public expires: boolean;

                /** ConnectResult ttl. */
                public ttl: number;

                /** ConnectResult data. */
                public data: Uint8Array;

                /** ConnectResult subs. */
                public subs: { [k: string]: centrifugal.centrifuge.protocol.ISubscribeResult };

                /** ConnectResult ping. */
                public ping: number;

                /** ConnectResult pong. */
                public pong: boolean;

                /** ConnectResult session. */
                public session: string;

                /** ConnectResult node. */
                public node: string;

                /** ConnectResult time. */
                public time: (number|Long);

                /**
                 * Encodes the specified ConnectResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectResult.verify|verify} messages.
                 * @param message ConnectResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IConnectResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified ConnectResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.ConnectResult.verify|verify} messages.
                 * @param message ConnectResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IConnectResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a ConnectResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ConnectResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.ConnectResult;

                /**
                 * Decodes a ConnectResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns ConnectResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.ConnectResult;

                /**
                 * Verifies a ConnectResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for ConnectResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a RefreshRequest. */
            interface IRefreshRequest {

                /** RefreshRequest token */
                token?: (string|null);
            }

            /** Represents a RefreshRequest. */
            class RefreshRequest implements IRefreshRequest {

                /**
                 * Constructs a new RefreshRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IRefreshRequest);

                /** RefreshRequest token. */
                public token: string;

                /**
                 * Encodes the specified RefreshRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshRequest.verify|verify} messages.
                 * @param message RefreshRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IRefreshRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified RefreshRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshRequest.verify|verify} messages.
                 * @param message RefreshRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IRefreshRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a RefreshRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns RefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.RefreshRequest;

                /**
                 * Decodes a RefreshRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns RefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.RefreshRequest;

                /**
                 * Verifies a RefreshRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for RefreshRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a RefreshResult. */
            interface IRefreshResult {

                /** RefreshResult client */
                client?: (string|null);

                /** RefreshResult version */
                version?: (string|null);

                /** RefreshResult expires */
                expires?: (boolean|null);

                /** RefreshResult ttl */
                ttl?: (number|null);
            }

            /** Represents a RefreshResult. */
            class RefreshResult implements IRefreshResult {

                /**
                 * Constructs a new RefreshResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IRefreshResult);

                /** RefreshResult client. */
                public client: string;

                /** RefreshResult version. */
                public version: string;

                /** RefreshResult expires. */
                public expires: boolean;

                /** RefreshResult ttl. */
                public ttl: number;

                /**
                 * Encodes the specified RefreshResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshResult.verify|verify} messages.
                 * @param message RefreshResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IRefreshResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified RefreshResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RefreshResult.verify|verify} messages.
                 * @param message RefreshResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IRefreshResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a RefreshResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns RefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.RefreshResult;

                /**
                 * Decodes a RefreshResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns RefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.RefreshResult;

                /**
                 * Verifies a RefreshResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for RefreshResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SubscribeRequest. */
            interface ISubscribeRequest {

                /** SubscribeRequest channel */
                channel?: (string|null);

                /** SubscribeRequest token */
                token?: (string|null);

                /** SubscribeRequest recover */
                recover?: (boolean|null);

                /** SubscribeRequest epoch */
                epoch?: (string|null);

                /** SubscribeRequest offset */
                offset?: (number|Long|null);

                /** SubscribeRequest data */
                data?: (Uint8Array|null);

                /** SubscribeRequest positioned */
                positioned?: (boolean|null);

                /** SubscribeRequest recoverable */
                recoverable?: (boolean|null);

                /** SubscribeRequest join_leave */
                join_leave?: (boolean|null);

                /** SubscribeRequest delta */
                delta?: (string|null);

                /** SubscribeRequest filter */
                filter?: (string|null);

                /** SubscribeRequest flag */
                flag?: (number|Long|null);
            }

            /** Represents a SubscribeRequest. */
            class SubscribeRequest implements ISubscribeRequest {

                /**
                 * Constructs a new SubscribeRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ISubscribeRequest);

                /** SubscribeRequest channel. */
                public channel: string;

                /** SubscribeRequest token. */
                public token: string;

                /** SubscribeRequest recover. */
                public recover: boolean;

                /** SubscribeRequest epoch. */
                public epoch: string;

                /** SubscribeRequest offset. */
                public offset: (number|Long);

                /** SubscribeRequest data. */
                public data: Uint8Array;

                /** SubscribeRequest positioned. */
                public positioned: boolean;

                /** SubscribeRequest recoverable. */
                public recoverable: boolean;

                /** SubscribeRequest join_leave. */
                public join_leave: boolean;

                /** SubscribeRequest delta. */
                public delta: string;

                /** SubscribeRequest filter. */
                public filter: string;

                /** SubscribeRequest flag. */
                public flag: (number|Long);

                /**
                 * Encodes the specified SubscribeRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeRequest.verify|verify} messages.
                 * @param message SubscribeRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ISubscribeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SubscribeRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeRequest.verify|verify} messages.
                 * @param message SubscribeRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ISubscribeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SubscribeRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.SubscribeRequest;

                /**
                 * Decodes a SubscribeRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.SubscribeRequest;

                /**
                 * Verifies a SubscribeRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for SubscribeRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SubscribeResult. */
            interface ISubscribeResult {

                /** SubscribeResult expires */
                expires?: (boolean|null);

                /** SubscribeResult ttl */
                ttl?: (number|null);

                /** SubscribeResult recoverable */
                recoverable?: (boolean|null);

                /** SubscribeResult epoch */
                epoch?: (string|null);

                /** SubscribeResult publications */
                publications?: (centrifugal.centrifuge.protocol.IPublication[]|null);

                /** SubscribeResult recovered */
                recovered?: (boolean|null);

                /** SubscribeResult offset */
                offset?: (number|Long|null);

                /** SubscribeResult positioned */
                positioned?: (boolean|null);

                /** SubscribeResult data */
                data?: (Uint8Array|null);

                /** SubscribeResult was_recovering */
                was_recovering?: (boolean|null);

                /** SubscribeResult delta */
                delta?: (boolean|null);

                /** SubscribeResult id */
                id?: (number|Long|null);
            }

            /** Represents a SubscribeResult. */
            class SubscribeResult implements ISubscribeResult {

                /**
                 * Constructs a new SubscribeResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ISubscribeResult);

                /** SubscribeResult expires. */
                public expires: boolean;

                /** SubscribeResult ttl. */
                public ttl: number;

                /** SubscribeResult recoverable. */
                public recoverable: boolean;

                /** SubscribeResult epoch. */
                public epoch: string;

                /** SubscribeResult publications. */
                public publications: centrifugal.centrifuge.protocol.IPublication[];

                /** SubscribeResult recovered. */
                public recovered: boolean;

                /** SubscribeResult offset. */
                public offset: (number|Long);

                /** SubscribeResult positioned. */
                public positioned: boolean;

                /** SubscribeResult data. */
                public data: Uint8Array;

                /** SubscribeResult was_recovering. */
                public was_recovering: boolean;

                /** SubscribeResult delta. */
                public delta: boolean;

                /** SubscribeResult id. */
                public id: (number|Long);

                /**
                 * Encodes the specified SubscribeResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeResult.verify|verify} messages.
                 * @param message SubscribeResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ISubscribeResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SubscribeResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubscribeResult.verify|verify} messages.
                 * @param message SubscribeResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ISubscribeResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SubscribeResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.SubscribeResult;

                /**
                 * Decodes a SubscribeResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.SubscribeResult;

                /**
                 * Verifies a SubscribeResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for SubscribeResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SubRefreshRequest. */
            interface ISubRefreshRequest {

                /** SubRefreshRequest channel */
                channel?: (string|null);

                /** SubRefreshRequest token */
                token?: (string|null);
            }

            /** Represents a SubRefreshRequest. */
            class SubRefreshRequest implements ISubRefreshRequest {

                /**
                 * Constructs a new SubRefreshRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ISubRefreshRequest);

                /** SubRefreshRequest channel. */
                public channel: string;

                /** SubRefreshRequest token. */
                public token: string;

                /**
                 * Encodes the specified SubRefreshRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshRequest.verify|verify} messages.
                 * @param message SubRefreshRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ISubRefreshRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SubRefreshRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshRequest.verify|verify} messages.
                 * @param message SubRefreshRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ISubRefreshRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SubRefreshRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SubRefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.SubRefreshRequest;

                /**
                 * Decodes a SubRefreshRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SubRefreshRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.SubRefreshRequest;

                /**
                 * Verifies a SubRefreshRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for SubRefreshRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SubRefreshResult. */
            interface ISubRefreshResult {

                /** SubRefreshResult expires */
                expires?: (boolean|null);

                /** SubRefreshResult ttl */
                ttl?: (number|null);
            }

            /** Represents a SubRefreshResult. */
            class SubRefreshResult implements ISubRefreshResult {

                /**
                 * Constructs a new SubRefreshResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ISubRefreshResult);

                /** SubRefreshResult expires. */
                public expires: boolean;

                /** SubRefreshResult ttl. */
                public ttl: number;

                /**
                 * Encodes the specified SubRefreshResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshResult.verify|verify} messages.
                 * @param message SubRefreshResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ISubRefreshResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SubRefreshResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SubRefreshResult.verify|verify} messages.
                 * @param message SubRefreshResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ISubRefreshResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SubRefreshResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SubRefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.SubRefreshResult;

                /**
                 * Decodes a SubRefreshResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SubRefreshResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.SubRefreshResult;

                /**
                 * Verifies a SubRefreshResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for SubRefreshResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of an UnsubscribeRequest. */
            interface IUnsubscribeRequest {

                /** UnsubscribeRequest channel */
                channel?: (string|null);
            }

            /** Represents an UnsubscribeRequest. */
            class UnsubscribeRequest implements IUnsubscribeRequest {

                /**
                 * Constructs a new UnsubscribeRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IUnsubscribeRequest);

                /** UnsubscribeRequest channel. */
                public channel: string;

                /**
                 * Encodes the specified UnsubscribeRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeRequest.verify|verify} messages.
                 * @param message UnsubscribeRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IUnsubscribeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified UnsubscribeRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeRequest.verify|verify} messages.
                 * @param message UnsubscribeRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IUnsubscribeRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an UnsubscribeRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns UnsubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.UnsubscribeRequest;

                /**
                 * Decodes an UnsubscribeRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns UnsubscribeRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.UnsubscribeRequest;

                /**
                 * Verifies an UnsubscribeRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for UnsubscribeRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of an UnsubscribeResult. */
            interface IUnsubscribeResult {
            }

            /** Represents an UnsubscribeResult. */
            class UnsubscribeResult implements IUnsubscribeResult {

                /**
                 * Constructs a new UnsubscribeResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IUnsubscribeResult);

                /**
                 * Encodes the specified UnsubscribeResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeResult.verify|verify} messages.
                 * @param message UnsubscribeResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IUnsubscribeResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified UnsubscribeResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.UnsubscribeResult.verify|verify} messages.
                 * @param message UnsubscribeResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IUnsubscribeResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes an UnsubscribeResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns UnsubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.UnsubscribeResult;

                /**
                 * Decodes an UnsubscribeResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns UnsubscribeResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.UnsubscribeResult;

                /**
                 * Verifies an UnsubscribeResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for UnsubscribeResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PublishRequest. */
            interface IPublishRequest {

                /** PublishRequest channel */
                channel?: (string|null);

                /** PublishRequest data */
                data?: (Uint8Array|null);
            }

            /** Represents a PublishRequest. */
            class PublishRequest implements IPublishRequest {

                /**
                 * Constructs a new PublishRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPublishRequest);

                /** PublishRequest channel. */
                public channel: string;

                /** PublishRequest data. */
                public data: Uint8Array;

                /**
                 * Encodes the specified PublishRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishRequest.verify|verify} messages.
                 * @param message PublishRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPublishRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PublishRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishRequest.verify|verify} messages.
                 * @param message PublishRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPublishRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PublishRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PublishRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PublishRequest;

                /**
                 * Decodes a PublishRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PublishRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PublishRequest;

                /**
                 * Verifies a PublishRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PublishRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PublishResult. */
            interface IPublishResult {
            }

            /** Represents a PublishResult. */
            class PublishResult implements IPublishResult {

                /**
                 * Constructs a new PublishResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPublishResult);

                /**
                 * Encodes the specified PublishResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishResult.verify|verify} messages.
                 * @param message PublishResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPublishResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PublishResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PublishResult.verify|verify} messages.
                 * @param message PublishResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPublishResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PublishResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PublishResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PublishResult;

                /**
                 * Decodes a PublishResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PublishResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PublishResult;

                /**
                 * Verifies a PublishResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PublishResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PresenceRequest. */
            interface IPresenceRequest {

                /** PresenceRequest channel */
                channel?: (string|null);
            }

            /** Represents a PresenceRequest. */
            class PresenceRequest implements IPresenceRequest {

                /**
                 * Constructs a new PresenceRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPresenceRequest);

                /** PresenceRequest channel. */
                public channel: string;

                /**
                 * Encodes the specified PresenceRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceRequest.verify|verify} messages.
                 * @param message PresenceRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPresenceRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PresenceRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceRequest.verify|verify} messages.
                 * @param message PresenceRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPresenceRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PresenceRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PresenceRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PresenceRequest;

                /**
                 * Decodes a PresenceRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PresenceRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PresenceRequest;

                /**
                 * Verifies a PresenceRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PresenceRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PresenceResult. */
            interface IPresenceResult {

                /** PresenceResult presence */
                presence?: ({ [k: string]: centrifugal.centrifuge.protocol.IClientInfo }|null);
            }

            /** Represents a PresenceResult. */
            class PresenceResult implements IPresenceResult {

                /**
                 * Constructs a new PresenceResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPresenceResult);

                /** PresenceResult presence. */
                public presence: { [k: string]: centrifugal.centrifuge.protocol.IClientInfo };

                /**
                 * Encodes the specified PresenceResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceResult.verify|verify} messages.
                 * @param message PresenceResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPresenceResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PresenceResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceResult.verify|verify} messages.
                 * @param message PresenceResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPresenceResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PresenceResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PresenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PresenceResult;

                /**
                 * Decodes a PresenceResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PresenceResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PresenceResult;

                /**
                 * Verifies a PresenceResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PresenceResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PresenceStatsRequest. */
            interface IPresenceStatsRequest {

                /** PresenceStatsRequest channel */
                channel?: (string|null);
            }

            /** Represents a PresenceStatsRequest. */
            class PresenceStatsRequest implements IPresenceStatsRequest {

                /**
                 * Constructs a new PresenceStatsRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPresenceStatsRequest);

                /** PresenceStatsRequest channel. */
                public channel: string;

                /**
                 * Encodes the specified PresenceStatsRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsRequest.verify|verify} messages.
                 * @param message PresenceStatsRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPresenceStatsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PresenceStatsRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsRequest.verify|verify} messages.
                 * @param message PresenceStatsRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPresenceStatsRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PresenceStatsRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PresenceStatsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PresenceStatsRequest;

                /**
                 * Decodes a PresenceStatsRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PresenceStatsRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PresenceStatsRequest;

                /**
                 * Verifies a PresenceStatsRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PresenceStatsRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PresenceStatsResult. */
            interface IPresenceStatsResult {

                /** PresenceStatsResult num_clients */
                num_clients?: (number|null);

                /** PresenceStatsResult num_users */
                num_users?: (number|null);
            }

            /** Represents a PresenceStatsResult. */
            class PresenceStatsResult implements IPresenceStatsResult {

                /**
                 * Constructs a new PresenceStatsResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPresenceStatsResult);

                /** PresenceStatsResult num_clients. */
                public num_clients: number;

                /** PresenceStatsResult num_users. */
                public num_users: number;

                /**
                 * Encodes the specified PresenceStatsResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsResult.verify|verify} messages.
                 * @param message PresenceStatsResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPresenceStatsResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PresenceStatsResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PresenceStatsResult.verify|verify} messages.
                 * @param message PresenceStatsResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPresenceStatsResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PresenceStatsResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PresenceStatsResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PresenceStatsResult;

                /**
                 * Decodes a PresenceStatsResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PresenceStatsResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PresenceStatsResult;

                /**
                 * Verifies a PresenceStatsResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PresenceStatsResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a StreamPosition. */
            interface IStreamPosition {

                /** StreamPosition offset */
                offset?: (number|Long|null);

                /** StreamPosition epoch */
                epoch?: (string|null);
            }

            /** Represents a StreamPosition. */
            class StreamPosition implements IStreamPosition {

                /**
                 * Constructs a new StreamPosition.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IStreamPosition);

                /** StreamPosition offset. */
                public offset: (number|Long);

                /** StreamPosition epoch. */
                public epoch: string;

                /**
                 * Encodes the specified StreamPosition message. Does not implicitly {@link centrifugal.centrifuge.protocol.StreamPosition.verify|verify} messages.
                 * @param message StreamPosition message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IStreamPosition, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified StreamPosition message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.StreamPosition.verify|verify} messages.
                 * @param message StreamPosition message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IStreamPosition, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a StreamPosition message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns StreamPosition
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.StreamPosition;

                /**
                 * Decodes a StreamPosition message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns StreamPosition
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.StreamPosition;

                /**
                 * Verifies a StreamPosition message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for StreamPosition
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a HistoryRequest. */
            interface IHistoryRequest {

                /** HistoryRequest channel */
                channel?: (string|null);

                /** HistoryRequest limit */
                limit?: (number|null);

                /** HistoryRequest since */
                since?: (centrifugal.centrifuge.protocol.IStreamPosition|null);

                /** HistoryRequest reverse */
                reverse?: (boolean|null);
            }

            /** Represents a HistoryRequest. */
            class HistoryRequest implements IHistoryRequest {

                /**
                 * Constructs a new HistoryRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IHistoryRequest);

                /** HistoryRequest channel. */
                public channel: string;

                /** HistoryRequest limit. */
                public limit: number;

                /** HistoryRequest since. */
                public since?: (centrifugal.centrifuge.protocol.IStreamPosition|null);

                /** HistoryRequest reverse. */
                public reverse: boolean;

                /**
                 * Encodes the specified HistoryRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryRequest.verify|verify} messages.
                 * @param message HistoryRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IHistoryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified HistoryRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryRequest.verify|verify} messages.
                 * @param message HistoryRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IHistoryRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a HistoryRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns HistoryRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.HistoryRequest;

                /**
                 * Decodes a HistoryRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns HistoryRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.HistoryRequest;

                /**
                 * Verifies a HistoryRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for HistoryRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a HistoryResult. */
            interface IHistoryResult {

                /** HistoryResult publications */
                publications?: (centrifugal.centrifuge.protocol.IPublication[]|null);

                /** HistoryResult epoch */
                epoch?: (string|null);

                /** HistoryResult offset */
                offset?: (number|Long|null);
            }

            /** Represents a HistoryResult. */
            class HistoryResult implements IHistoryResult {

                /**
                 * Constructs a new HistoryResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IHistoryResult);

                /** HistoryResult publications. */
                public publications: centrifugal.centrifuge.protocol.IPublication[];

                /** HistoryResult epoch. */
                public epoch: string;

                /** HistoryResult offset. */
                public offset: (number|Long);

                /**
                 * Encodes the specified HistoryResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryResult.verify|verify} messages.
                 * @param message HistoryResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IHistoryResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified HistoryResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.HistoryResult.verify|verify} messages.
                 * @param message HistoryResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IHistoryResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a HistoryResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns HistoryResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.HistoryResult;

                /**
                 * Decodes a HistoryResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns HistoryResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.HistoryResult;

                /**
                 * Verifies a HistoryResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for HistoryResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PingRequest. */
            interface IPingRequest {
            }

            /** Represents a PingRequest. */
            class PingRequest implements IPingRequest {

                /**
                 * Constructs a new PingRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPingRequest);

                /**
                 * Encodes the specified PingRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.PingRequest.verify|verify} messages.
                 * @param message PingRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPingRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PingRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PingRequest.verify|verify} messages.
                 * @param message PingRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPingRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PingRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PingRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PingRequest;

                /**
                 * Decodes a PingRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PingRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PingRequest;

                /**
                 * Verifies a PingRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PingRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a PingResult. */
            interface IPingResult {
            }

            /** Represents a PingResult. */
            class PingResult implements IPingResult {

                /**
                 * Constructs a new PingResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IPingResult);

                /**
                 * Encodes the specified PingResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.PingResult.verify|verify} messages.
                 * @param message PingResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IPingResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified PingResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.PingResult.verify|verify} messages.
                 * @param message PingResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IPingResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a PingResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PingResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.PingResult;

                /**
                 * Decodes a PingResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns PingResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.PingResult;

                /**
                 * Verifies a PingResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for PingResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a RPCRequest. */
            interface IRPCRequest {

                /** RPCRequest data */
                data?: (Uint8Array|null);

                /** RPCRequest method */
                method?: (string|null);
            }

            /** Represents a RPCRequest. */
            class RPCRequest implements IRPCRequest {

                /**
                 * Constructs a new RPCRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IRPCRequest);

                /** RPCRequest data. */
                public data: Uint8Array;

                /** RPCRequest method. */
                public method: string;

                /**
                 * Encodes the specified RPCRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCRequest.verify|verify} messages.
                 * @param message RPCRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IRPCRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified RPCRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCRequest.verify|verify} messages.
                 * @param message RPCRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IRPCRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a RPCRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns RPCRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.RPCRequest;

                /**
                 * Decodes a RPCRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns RPCRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.RPCRequest;

                /**
                 * Verifies a RPCRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for RPCRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a RPCResult. */
            interface IRPCResult {

                /** RPCResult data */
                data?: (Uint8Array|null);
            }

            /** Represents a RPCResult. */
            class RPCResult implements IRPCResult {

                /**
                 * Constructs a new RPCResult.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.IRPCResult);

                /** RPCResult data. */
                public data: Uint8Array;

                /**
                 * Encodes the specified RPCResult message. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCResult.verify|verify} messages.
                 * @param message RPCResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.IRPCResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified RPCResult message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.RPCResult.verify|verify} messages.
                 * @param message RPCResult message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.IRPCResult, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a RPCResult message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns RPCResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.RPCResult;

                /**
                 * Decodes a RPCResult message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns RPCResult
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.RPCResult;

                /**
                 * Verifies a RPCResult message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for RPCResult
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }

            /** Properties of a SendRequest. */
            interface ISendRequest {

                /** SendRequest data */
                data?: (Uint8Array|null);
            }

            /** Represents a SendRequest. */
            class SendRequest implements ISendRequest {

                /**
                 * Constructs a new SendRequest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: centrifugal.centrifuge.protocol.ISendRequest);

                /** SendRequest data. */
                public data: Uint8Array;

                /**
                 * Encodes the specified SendRequest message. Does not implicitly {@link centrifugal.centrifuge.protocol.SendRequest.verify|verify} messages.
                 * @param message SendRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: centrifugal.centrifuge.protocol.ISendRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Encodes the specified SendRequest message, length delimited. Does not implicitly {@link centrifugal.centrifuge.protocol.SendRequest.verify|verify} messages.
                 * @param message SendRequest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encodeDelimited(message: centrifugal.centrifuge.protocol.ISendRequest, writer?: $protobuf.Writer): $protobuf.Writer;

                /**
                 * Decodes a SendRequest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns SendRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): centrifugal.centrifuge.protocol.SendRequest;

                /**
                 * Decodes a SendRequest message from the specified reader or buffer, length delimited.
                 * @param reader Reader or buffer to decode from
                 * @returns SendRequest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): centrifugal.centrifuge.protocol.SendRequest;

                /**
                 * Verifies a SendRequest message.
                 * @param message Plain object to verify
                 * @returns `null` if valid, otherwise the reason why it is not
                 */
                public static verify(message: { [k: string]: any }): (string|null);

                /**
                 * Gets the default type url for SendRequest
                 * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
                 * @returns The default type url
                 */
                public static getTypeUrl(typeUrlPrefix?: string): string;
            }
        }
    }
}
