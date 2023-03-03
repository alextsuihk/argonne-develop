/**
 * Message Code
 *  10000 Series: General Error, or common messages (not specific to any single section)
 */

module.exports = {
  // general message (Internal Error)
  10000: {
    text: 'GENERAL_ERROR',
    enUS: 'server error',
    zhHK: '服務器內部問題',
    zhCN: '服务器内部问题',
  },
  10001: {
    text: 'UNKNOWN_EXCEPTION_ERROR', // unknown (non-managed) try-catch error
    enUS: 'exception error',
    zhHK: '異常錯誤',
    zhCN: '异常错误',
  },
  // 10002: {
  //   text: 'UNKNOWN_ACTION',
  //   enUS: 'Invalid Operation',
  //   zhHK: '操作錯誤',
  //   zhCN: '操作错误',
  // },
  10003: {
    text: 'WIP',
    enUS: 'Work In Progress',
    zhHK: 'Work In Progress',
    zhCN: 'Work In Progress',
  },
  10004: {
    text: 'NOT_FOUND',
    enUS: 'not found',
    zhHK: '找不到資源',
    zhCN: '找不到资源',
  },
  10005: {
    text: 'INVALID_ID',
    enUS: 'invalid ID',
    zhHK: 'ID錯誤',
    zhCN: 'ID错误',
  },
  10006: {
    text: 'COMPLETED',
    enUS: 'completed',
    zhHK: '完成',
    zhCN: '完成',
  },
  10007: {
    text: 'RESERVED-10007',
    enUS: 'reserved',
    zhHK: 'reserved',
    zhCN: 'reserved',
  },

  // invalid API Key
  10008: {
    text: 'INVALID_API_KEY',
    enUS: 'invalid API key',
    zhHK: '無效API密鑰',
    zhCN: '无效API密钥',
  },
  10009: {
    text: 'INVALID_CLIENT_VERSION',
    enUS: 'invalid client authentication',
    zhHK: '無效的客戶端版本',
    zhCN: '无效的客户端版本',
  },

  10010: {
    text: 'TENANT_ERROR',
    enUS: 'tenant error',
    zhHK: '領域錯誤',
    zhCN: '领域错误',
  },

  10011: {
    text: 'SATELLITE_ERROR',
    enUS: 'time sync error',
    zhHK: '時間同步錯誤',
    zhCN: '时间同步错误',
  },

  10012: {
    text: 'SENDMAIL_ERROR',
    enUS: 'sendmail error',
    zhHK: '發送郵件錯誤',
    zhCN: '发送邮件错误',
  },

  // 10010: {
  //   text: 'SYSTEM_ALREADY_INITIALIZED',
  //   enUS: 'system is already initialized, please delete database folder & re-try',
  //   zhHK: '系統已經初始化，請刪除數據庫文件夾並重試',
  //   zhCN: '系统已经初始化，请删除数据库文件夹并重试',
  // },
  // 10011: { // TODO: to be removed
  //   text: 'SYSTEM_NOT_INITIALIZED',
  //   enUS: 'system is not initialized',
  //   zhHK: '系統尚未初始化 ',
  //   zhCN: '系统尚未初始化 ',
  // },

  10051: {
    text: 'MONGOOSE_NOT_READY',
    enUS: 'database error',
    zhHK: '數據庫錯誤',
    zhCN: '数据库错误',
  },
  10052: {
    text: 'MINIO_ERROR',
    enUS: 'database error',
    zhHK: '數據庫錯誤',
    zhCN: '数据库错误',
  },
  10053: {
    text: 'REDIS_NOT_READY',
    enUS: 'database error',
    zhHK: '數據庫錯誤',
    zhCN: '数据库错误',
  },

  // user input (form) error
  10091: {
    text: 'TOKEN_ERROR',
    enUS: 'token error',
  },
  10092: {
    text: 'TOKEN_EXPIRED',
    enUS: 'token expired',
  },
  // 10093: {
  //   text: 'MANAGED_BY_SCHOOL_ONLY',
  //   enUS: 'managed by school',
  // },
  10099: {
    text: 'USER_INPUT_ERROR',
    enUS: 'user input error',
    zhHK: '填寫數據錯誤',
    zhCN: '填写数据错误',
  },
};
