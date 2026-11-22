const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const test = require("node:test");

const { isValidPhone, maskPhone, subscribe, subscribersForTown, unsubscribe } = require("../.test-build/subscribers.js");
const { validateTwilioSignature } = require("../.test-build/twilio.js");

test("la firma de Twilio se valida con HMAC-SHA1 y comparación segura", () => {
  const authToken = "token-de-prueba";
  const url = "https://ejemplo.com/api/whatsapp";
  const params = { Body: "alertas", From: "+549123456789" };
  const data = url + Object.keys(params).sort().map((key) => key + params[key]).join("");
  const signature = createHmac("sha1", authToken).update(data).digest("base64");

  assert.equal(validateTwilioSignature({ signature, url, params, authToken }), true);
  assert.equal(validateTwilioSignature({ signature, url, params, authToken: "otro" }), false);
  assert.equal(validateTwilioSignature({ signature: "invalida", url, params, authToken }), false);
});

test("los suscriptores se normalizan y se filtran por pueblo", () => {
  const phone = "+5493881234567";
  subscribe(phone, "Tilcara");
  assert.equal(isValidPhone(phone), true);
  assert.equal(isValidPhone("123"), false);
  assert.equal(maskPhone(phone), "+549...67");
  assert.equal(subscribersForTown("Tilcara").some((item) => item.phone === phone), true);
  assert.equal(subscribersForTown("Uquía").some((item) => item.phone === phone), false);
  assert.equal(unsubscribe(phone), true);
  assert.equal(subscribersForTown("Tilcara").some((item) => item.phone === phone), false);
});
