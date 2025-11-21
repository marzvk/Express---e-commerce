const Product = require('../../models/e-commerce/products');
const Key = require('../../models/e-commerce/key');
const Order = require('../../models/e-commerce/order');
const { preferenceClient, paymentClient } = require('../../config/mercadopago');



// ========================================
// MOSTRAR PÁGINA DE CHECKOUT
// ========================================
exports.checkout_get = async (req, res) => {
  try {
    const cart = req.session.cart || [];

    if (cart.length === 0) {
      req.flash('error_msg', 'Tu carrito está vacío');
      return res.redirect('/cart');
    }

    if (!req.user) {
      req.flash('error_msg', 'Debes iniciar sesión para comprar');
      return res.redirect('/auth/login');
    }

    const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

    
    // ITEMS CORRECTOS PARA MERCADO PAGO    
    const items = cart.map(item => ({
      title: item.title,
      description: `${item.platform} - Digital Key`,
      picture_url: item.image?.url || "https://via.placeholder.com/300x300?text=GameKey",
      category_id: "games",
      quantity: item.quantity,
      unit_price: Number(item.finalPrice.toFixed(2))
    }));

    console.log('🔑 Public Key:', process.env.MP_PUBLIC_KEY);
    console.log('🔑 Access Token:', process.env.MP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Falta');
    console.log('💱 NODE_ENV:', process.env.NODE_ENV);

    
    // PREFERENCIA CORRECTA    
    const preferenceData = {
      items,
      payer: {
        name: process.env.NODE_ENV === "production" ? req.user.username : "TESTUSER3897848066350466353",
        email: process.env.NODE_ENV === "production" ? req.user.email : "test_user_123456@testuser.com",
        identification: {
          type: "DNI",
          number: "12345678"
        }
      },
      back_urls: {
        success: `${process.env.BASE_URL}/checkout/success`,
        failure: `${process.env.BASE_URL}/checkout/failure`,
        pending: `${process.env.BASE_URL}/checkout/pending`
      },
      // auto_return: "approved",
      notification_url: `${process.env.BASE_URL}/webhook/mercadopago`,
      metadata: {
        user_id: req.user._id.toString(),
        cart: JSON.stringify(cart)
      },
      statement_descriptor: "GAMEKEYS STORE",
      external_reference: `order_${Date.now()}`
    };

    console.log("📋 Enviando preferencia:", preferenceData);

    const response = await preferenceClient.create({
      body: preferenceData
    });

    console.log("✅ Preferencia creada:", response.id);

    res.render('checkout/view', {
      title: "Finalizar Compra",
      cart,
      total,
      preferenceId: response.id,
      mpPublicKey: process.env.MP_PUBLIC_KEY
    });

  } catch (err) {
    console.error("❌ Error al crear preferencia:", err);
    req.flash("error_msg", "Error al preparar el pago");
    return res.redirect("/cart");
  }
};



// ========================================
// SUCCESS - PAGO APROBADO
// ========================================
exports.checkout_success = async (req, res) => {
  try {
    const { payment_id, status, external_reference } = req.query;

    if (!payment_id) {
      req.flash('error_msg', 'Pago no encontrado');
      return res.redirect('/cart');
    }

    console.log('🔍 Procesando pago:', payment_id);

    // Verificar si ya existe la orden
    const existingOrder = await Order.findOne({ paymentId: payment_id });
    if (existingOrder) {
      req.flash('info_msg', 'Esta orden ya fue procesada');
      return res.redirect(`/orders/${existingOrder._id}`);
    }

    // ✅ Obtener pago con SDK v2
    const payment = await paymentClient.get({ id: payment_id });

    console.log('💳 Pago obtenido:', {
      id: payment.id,
      status: payment.status,
      amount: payment.transaction_amount
    });

    // Verificar si fue aprobado
    if (payment.status !== 'approved') {
      req.flash('error_msg', 'El pago no fue aprobado');
      return res.redirect('/cart');
    }

    // Obtener carrito desde metadata
    const cart = JSON.parse(payment.metadata?.cart || '[]');
    console.log('🛒 Carrito:', cart);

    const productsWithKeys = [];

    // Asignar keys para cada producto
    for (const item of cart) {
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
            assignedTo: req.user._id
          },
          { new: true }
        );

        if (!key) {
          throw new Error(`Sin stock de ${item.title} para ${item.platform}`);
        }

        console.log(`✅ Key asignada para ${item.title}:`, key._id);

        productsWithKeys.push({
          product: item.productId,
          title: item.title,
          platform: item.platform,
          price: item.price,
          key: key._id
        });
      }
    }

    // Crear orden en BD
    const order = new Order({
      user: req.user._id,
      products: productsWithKeys,
      total: payment.transaction_amount,
      status: 'completed',
      paymentMethod: 'mercadopago',
      paymentId: payment_id,
      paymentDetails: {
        status: payment.status,
        statusDetail: payment.status_detail,
        paymentType: payment.payment_type_id,
        paymentMethod: payment.payment_method_id
      }
    });

    await order.save();
    console.log('✅ Orden creada:', order._id);

    // Actualizar keys con referencia a la orden
    await Key.updateMany(
      { _id: { $in: productsWithKeys.map(p => p.key) } },
      { order: order._id }
    );

    // Limpiar carrito
    req.session.cart = [];

    // TODO: Enviar email con las keys
    req.flash('success_msg', '¡Compra completada! Revisa tu email');
    res.redirect(`/orders/${order._id}`);

  } catch (err) {
    console.error('❌ Error en checkout_success:', err);
    req.flash('error_msg', err.message || 'Error al procesar la orden');
    res.redirect('/cart');
  }
};


