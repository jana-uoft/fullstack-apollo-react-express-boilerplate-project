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
      { cursor, limit = 100, order = 'desc' },
      { models: { Message } },
    ) => {
      const query = cursor
        ? { createdAt: { $lt: fromCursorHash(cursor) } }
        : {};
      const options = {
        sort: { createdAt: order },
        limit: limit + 1,
      };

      return Message.find(query, {}, options).then(messages => {
        const hasNextPage = messages.length > limit;
        const edges = hasNextPage ? messages.slice(0, -1) : messages;

        return {
          edges,
          pageInfo: {
            hasNextPage,
            endCursor: toCursorHash(
              edges[edges.length - 1].createdAt.toString(),
            ),
          },
        };
      });
    },

    message: async (parent, { id: _id }, { models }) =>
      await models.Message.findOne({ _id }),
  },

  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text }, { models: { Message, User }, me }) => {
        let date = new Date();
        let message = new Message({
          user: me._id,
          text,
          createdAt: date.setSeconds(date.getSeconds() + 1),
        });
        await message.save();

        let user = await User.findById(me._id);
        user.messages.push(message.id);
        await user.save();

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
