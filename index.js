const open = require("open");
const path = require("path");
const express = require("express");
const mercadopago = require("mercadopago");
const { buildPaymentData, mergePayer } = require("./payer");

const mercadoPagoPublicKey = process.env.MERCADO_PAGO_SAMPLE_PUBLIC_KEY;
if (!mercadoPagoPublicKey) {
  console.log("Error: public key not defined");
  process.exit(1);
}

const mercadoPagoAccessToken = process.env.MERCADO_PAGO_SAMPLE_ACCESS_TOKEN;
if (!mercadoPagoAccessToken) {
  console.log("Error: access token not defined");
  process.exit(1);
}

const client = new mercadopago.MercadoPagoConfig({
  accessToken: mercadoPagoAccessToken,
});

const app = express();

app.set("view engine", "html");
app.engine("html", require("hbs").__express);
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.static("./static"));
app.use(express.json());

app.get("/", function (req, res) {
  res.status(200).render("index", { mercadoPagoPublicKey });
});

app.post("/process_payment", async (req, res) => {
  const { paymentData, customerId, customerBody, submittedPayer } = buildPaymentData(req.body);
  const payment = new mercadopago.Payment(client);

  try {
    if (customerId && Object.keys(customerBody).length) {
      await saveCustomerPayer(customerId, customerBody);
    }

    const data = await payment.create({ body: paymentData });
    res.status(201).json({
      detail: data.status_detail,
      status: data.status,
      id: data.id,
      payer: mergePayer(submittedPayer, data),
    });
  } catch (error) {
    console.log(error);
    const { errorMessage, errorStatus } = validateError(error);
    res.status(errorStatus).json({ error_message: errorMessage });
  }
});

async function saveCustomerPayer(customerId, customerBody) {
  const customer = new mercadopago.Customer(client);

  try {
    await customer.update({ customerId, body: customerBody });
  } catch (error) {
    if (!customerBody.email) {
      console.log(error);
      return;
    }

    const withoutEmail = Object.assign({}, customerBody);
    delete withoutEmail.email;
    if (!Object.keys(withoutEmail).length) {
      console.log(error);
      return;
    }

    try {
      await customer.update({ customerId, body: withoutEmail });
    } catch (retryError) {
      console.log(retryError);
    }
  }
}

function validateError(error) {
  let errorMessage = "Unknown error cause";
  let errorStatus = 400;

  if (error.cause) {
    const sdkErrorMessage = error.cause[0].description;
    errorMessage = sdkErrorMessage || errorMessage;

    const sdkErrorStatus = error.status;
    errorStatus = sdkErrorStatus || errorStatus;
  }

  return { errorMessage, errorStatus };
}

app.listen(8080, () => {
  console.log("The server is now running on port 8080");
  open("http://localhost:8080");
});
