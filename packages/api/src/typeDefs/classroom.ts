/**
 * Apollo TypeDef: Classroom
 */

export default `#graphql
  extend type Query {
    classroom(id: ID!): Classroom
    classrooms(query: QueryInput): [Classroom!]!
  }

  extend type Mutation {
    addClassroom(
      tenantId: String!
      level: String!
      subject: String!
      year: String!
      schoolClass: String!
      title: String
      room: String
      schedule: String
      books: [String!]!
    ): Classroom!
    addClassroomContent(id: ID!, chatId: String!, content: String!, visibleAfter: DateInput): Classroom!
    addClassroomContentWithNewChat(id: ID!, content: String!, title: String, visibleAfter: DateInput): Classroom!
    addClassroomRemark(id: ID!, remark: String!): Classroom!
    attachChatGroupChatToClassroom(id: ID!, chatId: String!, sourceId: String!): Classroom!
    attachClassroomChatToClassroom(id: ID!, chatId: String!, sourceId: String!): Classroom!
    blockClassroomContent(id: ID!, chatId: String!, contentId: String!, remark: String): Classroom!
    clearClassroomChatFlag(id: ID!, chatId: String!, flag: String!): Classroom!
    recallClassroomContent(id: ID!, chatId: String!, contentId: String!): Classroom!
    recoverClassroom(id: ID!, remark: String): Classroom!
    removeClassroom(id: ID!, remark: String): StatusResponse!
    setClassroomChatFlag(id: ID!, chatId: String!, flag: String!): Classroom!
    shareHomeworkToClassroom(id: ID!, sourceId: String!): Classroom!
    shareQuestionToClassroom(id: ID!, sourceId: String!): Classroom!
    updateClassroom(id: ID!, title: String, room: String, schedule: String, books: [String!]!): Classroom
    updateClassroomChatLastViewedAt(id: ID!, chatId: String!, timestamp: DateInput): Classroom!
    updateClassroomChatTitle(id: ID!, chatId: String!, title: String): Classroom!
    updateClassroomStudents(id: ID!, userIds: [String!]!): Classroom!
    updateClassroomTeachers(id: ID!, userIds: [String!]!): Classroom!
  }

  type Classroom {
    _id: ID!
    flags: [String!]!
    tenant: String!
    level: String!
    subject: String!
    year: String!
    schoolClass: String!
    title: String
    room: String
    schedule: String
    books: [String!]!
    teachers: [String!]!
    students: [String!]!

    chats: [Chat!]!
    assignments: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float

    contentsToken: String!
  }
`;
