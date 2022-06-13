const mercadoPagoPublicKey = document.getElementById("mercado-pago-public-key").value;
const mercadopago = new MercadoPago(mercadoPagoPublicKey);

function loadCardForm() {
    const productCost = document.getElementById('amount').value;
    const productDescription = document.getElementById('product-description').innerText;
    const payButton = document.getElementById("form-checkout__submit");
    const validationErrorMessages= document.getElementById('validation-error-messages');

    const form = {
        id: "form-checkout",
        cardholderName: {
            id: "form-checkout__cardholderName",
            placeholder: "Holder name",
        },
        cardholderEmail: {
            id: "form-checkout__cardholderEmail",
            placeholder: "E-mail",
        },
        cardNumber: {
            id: "form-checkout__cardNumber",
            placeholder: "Card number",
            style: {
                fontSize: "1rem"
            },
        },
        expirationDate: {
            id: "form-checkout__expirationDate",
            placeholder: "MM/YYYY",
            style: {
                fontSize: "1rem"
            },
        },
        securityCode: {
            id: "form-checkout__securityCode",
            placeholder: "Security code",
            style: {
                fontSize: "1rem"
            },
        },
        installments: {
            id: "form-checkout__installments",
            placeholder: "Installments",
        },
        identificationType: {
            id: "form-checkout__identificationType",
        },
        identificationNumber: {
            id: "form-checkout__identificationNumber",
            placeholder: "Identification number",
        },
        issuer: {
            id: "form-checkout__issuer",
            placeholder: "Issuer",
        },
    };

    const cardForm = mercadopago.cardForm({
        amount: productCost,
        iframe: true,
        form,
        callbacks: {
            onFormMounted: error => {
                if (error)
                    return console.warn("Form Mounted handling error: ", error);
                console.log("Form mounted");
            },
            onSubmit: event => {
                event.preventDefault();
                document.getElementById("loading-message").style.display = "block";

                const {
                    paymentMethodId,
                    issuerId,
                    cardholderEmail: email,
                    amount,
                    token,
                    installments,
                    identificationNumber,
                    identificationType,
                } = cardForm.getCardFormData();

                fetch("/process_payment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        issuerId,
                        paymentMethodId,
                        transactionAmount: Number(amount),
                        installments: Number(installments),
                        description: productDescription,
                        payer: {
                            email,
                            identification: {
                                type: identificationType,
                                number: identificationNumber,
                            },
                        },
                    }),
                })
                    .then(response => {
                        return response.json();
                    })
                    .then(result => {
                        if(!result.hasOwnProperty("error_message")) {
                            document.getElementById("success-response").style.display = "block";
                            document.getElementById("payment-id").innerText = result.id;
                            document.getElementById("payment-status").innerText = result.status;
                            document.getElementById("payment-detail").innerText = result.detail;
                        } else {
                            document.getElementById("error-message").textContent = result.error_message;
                            document.getElementById("fail-response").style.display = "block";
                        }
                        
                        $('.container__payment').fadeOut(500);
                        setTimeout(() => { $('.container__result').show(500).fadeIn(); }, 500);
                    })
                    .catch(error => {
                        alert("Unexpected error\n"+JSON.stringify(error));
                    });
            },
            onFetching: (resource) => {
                console.log("Fetching resource: ", resource);
                payButton.setAttribute('disabled', true);
                return () => {
                    payButton.removeAttribute("disabled");
                };
            },
            onCardTokenReceived: (errorData, token) => {
                if (errorData && errorData.error.fieldErrors.length !== 0) {
                    errorData.error.fieldErrors.forEach(errorMessage => {
                        alert(errorMessage);
                    });
                }

                return token;
            },
            onValidityChange: (error, field) => {
                const input = document.getElementById(form[field].id);
                removeFieldErrorMessages(input, validationErrorMessages);
                addFieldErrorMessages(input, validationErrorMessages, error);
                enableOrDisablePayButton(validationErrorMessages, payButton);
            }
        },
    });
};

function removeFieldErrorMessages(input, validationErrorMessages) {
    Array.from(validationErrorMessages.children).forEach(child => {
        const shouldRemoveChild = child.id.includes(input.id);
        if (shouldRemoveChild) {
            validationErrorMessages.removeChild(child);
        }
    });
}

function addFieldErrorMessages(input, validationErrorMessages, error) {
    if (error) {
        input.classList.add('validation-error');
        error.forEach((e, index) => {
            const p = document.createElement('p');
            p.id = `${input.id}-${index}`;
            p.innerText = e.message;
            validationErrorMessages.appendChild(p);
        });
    } else {
        input.classList.remove('validation-error');
    }
}

function enableOrDisablePayButton(validationErrorMessages, payButton) {
    if (validationErrorMessages.children.length > 0) {
        payButton.setAttribute('disabled', true);
    } else {
        payButton.removeAttribute('disabled');
    }
}

// Handle transitions
document.getElementById('checkout-btn').addEventListener('click', function(){
    $('.container__cart').fadeOut(500);
    setTimeout(() => {
        loadCardForm();
        $('.container__payment').show(500).fadeIn();
    }, 500);
});

document.getElementById('go-back').addEventListener('click', function(){
    $('.container__payment').fadeOut(500);
    setTimeout(() => { $('.container__cart').show(500).fadeIn(); }, 500);
});

// Handle price update
function updatePrice(){
    let quantity = document.getElementById('quantity').value;
    let unitPrice = document.getElementById('unit-price').innerText;
    let amount = parseInt(unitPrice) * parseInt(quantity);

    document.getElementById('cart-total').innerText = '$ ' + amount;
    document.getElementById('summary-price').innerText = '$ ' + unitPrice;
    document.getElementById('summary-quantity').innerText = quantity;
    document.getElementById('summary-total').innerText = '$ ' + amount;
    document.getElementById('amount').value = amount;
};

document.getElementById('quantity').addEventListener('change', updatePrice);
updatePrice();
