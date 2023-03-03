/**
 * Apollo Query: Role
 *
 */

import { gql } from 'apollo-server-core';

export const ADD_ROLE = gql`
  mutation AddRole($id: ID!, $role: String!) {
    addRole(id: $id, role: $role)
  }
`;

export const GET_ROLE = gql`
  query GetRole($id: ID!) {
    role(id: $id)
  }
`;

export const REMOVE_ROLE = gql`
  mutation RemoveRole($id: ID!, $role: String!) {
    removeRole(id: $id, role: $role)
  }
`;
