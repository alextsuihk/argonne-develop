/**
 * Apollo TypeDef: Chat
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    chat(id: ID!): Chat
    chats(query: QueryInput): [Chat!]!
  }

  extend type Mutation {
    addChat(id: ID, title: String, parent: String!, content: String!): Chat!
    attachChatToClassroom(id: ID!, parent: String!, classroomId: String!): Chat!
    blockChatContent(id: ID!, parent: String!, contentId: String!, remark: String): Chat!
    clearChatFlag(id: ID!, parent: String!, flag: String!): Chat!
    recallChatContent(id: ID!, parent: String!, contentId: String!): Chat!
    setChatFlag(id: ID!, parent: String!, flag: String!): Chat!
    updateChatLastViewedAt(id: ID!, parent: String!, timestamp: DateInput!): Chat!
    updateChatTitle(id: ID!, parent: String!, title: String): Chat!
  }

  type Chat {
    _id: ID!
    flags: [String!]!
    parents: [String!]!
    title: String
    members: [Member]!
    contents: [String]
    contentsToken: String
    createdAt: Float!
    updatedAt: Float!
  }
`;
