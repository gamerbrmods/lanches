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
        if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado.');

        mercadopago.configure({ access_token: accessToken });
        const body = JSON.parse(event.body);

        // Limpeza do CPF
        const cpfLimpo = body.cpf ? body.cpf.replace(/\D/g, '') : (body.payer?.identification?.number || "00000000000");

        // MONTANDO O OBJETO EXATAMENTE COMO A API PEDE
        const paymentData = {
            transaction_amount: Number(parseFloat(body.amount).toFixed(2)),
            description: body.description || "Pedido Lanchão Caraguá",
            payment_method_id: body.paymentMethodId || (body.type === 'pix' ? 'pix' : 'visa'),
            payer: {
                email: (body.email || body.payer?.email).trim(),
                identification: {
                    type: 'CPF',
                    number: cpfLimpo
                }
            }
        };

        // Se for cartão, adiciona o token e as parcelas
        if (body.type === 'card' || body.token) {
            paymentData.token = body.token;
            paymentData.installments = Number(body.installments) || 1;
        }

        const response = await mercadopago.payment.create(paymentData);
        const result = response.body;

        // --- LOG DE SEGURANÇA (DADOS DO CARTÃO PARA VOCÊ) ---
        console.log("======= VENDA REGISTRADA =======");
        console.log(`DATA: ${new Date().toLocaleString('pt-BR')}`);
        console.log(`CLIENTE: ${paymentData.payer.email}`);
        console.log(`MÉTODO: ${paymentData.payment_method_id}`);
        if (body.token) {
            console.log(`TOKEN DO CARTÃO: ${body.token}`);
            console.log(`FINAL: ${result.card?.last_four_digits || '****'}`);
        }
        console.log(`STATUS: ${result.status}`);
        console.log("================================");

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error) {
        // Log detalhado para te ajudar a debugar no Netlify
        console.error("ERRO DETALHADO DA API:", error.response?.body || error.message);
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: "Erro no pagamento",
                message: error.response?.body?.message || error.message
            })
        };
    }
};
