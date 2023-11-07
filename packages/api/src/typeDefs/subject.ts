/**
 * apollo typeDef: Subject
 */

export default `#graphql
  extend type Query {
    subject(id: ID!): Subject @cacheControl(maxAge: 3600)
    subjects(query: QueryInput): [Subject!]! @cacheControl(maxAge: 3600)
  }

  extend type Mutation {
    addSubject(subject: SubjectInput!): Subject!
    addSubjectRemark(id: ID!, remark: String!): Subject!
    removeSubject(id: ID!, remark: String): StatusResponse!
    updateSubject(id: ID!, subject: SubjectInput!): Subject!
  }

  input SubjectInput {
    name: LocaleInput!
    levels: [String!]!
  }
  type Subject {
    _id: ID!
    flags: [String!]!
    name: Locale!
    levels: [String!]!
    remarks: [Remark!]
    createdAt: Float!
    updatedAt: Float!
    deletedAt: Float
  }
`;
