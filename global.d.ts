declare module "midtrans-client" {
  export interface SnapConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  export interface SnapTransactionResponse {
    token: string;
    redirect_url: string;
  }

  export class Snap {
    constructor(config: SnapConfig);
    createTransaction(parameter: unknown): Promise<SnapTransactionResponse>;
    createTransactionToken(parameter: unknown): Promise<string>;
    createTransactionRedirectUrl(parameter: unknown): Promise<string>;
  }

  const midtransClient: {
    Snap: typeof Snap;
  };

  export default midtransClient;
}