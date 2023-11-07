/**
 * Apollo Query: Role
 *
 */

export const ADD_ROLE = `#graphql
  mutation AddRole($id: ID!, $role: String!) {
    addRole(id: $id, role: $role)
  }
`;

export const GET_ROLE = `#graphql
  query GetRole($id: ID!) {
    role(id: $id)
  }
`;

export const REMOVE_ROLE = `#graphql
  mutation RemoveRole($id: ID!, $role: String!) {
    removeRole(id: $id, role: $role)
  }
`;
