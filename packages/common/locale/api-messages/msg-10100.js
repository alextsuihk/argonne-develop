/**
 * Message Code
 *  10100 Series: authentication & authorization
 */

module.exports = {
  // header & token (accessToken)
  10101: {
    text: 'AUTH_ACCESS_TOKEN_ERROR', // accessToken issue: no header, expired, (not able to decode)
    enUS: 'Please login again',
    zhHK: '請重新登錄',
    zhCN: '请重新登入',
  },
  10102: {
    text: 'AUTH_GUEST_ONLY', //
    enUS: 'Please logout first',
    zhHK: '請先登出',
    zhCN: '请先登出',
  },
  10103: {
    text: 'AUTH_CREATE_TOKEN_ERROR', // fail to generate JWT
    enUS: 'JWT error',
    zhHK: 'JWT錯誤',
    zhCN: 'JWT错误',
  },
  10104: {
    text: 'AUTH_LIST_TOKEN_ERROR', // fail to read mongoose token collection
    enUS: 'JWT error',
    zhHK: 'JWT錯誤',
    zhCN: 'JWT错误',
  },
  10105: {
    text: 'AUTH_RENEW_TOKEN_ERROR', // fail to renew access token
    enUS: 'JWT error',
    zhHK: 'JWT錯誤',
    zhCN: 'JWT错误',
  },
  10106: {
    text: 'AUTH_REVOKE_TOKEN_ERROR', //
    enUS: 'JWT error',
    zhHK: 'JWT錯誤',
    zhCN: 'JWT错误',
  },

  // auth
  // 10110: {
  //   text: 'BINDING_TOKEN_EXPIRED',
  //   enUS: 'Binding Token has expired',
  //   zhHK: '綁定令牌已過期 ',
  //   zhCN: '绑定令牌已过期',
  // },
  10111: {
    text: 'AUTH_EMAIL_ALREADY_REGISTERED',
    enUS: 'email is already registered',
    zhHK: '郵箱地址已被註冊',
  },
  // 10112: {
  //   text: 'AUTH_USER_NOT_FOUND', // or deleted
  //   enUS: 'invalid credentials',
  //   zhHK: '用戶名和密碼不對',
  // },
  10113: {
    text: 'AUTH_CREDENTIALS_ERROR', // password mis-matches database
    enUS: 'invalid credentials',
    zhHK: '用戶名和密碼不對',
  },
  10114: {
    text: 'AUTH_OAUTH_ALREADY_REGISTERED', // oAuth2 is taken by others
    enUS: 'oAuth is registered by others',
    zhHK: 'OAuth 已被其他帳戶登記',
  },
  // 10115: {
  //   text: 'AUTH_USER_LOCKED',
  //   enUS: 'account is locked',
  //   zhHK: 'account is locked',
  // },
  // 10116: {
  //   text: 'AUTH_EXCEED_MAX_LOGIN',   // Exceed Max Logins // TODO: no longer in use
  //   enUS: 'exceed maximum logins',
  //   zhHK: '超過登入限制',
  // },

  // password reset
  10123: {
    text: 'AUTH_PASSWORD_RESET_ERROR',
    enUS: 'password reset token error',
  },
  // 10124: { // TODO: EOL , use USER_INPUT_ERROR
  //   text: 'AUTH_PASSWORD_NOT_SAME_AS_CURRENT',
  //   enUS: 'new password MUST be different from current password',
  // },

  // oauth2
  10131: {
    text: 'OAUTH2_UNSUPPORTED_PROVIDER',
    enUS: 'unsupported OAuth2 provider',
    zhHK: '不支持 OAuth2 服务商',
    zhCN: '不支持 OAuth2 服务商',
  },

  10133: {
    text: 'OAUTH2_TOKEN_ERROR', //TODO: not in use
    enUS: 'OAuth2 token error',
  },

  // impersonation
  // 10141: {
  //   text: 'AUTH_IMPERSONATE_ERROR', // operation not allowed
  //   enUS: 'authorization error',
  //   zhHK: '授權錯誤',
  //   zhCN: '授权错误',
  // },
  // 10142: {
  //   text: 'AUTH_IMPERSONATE_ROOT_ERROR', // not allow to impersonate another root
  //   enUS: 'authorization error',
  //   zhHK: '授權錯誤',
  //   zhCN: '授权错误',
  // },
  // 10143: {
  //   // deny impersonation
  //   text: 'AUTH_IMPERSONATION_DENIED',
  //   enUS: 'operation not allowed',
  //   zhHK: '不允許操作',
  //   zhCN: '不允许操作',
  // },
  // 10144: {
  //   // deny impersonation
  //   text: 'AUTH_NESTED_IMPERSONATION_DENIED',
  //   enUS: 'operation not allowed',
  //   zhHK: '不允許操作',
  //   zhCN: '不允许操作',
  // },
  // 10145: {
  //   // deny impersonation
  //   text: 'AUTH_MOBILE_IMPERSONATION_DENIED',
  //   enUS: 'operation not allowed',
  //   zhHK: '不允許操作',
  //   zhCN: '不允许操作',
  // },
  // 10146: {
  //   // deny impersonation
  //   text: 'AUTH_IMPERSONATED_USER_NOT_FOUND',
  //   enUS: 'user not found',
  //   zhHK: '不允許操作',
  //   zhCN: '不允许操作',
  // },

  // authorization (statusCode: 403)
  10150: {
    text: 'SUBMISSION_SUSPENDED',
    enUS: 'submission suspended',
    zhHK: '提交被暫停',
  },
  10151: {
    text: 'UNAUTHORIZED_OPERATION',
    enUS: 'unauthorized operation',
    zhHK: '未經授權操作',
  },
  10152: {
    text: 'AUTH_REQUIRE_ROLE_ROOT', // non root
    enUS: 'authorization error',
    zhHK: '授權錯誤',
    zhCN: '授权错误',
  },
  10153: {
    text: 'AUTH_REQUIRE_ROLE_ADMIN', // non admin
    enUS: 'authorization error',
    zhHK: '授權錯誤',
    zhCN: '授权错误',
  },
  10154: {
    text: 'AUTH_REQUIRE_ROLE_UNKNOWN',
    enUS: 'authorization error',
    zhHK: '授權錯誤',
    zhCN: '授权错误',
  },
};
