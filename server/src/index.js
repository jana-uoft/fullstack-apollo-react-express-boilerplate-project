import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import express from 'express';
import jwt from 'jsonwebtoken';
import DataLoader from 'dataloader';
import { ApolloServer } from 'apollo-server-express';
import { AuthenticationError } from 'apollo-server';

import schema from './schema';
import resolvers from './resolvers';
import models from './models';
import loaders from './loaders';

const port = process.env.PORT || 8000;

let mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(
  `mongodb://${process.env.DATABASE_URL || 'localhost'}:${process.env
    .DATABASE_PORT || '27017'}/${process.env.DATABASE}`,
);

const app = express();

app.use(cors());

app.use(morgan('dev'));

const getMe = async req => {
  const token = req.headers['x-token'];

  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (e) {
      throw new AuthenticationError(
        'Your session expired. Sign in again.',
      );
    }
  }
};

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  formatError: error => {
    const message = error.message
      .replace('SequelizeValidationError: ', '')
      .replace('Validation error: ', '');

    return {
      ...error,
      message,
    };
  },
  context: async ({ req, connection }) => {
    if (connection) {
      return {
        models,
        loaders: {
          user: new DataLoader(keys =>
            loaders.user.batchUsers(keys, models),
          ),
        },
      };
    }

    if (req) {
      const me = await getMe(req);

      return {
        models,
        me,
        secret: process.env.SECRET,
        loaders: {
          user: new DataLoader(keys =>
            loaders.user.batchUsers(keys, models),
          ),
        },
      };
    }
  },
});

server.applyMiddleware({ app, path: '/graphql' });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const createUsersWithMessages = async date => {
  // destroy it all
  await models.User.collection.drop();
  await models.Message.collection.drop();

  // and rise again
  new models.User(
    {
      username: 'rwieruch',
      email: 'hello@robin.com',
      password: 'rwieruch',
      role: 'ADMIN'
    }
  ).save(async function (err, user) {
    if (err) {
      console.log(err);
    } else {
      user.messages.push(await new models.Message(
        {
          text: 'Published the Road to learn React',
          createdAt: date.setSeconds(date.getSeconds() + 1),
          user: user
        }
      ).save());
    }
  });

  new models.User(
    {
      username: 'ddavids',
      email: 'hello@david.com',
      password: 'ddavids'
    }
  ).save(async function (err, user) {
    if (err) {
      console.log(err);
    } else {
      user.messages.push(await new models.Message(
        {
          text: 'Happy to release a GraphQL in React tutorial',
          createdAt: date.setSeconds(date.getSeconds() + 1),
          user: user
        }
      ).save());

      user.messages.push(new models.Message(
        {
          text: 'A complete React with Apollo and GraphQL Tutorial',
          createdAt: date.setSeconds(date.getSeconds() + 1),
          user: user
        }
      ).save());
    }
  });
};

createUsersWithMessages(new Date());

httpServer.listen({ port }, () => {
  console.log(`Apollo Server on http://localhost:${port}/graphql`);
});
