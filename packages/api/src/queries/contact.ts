/**
 * Apollo Query: Contact
 *
 */

import gql from 'graphql-tag';

import { STATUS_RESPONSE } from './common';

const CONTACT_FIELDS = gql`
  fragment ContactFields on Contact {
    _id
    flags
    avatarUrl
    name
    identifiedAt
    availability
    tenants
    updatedAt
  }
`;

export const GET_CONTACT_TOKEN = gql`
  query GetContactToken($expiresIn: Int) {
    contactToken(expiresIn: $expiresIn) {
      token
      expireAt
    }
  }
`;

export const ADD_CONTACT = gql`
  ${CONTACT_FIELDS}
  mutation AddContact($token: String!) {
    addContact(token: $token) {
      ...ContactFields
    }
  }
`;

export const GET_CONTACT = gql`
  ${CONTACT_FIELDS}
  query GetContact($id: ID!) {
    contact(id: $id) {
      ...ContactFields
    }
  }
`;

export const GET_CONTACTS = gql`
  ${CONTACT_FIELDS}
  query GetContacts {
    contacts {
      ...ContactFields
    }
  }
`;

export const REMOVE_CONTACT = gql`
  ${STATUS_RESPONSE}
  mutation RemoveContact($id: ID!) {
    removeContact(id: $id) {
      ...StatusResponse
    }
  }
`;

export const UPDATE_CONTACT = gql`
  ${CONTACT_FIELDS}
  mutation UpdateContact($id: ID!, $name: String!) {
    updateContact(id: $id, name: $name) {
      ...ContactFields
    }
  }
`;
