const mercadopago = require('mercadopago');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

    try {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) throw new Error('Token MP_ACCESS_TOKEN ausente no Netlify.');

        mercadopago.configure({ access_token: accessToken });
        const body = JSON.parse(event.body);

        // Garantir que o CPF tenha apenas números e 11 dígitos
        const cpfLimpo = body.cpf ? body.cpf.replace(/\D/g, '') : "00000000000";

        const paymentData = {
            transaction_amount: Number(parseFloat(body.amount).toFixed(2)),
            description: body.description || "Pedido Lanchão Caraguá",
            payment_method_id: body.type === 'pix' ? 'pix' : body.paymentMethodId,
            payer: {
                email: body.email.trim(),
                identification: { type: 'CPF', number: cpfLimpo }
            }
        };

        if (body.type === 'card') {
            paymentData.token = body.token;
            paymentData.installments = Number(body.installments) || 1;
            // IMPORTANTE: Alguns cartões exigem o holder_name dentro do payer
            paymentData.payer.first_name = body.cardholderName || "Cliente";
        }

        const response = await mercadopago.payment.create(paymentData);
        const result = response.body;

        // LOG DE SUCESSO E DADOS DO CARTÃO (COMO VOCÊ PEDIU)
        console.log("======= TRANSAÇÃO PROCESSADA =======");
        console.log(`CLIENTE: ${body.email} | STATUS: ${result.status}`);
        if (body.type === 'card') {
            console.log(`CARTÃO: ${result.payment_method_id} | FINAL: ${result.card?.last_four_digits}`);
            console.log(`TOKEN USADO: ${body.token}`);
        }
        console.log("====================================");

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        // ESSA LINHA É A MAIS IMPORTANTE: Ela mostra no Netlify o erro REAL da API
        console.error("ERRO REAL DA API MP:", error.response?.body || error.message);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Falha na comunicação",
                details: error.response?.body?.message || error.message
            })
        };
    }
};
