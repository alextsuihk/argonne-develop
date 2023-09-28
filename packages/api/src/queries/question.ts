/**
 * Apollo Query: Question
 *
 */

import { gql } from 'apollo-server-core';

import { BID, MEMBER, STATUS_RESPONSE } from './common';

const QUESTION_FIELDS = gql`
  ${BID}
  ${MEMBER}
  fragment QuestionFields on Question {
    _id
    flags
    tenant
    parent

    student
    tutor
    marshals

    members {
      ...MemberFields
    }
    deadline

    classroom
    level
    subject
    book
    bookRev
    chapter
    assignmentIdx
    dynParamIdx
    homework

    lang

    contents
    timeSpent

    createdAt
    updatedAt
    deletedAt

    price
    bidders
    bids {
      ...BidFields
    }
    paidAt

    correctness
    explicitness
    punctuality

    contentsToken
  }
`;

export const ADD_QUESTION = gql`
  ${QUESTION_FIELDS}
  mutation AddQuestion(
    $tenantId: String!
    $userIds: [String!]!
    $deadline: DateInput!
    $classroom: String
    $level: String!
    $subject: String!
    $book: String
    $bookRev: String
    $chapter: String
    $assignmentIdx: Int
    $dynParamIdx: Int
    $homework: String
    $lang: String!
    $price: Int
    $content: String!
  ) {
    addQuestion(
      tenantId: $tenantId
      userIds: $userIds
      deadline: $deadline
      classroom: $classroom
      level: $level
      subject: $subject
      book: $book
      bookRev: $bookRev
      chapter: $chapter
      assignmentIdx: $assignmentIdx
      dynParamIdx: $dynParamIdx
      homework: $homework
      lang: $lang
      price: $price
      content: $content
    ) {
      ...QuestionFields
    }
  }
`;

export const ADD_QUESTION_BID_CONTENT = gql`
  ${QUESTION_FIELDS}
  mutation AddQuestionBidContent($id: ID!, $content: String!, $userId: String!) {
    addQuestionBidContent(id: $id, content: $content, userId: $userId) {
      ...QuestionFields
    }
  }
`;

export const ADD_QUESTION_BIDDERS = gql`
  ${QUESTION_FIELDS}
  mutation AddQuestionBidders($id: ID!, $userIds: [String!]!) {
    addQuestionBidders(id: $id, userIds: $userIds) {
      ...QuestionFields
    }
  }
`;

export const ADD_QUESTION_CONTENT = gql`
  ${QUESTION_FIELDS}
  mutation AddQuestionContent($id: ID!, $content: String!, $visibleAfter: DateInput, $timeSpent: Int, $flag: String) {
    addQuestionContent(id: $id, content: $content, visibleAfter: $visibleAfter, timeSpent: $timeSpent, flag: $flag) {
      ...QuestionFields
    }
  }
`;

export const ASSIGN_QUESTION_TUTOR = gql`
  ${QUESTION_FIELDS}
  mutation AssignQuestionTutor($id: ID!, $userId: String!) {
    assignQuestionTutor(id: $id, userId: $userId) {
      ...QuestionFields
    }
  }
`;

export const CLEAR_QUESTION_FLAG = gql`
  ${QUESTION_FIELDS}
  mutation ClearQuestionFlag($id: ID!, $flag: String!) {
    clearQuestionFlag(id: $id, flag: $flag) {
      ...QuestionFields
    }
  }
`;

export const CLOSE_QUESTION = gql`
  ${QUESTION_FIELDS}
  mutation CloseQuestion($id: ID!) {
    closeQuestion(id: $id) {
      ...QuestionFields
    }
  }
`;

export const CLONE_QUESTION = gql`
  ${QUESTION_FIELDS}
  mutation CloneQuestion($id: ID!, $userIds: [String!]!) {
    cloneQuestion(id: $id, userIds: $userIds) {
      ...QuestionFields
    }
  }
`;

export const GET_QUESTION = gql`
  ${QUESTION_FIELDS}
  query GetQuestion($id: ID!) {
    question(id: $id) {
      ...QuestionFields
    }
  }
`;

export const GET_QUESTIONS = gql`
  ${QUESTION_FIELDS}
  query GetQuestions($query: QueryInput) {
    questions(query: $query) {
      ...QuestionFields
    }
  }
`;

export const REMOVE_QUESTION = gql`
  ${STATUS_RESPONSE}
  mutation RemoveQuestion($id: ID!) {
    removeQuestion(id: $id) {
      ...StatusResponse
    }
  }
`;

export const SET_QUESTION_FLAG = gql`
  ${QUESTION_FIELDS}
  mutation SetQuestionFlag($id: ID!, $flag: String!) {
    setQuestionFlag(id: $id, flag: $flag) {
      ...QuestionFields
    }
  }
`;

export const UPDATE_QUESTION_LAST_VIEWED_AT = gql`
  ${QUESTION_FIELDS}
  mutation UpdateQuestionLastViewedAt($id: ID!, $timestamp: DateInput) {
    updateQuestionLastViewedAt(id: $id, timestamp: $timestamp) {
      ...QuestionFields
    }
  }
`;
