function defined(value) {
  return value !== undefined && value !== null && value !== "";
}

function readIdentification(identification) {
  if (!identification || typeof identification !== "object") return undefined;

  const type = identification.type || identification.docType;
  const number = identification.number || identification.docNumber;
  if (!defined(type) && !defined(number)) return undefined;

  const result = {};
  if (defined(type)) result.type = String(type);
  if (defined(number)) result.number = String(number);
  return result;
}

function readPhone(phone) {
  if (!defined(phone)) return undefined;
  if (typeof phone === "string" || typeof phone === "number") {
    return { number: String(phone) };
  }
  if (typeof phone !== "object") return undefined;

  const areaCode = phone.area_code || phone.areaCode;
  const number = phone.number;
  const extension = phone.extension;
  if (!defined(areaCode) && !defined(number) && !defined(extension)) return undefined;

  const result = {};
  if (defined(areaCode)) result.area_code = String(areaCode);
  if (defined(number)) result.number = String(number);
  if (defined(extension)) result.extension = String(extension);
  return result;
}

function readAddress(address) {
  if (!address || typeof address !== "object") return undefined;

  const zipCode = address.zip_code || address.zipCode;
  const streetName = address.street_name || address.streetName;
  const streetNumber = address.street_number != null ? address.street_number : address.streetNumber;
  const city = address.city;
  const result = {};

  if (defined(zipCode)) result.zip_code = String(zipCode);
  if (defined(streetName)) result.street_name = String(streetName);
  if (defined(streetNumber)) {
    const numeric = Number(streetNumber);
    result.street_number = Number.isNaN(numeric) ? streetNumber : numeric;
  }
  if (defined(city)) result.city = city;

  return Object.keys(result).length ? result : undefined;
}

function buildPayerProfile(payer) {
  const source = payer || {};
  const profile = {
    entity_type: source.entity_type || "individual",
  };

  if (defined(source.email)) profile.email = source.email;
  if (defined(source.first_name)) profile.first_name = source.first_name;
  if (defined(source.last_name)) profile.last_name = source.last_name;

  const identification = readIdentification(source.identification);
  if (identification) profile.identification = identification;

  const phone = readPhone(source.phone);
  if (phone) profile.phone = phone;

  return profile;
}

// Mercado Pago stores only payer.id when the request includes a customer id
// or type "customer", and it discards email, name, identification, and phone.
function buildPaymentPayer(payer) {
  const source = payer || {};
  const profile = buildPayerProfile(source);

  if (defined(source.type) && source.type !== "customer") {
    profile.type = source.type;
  }

  return profile;
}

function buildAdditionalInfoPayer(payer, profile) {
  const source = payer || {};
  const saved = profile || buildPayerProfile(source);
  const additional = {};

  if (saved.first_name) additional.first_name = saved.first_name;
  if (saved.last_name) additional.last_name = saved.last_name;
  if (saved.phone) additional.phone = saved.phone;

  const address = readAddress(source.address);
  if (address) additional.address = address;

  return Object.keys(additional).length ? additional : undefined;
}

function customerUpdateBody(profile) {
  const body = {};
  if (profile.email) body.email = profile.email;
  if (profile.first_name) body.first_name = profile.first_name;
  if (profile.last_name) body.last_name = profile.last_name;
  if (profile.identification) body.identification = profile.identification;
  if (profile.phone) {
    const phone = {};
    if (profile.phone.area_code) phone.area_code = profile.phone.area_code;
    if (profile.phone.number) phone.number = profile.phone.number;
    if (Object.keys(phone).length) body.phone = phone;
  }
  return body;
}

function hasValue(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "object") return Object.keys(value).some((key) => hasValue(value[key]));
  return true;
}

function prefer(primary, fallback) {
  return hasValue(primary) ? primary : fallback;
}

function mergePayer(submitted, payment) {
  const fromPayment = payment && payment.payer ? payment.payer : {};
  const fromAdditional = payment && payment.additional_info && payment.additional_info.payer
    ? payment.additional_info.payer
    : {};

  const merged = {
    id: fromPayment.id,
    entity_type: prefer(fromPayment.entity_type, submitted.entity_type),
    type: fromPayment.type,
    email: prefer(fromPayment.email, submitted.email),
    first_name: prefer(fromPayment.first_name, prefer(fromAdditional.first_name, submitted.first_name)),
    last_name: prefer(fromPayment.last_name, prefer(fromAdditional.last_name, submitted.last_name)),
    identification: prefer(fromPayment.identification, submitted.identification),
    phone: prefer(fromPayment.phone, prefer(fromAdditional.phone, submitted.phone)),
  };

  return Object.keys(merged).reduce((payer, key) => {
    if (hasValue(merged[key])) payer[key] = merged[key];
    return payer;
  }, {});
}

function buildPaymentData(body) {
  const source = body || {};
  const payer = source.payer || {};
  const profile = buildPaymentPayer(payer);
  const additionalPayer = buildAdditionalInfoPayer(payer, profile);
  const paymentData = {
    transaction_amount: Number(
      source.transactionAmount != null ? source.transactionAmount : source.transaction_amount
    ),
    token: source.token,
    description: source.description,
    installments: Number(source.installments),
    payment_method_id: source.paymentMethodId != null ? source.paymentMethodId : source.payment_method_id,
    issuer_id: source.issuerId != null ? source.issuerId : source.issuer_id,
    payer: profile,
  };

  const existingAdditionalInfo = source.additional_info || {};
  if (additionalPayer) {
    paymentData.additional_info = Object.assign({}, existingAdditionalInfo, {
      payer: Object.assign({}, existingAdditionalInfo.payer || {}, additionalPayer),
    });
  } else if (source.additional_info) {
    paymentData.additional_info = source.additional_info;
  }

  return {
    paymentData,
    customerId: defined(payer.id) ? String(payer.id) : undefined,
    customerBody: customerUpdateBody(profile),
    submittedPayer: profile,
  };
}

module.exports = {
  buildPaymentData,
  buildPaymentPayer,
  mergePayer,
};
