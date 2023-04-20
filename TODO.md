### TODO List

userController
findMany (tenantAdmin, or, admin could fetch users without tenant )

const userTenantSelect = '\_id name emails avatarUrl histories'
const userSchoolSelect = `${userNonSchoolSelect} history`

passwordController add forceChange = (newPassword) => Promise<StatusResponse>

####

### API

- HUB, tenant.version = satelliteVersion, pause sync if outdated.

- Dockerfile, build.ts
- remove python-shell

Assignment Generator creates stash

dynParams: 10#11#12#13,20#21#22#23,30#31#32#33

### React

- childrenProps = { children: React.ReactNode }
- investigate react-helmet
- client will decode redirect action (if client has no tokens, accessToken=refreshToken = token)
- react client getServerInfo, and compare version against hubVersion, and switch to hub if satellite is outdated
- React upload JPG as string https://dev.to/guscarpim/upload-image-base64-react-4p7j
- react: video|pdf -> text https://base64.guru/converter/decode/video
- import DropZone from 'react-dropzone'
- react-hook-form yup i18 https://codesandbox.io/s/c95qw?file=/src/App.js
- idea: piggy-back some reactiveVar to systemStatus as local-only field (for persistent caching)
- notification, websockets, web-push: https://dev.to/novu/building-a-chat-browser-notifications-with-react-websockets-and-web-push-1h1j
- FCM,APN,ADM,WNS https://www.npmjs.com/package/node-pushnotifications
- BASE64 https://www.freecodecamp.org/news/encode-decode-html-base64-using-javascript/
- react-icons

Apollo File Upload: https://www.apollographql.com/docs/apollo-server/data/file-uploads/
https://www.apollographql.com/blog/backend/file-uploads/file-upload-best-practices/
https://www.apollographql.com/blog/graphql/file-uploads/with-react-hooks-typescript-amazon-s3-tutorial/

### OAuth

Google: https://www.youtube.com/watch?v=Qt3KJZ2kQk0
client: GET https://google -> Google callback client with tokenId & accessId -> client sends to Apollo server (access & token) -> server sends AuthResponse

GitHub: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps

#### Vite-PWA

https://stackoverflow.com/questions/69961761/react-js-builds-with-vite-does-not-include-service-worker-ts
https://dev.to/wtho/custom-service-worker-logic-in-typescript-on-vite-4f27
https://vite-pwa-org.netlify.app/workbox/inject-manifest.html
