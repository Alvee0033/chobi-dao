import { BillingController } from "./billing.controller";

describe("BillingController UddoktaPay cancellation return", () => {
  it("redirects legacy provider returns to billing without mutating a subscription", async () => {
    const service = { cancelUddoktaCheckout: jest.fn() };
    const controller = new BillingController(service as any);
    const response = { redirect: jest.fn() };
    process.env.APP_BASE_URL = "https://chobidao.example";

    await controller.uddoktapayCancel(response);

    expect(response.redirect).toHaveBeenCalledWith("https://chobidao.example/dashboard/billing?billing=cancelled");
    expect(service.cancelUddoktaCheckout).not.toHaveBeenCalled();
  });
});
