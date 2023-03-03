// TODO: reference https://rajputankit22.medium.com/authenticate-google-token-with-node-js-backend-server-35a2d5cffdee
// https://github.com/engineer-man/youtube/blob/master/088/flow.js https://www.youtube.com/watch?v=j-bHvqQ378s
// https://oauthdebugger.com/ https://www.youtube.com/watch?v=996OiexHze0
// https://dev.to/sivaneshs/add-google-login-to-your-react-apps-in-10-mins-4del

// (36) MERN Auth - Login with Email (JWT) + Google OAuth Authentication | React, Node, Express, MongoDB - YouTube
// https://www.youtube.com/watch?v=LKlO8vLvUao

// Authenticate with a backend server  |  Google Sign-In for Websites
// https://developers.google.com/identity/sign-in/web/backend-auth

//  # Google Authorization Code (non implicit flow)
//  Authorization-Code-Flow
//    https://accounts.google.com/o/oauth2/v2/auth?client_id=abcd123&redirect_uri=https://alextsui.net/oauth2/google/callback&scope=profile&response_type=code&state=foobar

//  Google get accessToken
//    post www.googleapis.com/oauth2/v4/token
//       Content-Type; application/x-www-form-urlencoded
//       code=response-query-from-above&
//       client_id=1bcd1234&
//       client_secret=secret1234&
//       grant_type=authorization_code

/**
 * OAuth2 decoding
 *
 */

import { LOCALE } from '@argonne/common';
import axios from 'axios';
import type { TokenPayload } from 'google-auth-library';
import { OAuth2Client } from 'google-auth-library';

import configLoader from '../config/config-loader';

export type OAuthPayload = {
  subId: string;
  email?: string;
  avatarUrl?: string;
};

const { MSG_ENUM } = LOCALE;

// TODO: https://codeburst.io/react-authentication-with-twitter-google-facebook-and-github-862d59583105
// TODO: https://medium.com/authpack/facebook-auth-with-node-js-c4bb90d03fc0
// TODO:  https://dzone.com/articles/implementing-oauth2-social-login-with-facebook-par-1
const facebook = async (accessToken: string): Promise<void> => {
  const { data } = await axios.get(`https://graph.facebook.com/v8.0/me?access_token=${accessToken}`);
  console.log('Facebook AccessToken Decode result >>>>> ', data);
};

/**
 * Decode Google OAuth2 Token
 */
const google = async (code: string): Promise<OAuthPayload> => {
  const { google } = configLoader.config.oAuth2;
  const oAuth2Client = new OAuth2Client(google.clientId, google.clientSecret, google.redirectUrl);

  try {
    const r = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(r.tokens);

    const tokenInfo = await oAuth2Client.getTokenInfo(r.tokens.access_token!); // TODO: WIP
    // tokenInfo.
    // const ticket = await oAuth2Client.verifyIdToken({ idToken, audience: google.clientId });
    // 1;
    // const payload = ticket.getPayload();
    // if (!payload?.email) throw { statusCode: 401, code: MSG_ENUM.OAUTH2_TOKEN_ERROR };

    return { subId: tokenInfo.sub!, email: tokenInfo.email };
  } catch (error) {
    throw { statusCode: 401, code: MSG_ENUM.OAUTH2_TOKEN_ERROR };
  }
};

export default { facebook, google };
