import 'dotenv/config';
import http from 'http';
import cors from 'cors';
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
mongoose.connect(process.env.DATABASE);

const app = express();

app.use(cors());

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
  const newUser1 = await models.User.findOneAndUpdate(
    { email: 'hello@robin.com' },
    {
      username: 'rwieruch',
      email: 'hello@robin.com',
      password: 'rwieruch',
      role: 'ADMIN',
    },
    {
      upsert: true,
      new: true,
    },
  );

  const newUser2 = await models.User.findOneAndUpdate(
    { email: 'hello@david.com' },
    {
      username: 'ddavids',
      email: 'hello@david.com',
      password: 'ddavids',
    },
    {
      upsert: true,
      new: true,
    },
  );

  await models.Message.deleteMany({
    userId: { $in: [newUser1._id, newUser2._id] },
  });

  await models.Message.insertMany([
    {
      userId: newUser1._id,
      text: 'Published the Road to learn React',
      createdAt: date.setSeconds(date.getSeconds() + 1),
    },
    {
      userId: newUser2._id,
      text: 'Happy to release a GraphQL in React tutorial',
      createdAt: date.setSeconds(date.getSeconds() + 1),
    },
    {
      userId: newUser2._id,
      text: 'A complete React with Apollo and GraphQL Tutorial',
      createdAt: date.setSeconds(date.getSeconds() + 1),
    },
  ]);
};

createUsersWithMessages(new Date());

httpServer.listen({ port }, () => {
  console.log(`Apollo Server on http://localhost:${port}/graphql`);
});
