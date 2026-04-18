const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// Configure o Access Token do Mercado Pago
// Obtenha em: https://www.mercadopago.com.br/developers/panel
// Use token de teste ou produção
mercadopago.configure({
  access_token: 'TEST-1975123236868508-041718-e04014705b9ed72ea126e55013c54ad9-2285612518'
});

app.post('/create-preference', async (req, res) => {
  try {
    const { items, payer, payment_methods, external_reference, description, metadata } = req.body;

    const preference = {
      items: items,
      payer: payer,
      payment_methods: payment_methods || {
        installments: 6,
        excluded_payment_methods: [],
        excluded_payment_types: []
      },
      external_reference: external_reference || `pedido_${Date.now()}`,
      description: description || 'Pedido Lanchão Caraguá',
      metadata: metadata || {},
      back_urls: {
        success: 'https://seudominio.com/sucesso',  // URL após pagamento aprovado
        failure: 'https://seudominio.com/falha',
        pending: 'https://seudominio.com/pendente'
      },
      auto_return: 'approved',
      notification_url: 'https://seudominio.com/webhook' // opcional
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.listen(3000, () => console.log('Backend Mercado Pago rodando na porta 3000'));