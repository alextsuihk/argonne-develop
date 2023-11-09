/**
 * Apollo Query: Job
 *
 */

import gql from 'graphql-tag';

const JOB_FIELDS = gql`
  fragment JobFields on Job {
    _id
    flags

    status
    task
    grade {
      tenantId
      assignmentId
    }
    report {
      tenantId
      file
      arg
    }

    priority
    startAfter
    attempt
    startedAt
    progress
    completedAt
    result

    createdAt
    updatedAt
    deletedAt
  }
`;

export const GET_JOB = gql`
  ${JOB_FIELDS}
  query GetJob($id: ID!) {
    job(id: $id) {
      ...JobFields
    }
  }
`;

export const GET_JOBS = gql`
  ${JOB_FIELDS}
  query GetJobs($query: QueryInput) {
    jobs(query: $query) {
      ...JobFields
    }
  }
`;

export const REMOVE_JOB = gql`
  ${JOB_FIELDS}
  mutation RemoveJob($id: ID!) {
    removeJob(id: $id) {
      ...JobFields
    }
  }
`;
