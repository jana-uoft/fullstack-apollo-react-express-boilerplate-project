import { combineResolvers } from 'graphql-resolvers';

import { isAuthenticated, isMessageOwner } from './authorization';

import pubsub, { EVENTS } from '../subscription';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');

export default {
  Query: {
    messages: async (
      parent,
      { cursor, limit = 100 },
      { models: { Message } },
    ) => {
      const hasNextPage = false;
      const edges = Message.find({});

      return {
        edges,
        pageInfo: {
          hasNextPage,
          endCursor: 'test',
        },
      };
    },

    message: async (parent, { id: _id }, { models }) =>
      await models.Message.findOne({ _id }),
  },

  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text }, { models: { Message }, me }) => {
        let message = new Message({
          user: me._id,
          text,
        });
        await message.save();

        pubsub.publish(EVENTS.MESSAGE.CREATED, {
          messageCreated: { message },
        });

        return message;
      },
    ),

    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, { id: _id }, { models: { Message } }) =>
        !!(await Message.deleteOne({ _id })),
    ),
  },

  Message: {
    user: async message =>
      (await message.populate('user').execPopulate()).user,
  },

  Subscription: {
    messageCreated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.MESSAGE.CREATED),
    },
  },
};
