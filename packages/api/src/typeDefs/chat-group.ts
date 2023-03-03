/**
 * Apollo TypeDef: Chat-Group
 */

import { gql } from 'apollo-server-express';

export default gql`
  extend type Query {
    chatGroup(id: ID!): ChatGroup
    chatGroups(query: QueryInput): [ChatGroup!]!
  }

  extend type Mutation {
    addChatGroup(
      tenantId: String!
      userIds: [String!]!
      title: String
      description: String
      membership: String!
      logoUrl: String
    ): ChatGroup!
    addChatGroupAdmins(id: ID!, userIds: [String!]!): ChatGroup!
    addChatGroupUsers(id: ID!, userIds: [String!]!): ChatGroup!
    joinChatGroup(id: ID!): ChatGroup!
    leaveChatGroup(id: ID!): StatusResponse!
    removeChatGroupUsers(id: ID!, userIds: [String!]!): ChatGroup!
    toAlexChatGroup(content: String!): ChatGroup!
    toAdminChatGroup(content: String!): ChatGroup!
    toTenantAdminsChatGroup(tenantId: String!, content: String!): ChatGroup!
    updateChatGroup(id: ID!, title: String, description: String, membership: String!, logoUrl: String): ChatGroup!
  }

  type ChatGroup {
    _id: ID!
    flags: [String!]!
    tenant: String
    title: String
    description: String
    membership: String!
    users: [String!]!
    admins: [String!]!
    chats: [String!]!
    adminKey: String
    key: String
    url: String
    logoUrl: String
    createdAt: Float!
    updatedAt: Float!
  }
`;
