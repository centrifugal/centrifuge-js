import { Centrifuge } from '../centrifuge';
export declare class ProtobufEncoder {
    encodeEmulationRequest(req: any): any;
    encodeCommands(commands: any): any;
}
export declare class ProtobufDecoder {
    decodeReplies(data: any): never[];
    decodeReply(data: any): {
        ok: boolean;
        pos: any;
    } | {
        ok: boolean;
        pos?: undefined;
    };
}
export declare class CentrifugeProtobuf extends Centrifuge {
    _formatOverride(format: any): boolean;
}
