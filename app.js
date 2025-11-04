require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

var app = express();
app.set('trust proxy', 1);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((error) => console.error('❌ Error MongoDB:', error));

app.use(helmet.contentSecurityPolicy({
  directives: {
    "img-src": [
      "'self'",
      "cdn.pixabay.com",          // Dominio de Pixabay
      "images.unsplash.com",      // Dominio de Unsplash
      "data:"
    ],
    // "script-src": ["'self'", "cdn.jsdelivr.net", "'unsafe-inline'"],
    // "style-src": ["'self'", "cdn.jsdelivr.net"],
  },
}));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true, // Devuelve cabeceras estándar (RateLimit-Limit, RateLimit-Remaining, Retry-After)
  legacyHeaders: false, // Deshabilita cabeceras X-Rate-Limit-* antiguas
  message: 'Demasiadas peticiones desde esta IP, por favor inténtalo de nuevo después de 15 minutos.',
});
app.use(limiter);

require('./models/user');
require('./models/categoria');
require('./models/post');
require('./models/comentario');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



// ========================================
// CONFIGURACIÓN DE SESIONES
// ⚠️ DEBE IR ANTES DE PASSPORT
// ========================================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60 // 24 horas sesion expìra en db
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 horas
      httpOnly: true,               // evita acceso desde JS del cliente
      secure: process.env.NODE_ENV === 'production', // true solo en HTTPS
      sameSite: 'lax'               // evita envío de cookies en requests de otros sitios
    }
  })
);


// ========================================
// INICIALIZACIÓN DE PASSPORT
// ⚠️ ORDEN CRÍTICO:
// 1. express-session
// 2. passport.initialize()
// 3. passport.session()
// ========================================
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());



// ========================================
// CONNECT-FLASH (mensajes flash)
// ========================================
app.use(flash());

// ========================================
// VARIABLES GLOBALES PARA VISTAS
// ========================================
app.use((req, res, next) => {
  const successFlash = req.flash('success_msg');
  const errorFlash = req.flash('error_msg');
  const errorGeneral = req.flash('error');

  res.locals.success_msg = successFlash.length > 0 ? successFlash[0] : null;
  res.locals.error_msg = errorFlash.length > 0 ? errorFlash[0] : null;
  res.locals.error = errorGeneral.length > 0 ? errorGeneral[0] : null;
  res.locals.user = req.user || null;
  next();
});


// ========================================
// MIDDLEWARES GENERALES
// ========================================
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// method-override (usa el campo _method del body por defecto)
// app.use(methodOverride('_method'));


// ========================================
// RUTAS
// ========================================
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var aboutRouter = require('./routes/about');
var postsRouter = require('./routes/posts');
var loginRouter = require('./routes/auth');
const adminRoutes = require('./routes/e-commerce/admin');

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/about', aboutRouter);
app.use('/posts', postsRouter);
app.use('/auth', loginRouter);
app.use('/admin', adminRoutes);


// ========================================
// MANEJO DE ERRORES
// ========================================
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
