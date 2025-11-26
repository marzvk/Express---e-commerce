const { paymentClient } = require('../../config/mercadopago');
const Order = require('../../models/e-commerce/order');
const Key = require('../../models/e-commerce/key');
const { sendOrderConfirmation, sendOrderPending } = require('../../utils/emailService');

exports.mercadopago_webhook = async (req, res) => {
  try {
    console.log('\n\n🎯🎯🎯 WEBHOOK EJECUTADO 🎯🎯🎯');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Query:', req.query);
    console.log('Body:', req.body);

    const { id, topic } = req.query;

    if (!id) {
      console.log('⚠️ Sin ID en query params');
      return res.status(200).json({ received: true });
    }

    console.log(`\n📌 ID: ${id}, Topic: ${topic}`);

    // ========================================
    // SI ES merchant_order, OBTENER EL PAGO
    // ========================================
    let paymentId = id;
    let payment = null;

    if (topic === 'merchant_order') {
      console.log('📦 Es merchant_order, obteniendo pagos...');

      try {
        // Fetch a la merchant_order
        const merchantOrderResponse = await fetch(
          `https://api.mercadopago.com/merchant_orders/${id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!merchantOrderResponse.ok) {
          throw new Error(`HTTP ${merchantOrderResponse.status}`);
        }

        const merchantOrder = await merchantOrderResponse.json();
        console.log('📦 Merchant Order:', {
          id: merchantOrder.id,
          status: merchantOrder.status,
          payments: merchantOrder.payments?.length || 0
        });

        // Buscar el pago aprobado
        if (!merchantOrder.payments || merchantOrder.payments.length === 0) {
          console.log('⚠️ No hay pagos en merchant_order');
          return res.status(200).json({ received: true });
        }

        const approvedPayment = merchantOrder.payments.find(p => p.status === 'approved');

        if (!approvedPayment) {
          console.log('⚠️ No hay pago aprobado en merchant_order');
          return res.status(200).json({ received: true });
        }

        paymentId = approvedPayment.id;
        console.log(`✅ Pago aprobado encontrado: ${paymentId}`);
      } catch (err) {
        console.error('❌ Error obteniendo merchant_order:', err.message);
        return res.status(200).json({ received: true });
      }
    }

    // ========================================
    // OBTENER INFORMACIÓN DEL PAGO
    // ========================================
    console.log(`🔍 Obteniendo pago: ${paymentId}`);

    try {
      payment = await paymentClient.get({ id: paymentId });
    } catch (err) {
      console.error('❌ Error obteniendo pago:', err.message);
      return res.status(200).json({ received: true });
    }

    console.log('💳 Pago obtenido:', {
      id: payment.id,
      status: payment.status,
      amount: payment.transaction_amount
    });

    // ========================================
    // SOLO PROCESAR PAGOS APROBADOS
    // ========================================
    if (payment.status !== 'approved') {
      console.log(`⏭️ Pago con status: ${payment.status} (no es approved)`);
      return res.status(200).json({ received: true });
    }

    console.log('\n✅ ========== PAGO APROBADO ==========');

    // Verificar si la orden ya existe
    const existingOrder = await Order.findOne({ paymentId: paymentId });
    if (existingOrder) {
      console.log('⚠️ Orden ya existe:', existingOrder._id);
      return res.status(200).json({ received: true });
    }

    // Obtener carrito desde metadata
    const cart = JSON.parse(payment.metadata?.cart || '[]');
    const userId = payment.metadata?.user_id;

    if (!userId || !cart.length) {
      console.error('❌ Datos incompletos:', { userId, cartLength: cart.length });
      return res.status(200).json({ received: true });
    }

    console.log('🛒 Carrito:', cart);

    const productsWithKeys = [];

    // Asignar keys
    for (const item of cart) {
      console.log(`🔑 Asignando keys para: ${item.title} (${item.platform})`);

      for (let i = 0; i < item.quantity; i++) {
        const key = await Key.findOneAndUpdate(
          {
            product: item.productId,
            platform: item.platform,
            status: 'available'
          },
          {
            status: 'sold',
            soldAt: new Date(),
            assignedTo: userId
          },
          { new: true }
        );

        if (!key) {
          console.error(`❌ Sin stock: ${item.title} - ${item.platform}`);
          throw new Error(`Sin stock de ${item.title} para ${item.platform}`);
        }

        productsWithKeys.push({
          product: item.productId,
          title: item.title,
          platform: item.platform,
          price: item.price,
          key: key._id
        });
      }
    }

    // Crear orden
    const order = new Order({
      user: userId,
      products: productsWithKeys,
      total: payment.transaction_amount,
      status: 'completed',
      paymentMethod: 'mercadopago',
      paymentId: paymentId,
      paymentDetails: {
        status: payment.status,
        statusDetail: payment.status_detail,
        paymentType: payment.payment_type_id,
        paymentMethod: payment.payment_method_id
      }
    });

    await order.save();
    console.log('✅ Orden creada:', order._id);

    // Actualizar keys con orden
    await Key.updateMany(
      { _id: { $in: productsWithKeys.map(p => p.key) } },
      { order: order._id }
    );

    // Enviar email
    try {
      await sendOrderConfirmation(userId, order._id);
      console.log('📧 Email enviado');
    } catch (emailErr) {
      console.error('⚠️ Error en email:', emailErr.message);
    }

    console.log('✅ WEBHOOK COMPLETADO\n');
    res.status(200).json({ received: true, orderId: order._id });

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    res.status(200).json({ error: err.message });
  }
};
