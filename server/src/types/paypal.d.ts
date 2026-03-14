declare module '@paypal/checkout-server-sdk' {
  namespace core {
    class PayPalHttpClient {
      constructor(environment: SandboxEnvironment | LiveEnvironment);
      execute(request: any): Promise<any>;
    }
    class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    class LiveEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
  }
  namespace orders {
    class OrdersCreateRequest {
      prefer(value: string): void;
      requestBody(body: any): void;
    }
    class OrdersCaptureRequest {
      constructor(orderId: string);
      prefer(value: string): void;
      requestBody(body: any): void;
    }
    class OrdersGetRequest {
      constructor(orderId: string);
    }
  }
  namespace payments {
    class CapturesRefundRequest {
      constructor(captureId: string);
      requestBody(body: any): void;
    }
  }
}

