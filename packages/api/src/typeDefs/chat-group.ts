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
    addChatGroupContent(id: ID!, chatId: String!, content: String!, visibleAfter: DateInput): ChatGroup!
    addChatGroupContentWithNewChat(id: ID!, content: String!, title: String, visibleAfter: DateInput): ChatGroup!
    attachChatGroupChatToChatGroup(id: ID!, chatId: String!, sourceId: String!): ChatGroup!
    blockChatGroupContent(id: ID!, chatId: String!, contentId: String!, remark: String): ChatGroup!
    clearChatGroupChatFlag(id: ID!, chatId: String!, flag: String!): ChatGroup!
    joinChatGroup(id: ID!): ChatGroup!
    joinBookChatGroup(id: ID!): ChatGroup!
    leaveChatGroup(id: ID!): StatusResponse!
    recallChatGroupContent(id: ID!, chatId: String!, contentId: String!): ChatGroup!
    setChatGroupChatFlag(id: ID!, chatId: String!, flag: String!): ChatGroup!
    shareQuestionToChatGroup(id: ID!, sourceId: String!): ChatGroup!
    updateChatGroup(id: ID!, title: String, description: String, membership: String!, logoUrl: String): ChatGroup!
    updateChatGroupAdmins(id: ID!, userIds: [String!]!): ChatGroup!
    updateChatGroupChatLastViewedAt(id: ID!, chatId: String!, timestamp: DateInput): ChatGroup!
    updateChatGroupChatTitle(id: ID!, chatId: String!, title: String): ChatGroup!
    updateChatGroupUsers(id: ID!, userIds: [String!]!): ChatGroup!

    toAdminChatGroup(content: String!): ChatGroup!
    toAlexChatGroup(content: String!): ChatGroup!
    toTenantAdminsChatGroup(tenantId: String!, content: String!): ChatGroup!
    toTenantCounselorsChatGroup(tenantId: String!, content: String!): ChatGroup!
    toTenantSupportsChatGroup(tenantId: String!, content: String!): ChatGroup!
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
    marshals: [String!]!
    chats: [Chat!]!
    key: String
    url: String
    logoUrl: String
    createdAt: Float!
    updatedAt: Float!

    contentsToken: String!
  }
`;
