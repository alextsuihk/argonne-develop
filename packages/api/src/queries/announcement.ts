/**
 * Apollo Query: Announcement
 *
 */

import { STATUS_RESPONSE } from './common';

const ANNOUNCEMENT_FIELDS = `#graphql
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

export const ADD_ANNOUNCEMENT = `#graphql
  ${ANNOUNCEMENT_FIELDS}
  mutation AddAnnouncement($announcement: AnnouncementInput!) {
    addAnnouncement(announcement: $announcement) {
      ...AnnouncementFields
    }
  }
`;

export const GET_ANNOUNCEMENT = `#graphql
  ${ANNOUNCEMENT_FIELDS}
  query GetAnnouncement($id: ID!) {
    announcement(id: $id) {
      ...AnnouncementFields
    }
  }
`;

export const GET_ANNOUNCEMENTS = `#graphql
  ${ANNOUNCEMENT_FIELDS}
  query GetAnnouncements($query: QueryInput) {
    announcements(query: $query) {
      ...AnnouncementFields
    }
  }
`;

export const REMOVE_ANNOUNCEMENT = `#graphql
  ${STATUS_RESPONSE}
  mutation RemoveAnnouncement($id: ID!) {
    removeAnnouncement(id: $id) {
      ...StatusResponse
    }
  }
`;
