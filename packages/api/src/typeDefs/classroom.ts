/**
 * Apollo TypeDef: Classroom
 */

import { gql } from 'apollo-server-express';

export default gql`
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
    addClassroomRemark(id: ID!, remark: String!): Classroom!
    addClassroomStudents(id: ID!, userIds: [String!]!): Classroom!
    addClassroomTeachers(id: ID!, userIds: [String!]!): Classroom!
    recoverClassroom(id: ID!, remark: String): Classroom!
    removeClassroom(id: ID!, remark: String): StatusResponse!
    removeClassroomStudents(id: ID!, userIds: [String!]!): Classroom!
    removeClassroomTeachers(id: ID!, userIds: [String!]!): Classroom!
    updateClassroom(id: ID!, title: String, room: String, schedule: String, books: [String!]!): Classroom
  }

  type Classroom {
    _id: ID!
    flags: [String!]!
    tenant: String
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

    chats: [String!]!
    assignments: [String!]!

    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
