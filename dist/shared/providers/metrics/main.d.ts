import { Request, Response } from 'express';
declare function getEnvorimentVariables(): {
    apiName: string;
    environment: string;
};
declare const meter: import("@opentelemetry/api").Meter;
export { meter, getEnvorimentVariables };
export declare const metricsHandler: (req: Request, res: Response) => Promise<void>;
