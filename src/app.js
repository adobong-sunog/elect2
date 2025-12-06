const path = require('path');
const express = require('express');
const morgan = require('morgan');
const session = require('express-session');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const flashMiddleware = require('./middleware/flash');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandlers');
const eventsRouter = require('./routes/events');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const { attachUser } = require('./middleware/auth');

const app = express();

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'peppi-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // 4 hours
    sameSite: 'lax',
  },
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(session(sessionConfig));
app.use(attachUser);
app.use(flashMiddleware());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.locals.appName = 'PEPPI Activity Tracker';

app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/', eventsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
