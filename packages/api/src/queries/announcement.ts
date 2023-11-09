/**
 * Apollo Query: Announcement
 *
 */

import gql from 'graphql-tag';

import { STATUS_RESPONSE } from './common';

const ANNOUNCEMENT_FIELDS = gql`
  fragment AnnouncementFields on Announcement {
    _id
    flags
    tenant
    title
    message
    beginAt
    endAt
    createdAt
    updatedAt
    deletedAt
  }
`;

export const ADD_ANNOUNCEMENT = gql`
  ${ANNOUNCEMENT_FIELDS}
  mutation AddAnnouncement($announcement: AnnouncementInput!) {
    addAnnouncement(announcement: $announcement) {
      ...AnnouncementFields
    }
  }
`;

export const GET_ANNOUNCEMENT = gql`
  ${ANNOUNCEMENT_FIELDS}
  query GetAnnouncement($id: ID!) {
    announcement(id: $id) {
      ...AnnouncementFields
    }
  }
`;

export const GET_ANNOUNCEMENTS = gql`
  ${ANNOUNCEMENT_FIELDS}
  query GetAnnouncements($query: QueryInput) {
    announcements(query: $query) {
      ...AnnouncementFields
    }
  }
`;

export const REMOVE_ANNOUNCEMENT = gql`
  ${STATUS_RESPONSE}
  mutation RemoveAnnouncement($id: ID!) {
    removeAnnouncement(id: $id) {
      ...StatusResponse
    }
  }
`;
