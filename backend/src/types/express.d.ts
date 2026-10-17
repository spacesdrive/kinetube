export {};

declare global {
  namespace Express {
    interface Locals {
      // set by the request context middleware for every request
      requestId: string;
    }
  }
}
