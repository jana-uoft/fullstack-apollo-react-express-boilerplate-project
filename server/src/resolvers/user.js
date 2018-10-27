import jwt from 'jsonwebtoken';
import { combineResolvers } from 'graphql-resolvers';
import { AuthenticationError, UserInputError } from 'apollo-server';

import { isAuthenticated, isAdmin } from './authorization';

const createToken = async (user, secret, expiresIn) => {
  const { _id, email, username, role } = user;
  return await jwt.sign({ _id, email, username, role }, secret, {
    expiresIn,
  });
};

export default {
  Query: {
    users: async (parent, args, { models }) =>
      await models.User.find({}),

    user: async (parent, { id: _id }, { models }) =>
      await models.User.findOne({ _id }),

    me: async (parent, args, { models, me: { _id } = {} }) => {
      if (!_id) {
        return null;
      }

      return await models.User.findOne({ _id });
    },
  },

  Mutation: {
    signUp: async (
      parent,
      { username, email, password },
      { models: { User }, secret },
    ) => {
      let newUser = new User();
      newUser.username = username;
      newUser.email = email;
      newUser.password = password;

      return {
        token: createToken(await newUser.save(), secret, '30m'),
      };
    },

    signIn: async (
      parent,
      { login, password },
      { models: { User }, secret },
    ) => {
      const user = await User.findOne({
        $or: [{ email: login }, { username: login }],
      });

      if (!user) {
        throw new UserInputError(
          'No user found with this login credentials.',
        );
      }

      const isValid = await user.validatePassword(
        password,
        user.hashed_password,
      );

      if (!isValid) {
        throw new AuthenticationError('Invalid password.');
      }

      return { token: createToken(user, secret, '30m') };
    },

    updateUser: combineResolvers(
      isAuthenticated,
      async (
        parent,
        { username },
        { models: { User }, me: { _id } },
      ) => await User.updateOne({ _id }, { $set: { username } }),
    ),

    deleteUser: combineResolvers(
      isAdmin,
      async (parent, { id: _id }, { models: { User } }) =>
        await User.deleteOne({ _id }),
    ),
  },

  User: {
    messages: async user =>
      (await user.populate('messages').execPopulate()).messages,
  },
};
