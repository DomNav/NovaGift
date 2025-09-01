import request from "supertest";
import app from "../src/server";

describe("build-xlm-payment", () => {
  it("returns XDR", async () => {
    const res = await request(app)
      .post("/api/wallet/build-xlm-payment")
      .send({
        sourcePublicKey: "GBTWWBOHCFT6MCJYDYRDCOU5XIK4WTLS6ETSWWZSKDH7LOQRR3UBCZLW",
        destination: "GDGPNWY6BTX2OXGEOEJRF7EJ3MSAFHADYTNLGZK6N6GJZYFSFN56VBKO",
        amount: "2",
        memo: "NovaGift",
      });
    expect(res.status).toBe(200);
    expect(typeof res.body.xdr).toBe("string");
  });
});