// ========================================
// FAILURE - PAGO RECHAZADO
// ========================================
exports.checkout_failure = async (req, res) => {
  console.log('❌ Pago rechazado');
  req.flash('error_msg', 'El pago fue rechazado. Intenta con otro método.');
  res.redirect('/cart');
};


// ========================================
// PENDING - PAGO PENDIENTE
// ========================================
exports.checkout_pending = async (req, res) => {
  console.log('⏳ Pago pendiente');
  req.flash('info_msg', 'Tu pago está pendiente de aprobación. Te notificaremos pronto.');
  res.redirect('/cart');
};




// ========================================
// PROCESAR CHECKOUT (SIMULADO)
// ========================================
exports.checkout_post = async (req, res) => {
  try {
    const cart = req.session.cart || []

    if (cart.length === 0) {
      req.flash('error_msg', 'El carrito esta vacio');
      return res.redirect('/cart');
    }

    const total = cart.reduce((acc, item) => acc + (item.quantity * item.finalPrice), 0);

    // Asignar key a cada producto
    const productsWithKeys = [];

    for (const item of cart) {
      // busqueda key disponible
      const key = await Key.findOneAndUpdate(
        {
          product: item.productId,
          platform: item.platform,
          status: 'available'
        },
        {
          status: 'sold',
          soldAt: new Date(),
          assignedTo: req.user._id
        },
        { new: true }
      );

      if (!key) {
        throw new Error(`Sin stock de ${item.title} para ${item.platform}`);
      }

      productsWithKeys.push({
        product: item.productId,
        platform: item.platform,
        title: item.title,
        price: item.finalPrice,
        key: key._id
      });
    }

    // Orden 
    const order = new Order({
      user: req.user._id,
      products: productsWithKeys,
      total: total,
      status: 'completed',
      paymentMethod: 'simulated'
    });

    await order.save();

    // Actualizar referencia de order en las keys(filtro, accion)
    await Key.updateMany(
      { _id: { $in: productsWithKeys.map(p => p.key) } },
      { order: order._id }
    );

    req.session.cart = [];

    req.flash('success_msg', '¡Compra exitosa! Revisa tus keys');
    res.redirect(`/orders/${order._id}`);

  } catch (err) {
    console.error(err);
    req.flash('error_msg', err.message || 'Error al procesar la compra');
    res.redirect('/cart');
  }
};
