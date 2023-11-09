/**
 * Apollo Query: Analytic
 *
 */

import gql from 'graphql-tag';

import { STATUS_RESPONSE } from './common';

export const ANALYTIC_SESSION = gql`
  ${STATUS_RESPONSE}
  mutation AnalyticSession($fullscreen: Boolean!, $token: String!, $coordinates: CoordinatesInput) {
    analyticSession(fullscreen: $fullscreen, token: $token, coordinates: $coordinates) {
      ...StatusResponse
    }
  }
`;
