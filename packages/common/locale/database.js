/**
 * Database field value converting to frontend user-friendly message
 */

// commonly-used
const ADMIN = { enUS: 'Administrator', zhHK: '管理員', zhCN: '管理员' };
const ARCHIVED = { enUS: 'Archived', zhHK: '存檔', zhCN: '存档' };
const CANCELED = { enUS: 'Canceled', zhHK: '取消', zhCN: '取消' };
const DRAFT = { enUS: 'Draft', zhHK: '草案', zhCN: '草案' };
const EDA = { enUS: 'EDA', zhHK: '關愛', zhCN: '关爱' }; // Economically-DisAdvantaged

// const STUDENT = { enUS: 'Student', zhHK: '學生', zhCN: '学生' };
// const TEACHER = { enUS: 'Teacher', zhHK: '老師', zhCN: '老师' };
const TUTOR = { enUS: 'Tutor', zhHK: '導師', zhCN: '导师' };

const BLOCKED = { enUS: 'Blocked', zhHK: '封鎖', zhCN: '封锁' };
const CENSOR = { enUS: 'Censorship', zhHK: '審查', zhCN: '审查' };
const IMPORTANT = { enUS: 'Important', zhHK: '重要', zhCN: '重要' };
const STEM = { enUS: 'STEM', zhHK: 'STEM', zhCN: 'STEM' };

const COMMON_FLAGS = {
  BLOCKED,
  REMOVED: { enUS: 'Removed' },
};

module.exports = {
  COMMON_FLAGS,
  ACTIVITY: {
    FLAG: {
      ...COMMON_FLAGS,
      AUTO_ACCEPTED: { enUS: 'Applied... TODO' },
      PRIVATE: { enUS: 'Private (by invitation only)' },
      HIDDEN: { enUS: 'Hidden' },
    },
    PARTICIPANT: {
      STATUS: {
        INTERESTED: { enUS: 'Interested', zhHK: '有興趣', zhCN: '有兴趣' },
        INVITED: { enUS: 'Invited to enroll' },
        REGISTERING: { enUS: 'Enrolling', zhHK: '申請處理中' },
        APPROVED: { enUS: 'Approved' },
        PAID: { enUS: 'Paid' },
        CONFIRMED: { enUS: 'Confirmed' },
      },
    },
    STATUS: {
      DRAFT,
      PENDING: { enUS: 'Pending Approval' },
      OPEN: { enUS: 'Open for Enrollment' },
      CLOSED: { enUS: 'Enrollment Closed' },
      CANCELED,
    },
  },

  ADVERTISEMENT: {
    CATEGORY: {
      SWIM: { enUS: 'Swim', zhHK: '游泳' },
      SPORT: { enUS: 'Other Sports', zhHK: '其他運動' },
      PIANO: { enUS: 'Piano', zhHK: '彈琴' },
      MUSIC: { enUS: 'Other Music', zhHK: '其他音樂' },
      CHESS: { enUS: 'Chess', zhHK: '棋藝' },
      FAMILY: { enUS: 'Family Activity', zhHK: '親子活動' },
      LEISURE: { enUS: 'Leisure', zhHK: '休閒娛樂' },
    },
    FLAG: {
      ...COMMON_FLAGS,
      FREE: { enUS: 'Free Ad', zhHK: '免費' },
    },

    STATUS: {
      SUBMITTED: { enUS: 'Submitted', zhHK: '提交', zhCN: '提交' }, // TODO: to be filled
      ACCEPTED: { enUS: 'Accepted', zhHK: '接受', zhCN: '接受' },
      REJECTED: { enUS: 'Rejected', ZhHK: '拒絕', zhCN: '拒绝' },
      BLOCKED: { enUS: 'Blocked', zhHK: '封鎖', zhCN: '封锁' },
    },
  },

  ANNOUNCEMENT: {
    FLAG: {
      SHOW_AT_STARTUP: { enUS: 'Show at Startup', zhHK: '啟動時顯示', zhCN: '启动时显示' },
      POP_UP: { enUS: 'Pop-Up', zhHK: '彈出窗口', zhCN: '弹出窗口' },
      TIP: { enUS: 'Tips & Tricks', zhHK: '提示與技巧', zhCN: '提示与技巧' },
      URGENT: { enUS: 'Urgent', zhHK: '緊急', zhCN: '紧急' },
    },
  },

  ASSIGNMENT: {
    FLAG: {
      QUIZ: { enUS: 'Quiz', zhHK: '測驗', zhCN: '测验' },
      AUTO_GRADE: { enUS: 'Auto-Grade', zhHK: '自動改簿' },
    },
  },

  ASSIGNMENT_HOMEWORK: {
    FLAG: {
      AUTO_GRADE_CORRECT: { enUS: 'Correct' },
      AUTO_GRADE_WRONG: { enUS: 'Wrong' },
    },
  },

  CHAT_GROUP: {
    FLAG: {
      ADMIN,
      ADMIN_JOINED: { enUS: '', zhHK: '', zhCN: '' }, // at least one administration has joined the chat,
      BOOK: { enUS: 'Book', zhHK: '書本', zhCN: '书本' },
      CENSOR,
    },
    MEMBERSHIP: {
      NORMAL: { enUS: 'Normal', zhHK: '正常', zhCN: '正常' },
      CLOSED: { enUS: 'Closed Membership', zhHK: '封閉會員制', zhCN: '封闭会员制 ' },
      PUBLIC: { enUS: 'Public Accessible', zhHK: '公眾', zhCN: '公众' },
    },
  },

  CHAT: {
    MEMBER: { FLAG: { ARCHIVED, IMPORTANT } },
  },

  COMPLAINT: {
    STATUS: {
      SUBMITTED: { enUS: 'Submitted', zhHK: '提交', zhCN: '提交' }, // TODO: to be filled
      PROCESSING: { enUS: 'Processing', zhHK: '處理中', zhCN: '处理中' },
      ACCEPTED: { enUS: 'Accepted', zhHK: '接受', zhCN: '接受' },
      REJECTED: { enUS: 'Rejected', ZhHK: '拒絕', zhCN: '拒绝' },
    },
    REASON: {
      IMPOLITE: { enUS: 'Impolite', zhHK: '不禮貌', zhCN: '不礼貌' },
      INDECENT: { enUS: 'Indecent', zhHK: '不雅', zhCN: '不雅' },
      LANGUAGE: { enUS: 'Language', zhHK: '粗言穢語', zhCN: '粗言秽语' },
      PRIVACY: { enUS: 'Privacy', zhHK: '隱私', zhCN: '隐私' },
    },
  },

  CONTACT: {
    FLAG: { FRIEND: { enUS: 'Friend' } },
  },

  CONTENT: {
    FLAG: {
      BLOCKED,
      ADMIN,
      RECALLED: { enUS: 'Recalled', zhHK: '召回 ', zhCN: '召回' },
      INAPPROPRIATE: { enUS: 'Inappropriate Content', zhHK: '不當內容', zhCN: '不当内容' },
    },
  },

  CONTRIBUTION: {
    FLAG: {
      BOOK_ASSIGNMENT: { enUS: 'Assignment', zhHK: '作业', zhCN: '作业' },
      BOOK_SUPPLEMENT: { enUS: 'Supplement', zhHK: '補充', zhCN: '补充' },
    },
  },

  // CLASSROOM: {
  //   FLAG: {},
  // },

  FINANCE: {
    BANK: {
      '003': { enUS: 'Standard Chartered Hong Kong', zhHK: '渣打香港', zhCN: '渣打香港' },
      '004': { enUS: 'Hongkong and Shanghai Banking Corporation', zhHK: '香港上海滙豐銀行', zhCN: '香港上海汇丰银行' },
      '009': { enUS: 'China Construction Bank (Asia)', zhHK: '中國建設銀行(亞洲)股份', zhCN: '中国建设银行（亚洲）' },
      '012': { enUS: 'Bank of China (Hong Kong)', zhHK: '中國銀行(香港)', zhCN: '中国银行（香港）' },
      '015': { enUS: 'Bank of East Asia', zhHK: '東亞銀行', zhCN: '东亚银行' },
      '016': { enUS: 'DBS Bank (Hong Kong)', zhHK: '星展銀行(香港)', zhCN: '星展银行（香港）' },
      '018': { enUS: 'China CITIC Bank International', zhHK: '中信銀行國際', zhCN: '中信银行国际' },
      '020': { enUS: 'CMB Wing Lung Bank', zhHK: '招商永隆銀行', zhCN: '招商永隆银行' },
      '024': { enUS: 'Hang Seng Bank', zhHK: '恒生銀行', zhCN: '恒生银行' },
      '025': { enUS: 'Shanghai Commercial Bank', zhHK: '上海商業銀行', zhCN: '上海商业银行' },
      '027': { enUS: 'Bank of Communications (Hong Kong)', zhHK: '交通銀行(香港)', zhCN: '上海商业银行' },
      '028': { enUS: 'Public Bank (Hong Kong)', zhHK: '大眾銀行(香港)', zhCN: '大众银行（香港）' },
      '035': { enUS: 'OCBC Wing Hang Bank', zhHK: '華僑永亨銀行', zhCN: '华侨永亨银行' },
      '038': { enUS: 'Tai Yau Bank', zhHK: '大有銀行', zhCN: '大有银行' },
      '039': { enUS: 'Chiyu Banking Corporation', zhHK: '集友銀行', zhCN: '集友银行' },
      '040': { enUS: 'Dah Sing Bank', zhHK: '大新銀行', zhCN: '大新银行' },
      '041': { enUS: 'Chong Hing Bank', zhHK: '創興銀行', zhCN: '创兴银行' },
      '043': { enUS: 'Nanyang Commercial Bank', zhHK: '南洋商業銀行', zhCN: '南洋商业银行' },
      '061': { enUS: 'Tai Sang Bank', zhH: '大生銀行', zhCN: '大生银行' },
      '072': {
        enUS: 'Industrial and Commercial Bank of China (Asia)',
        zhHK: '中國工商銀行(亞洲)',
        zhCN: '中国工商银行(亚洲)',
      },
      128: { enUS: 'Fubon Bank (Hong Kong)', zhHK: '富邦銀行(香港)', zhCN: '富邦银行(香港)' },
      250: { enUS: 'Citibank (Hong Kong)', zhHK: '花旗銀行(香港)', zhCN: '花旗银行(香港)' },
    },
    CURRENCY: {
      HKD: { enUS: 'HKD', zhHK: '港幣', zhCN: '港币' },
      CNY: { enUS: 'CNY', zhHK: '人民幣', zhCN: '人民币' },
    },
    // TYPE: { CASH: 0, ELECTRONIC: 1, BANK: 2, VISA: 3, MASTER: 4 },
    METHOD: {
      ALIPAY: { enUS: 'AliPay', zhHK: 'AliPay', zhCN: 'AliPay' },
      BANK: { enUS: 'Bank', zhHK: '銀行', zhCN: '银行' },
      CASH: { enUS: 'Cash', zhHK: '現金', zhCN: '现金' },
      FPS: { enUS: 'Fast Payment System', zhHK: '轉數快', zhCN: '转数快' },
      MASTERCARD: { enUS: 'MasterCard', zhHK: 'MasterCard', zhCN: '万事达' },
      OCTOPUS: { enUS: 'Octopus', zhHK: 'Octopus', zhCN: 'Octopus' },
      OEPAY: { enUS: 'OePay', zhHK: 'oePay', zhCN: 'OePay' },
      PAYME: { enUS: 'Pay Me', zhHK: 'Pay Me', zhCN: 'Pay Me' },
      PAYPAL: { enUS: 'PayPal', zhHK: 'PayPal', zhCN: 'PayPal' },
      WECHAT: { enUS: 'WeChat', zhHK: 'WeChat', zhCN: 'WeChat' },
      VISA: { enUS: 'Visa', zhHK: 'Visa', zhCN: 'Visa' },
    },
  },

  JOB: {
    STATUS: {
      QUEUED: { enUS: 'Queued' },
      RUNNING: { enUS: 'Running' },
      COMPLETED: { enUS: 'Completed' },
      ERROR: { enUS: 'Error in Processing' },
      TIMEOUT: { enUS: 'Time-out' },
    },
  },

  QUESTION: {
    FLAG: {
      SCHOOL: { enUS: 'School' },
      CLOSED: { enUS: 'Closed' },
      DISPUTED: { enUS: 'Dispute' },
      EDA,
      PAID: { enUS: 'Paid' },
    },

    LANG: {
      CSE: { enUS: 'Cantonese supplemented with English', zhHK: '粵語輔以英語', zhCN: '粤语辅以英语' },
      ENG: { enUS: 'English', zhHK: '全英', zhCN: '全英' },
      TWC: { enUS: 'Traditional Chinese with Cantonese Explanation', zhHK: 'TODO', zhCN: 'TODO' },
      SWM: { enUS: 'Simplified Chinese with Mandarin Explanation', zhHK: 'TODO', zhCN: 'TODO' },
    },

    MEMBER: {
      FLAG: { ARCHIVED, IMPORTANT },
    },
  },

  SCHOOL: {
    FUNDING: {
      PRIVATE: { enUS: 'Private', zhHK: '私立', zhCN: '私立' },
      GOVERNMENT: { enUS: 'Government', zhHK: '官校', zhCN: '官校' },
      AIDED: { enUS: 'Aided', zhHK: '資助', zhCN: '资助' },
      DSS: { enUS: 'DSS', zhHK: '直資', zhCN: '	直资' },
      INTERNATIONAL: { enUS: 'International', zhHK: '國際', zhCN: '国际' },
    },
    GENDER: {
      CO_ED: { enUS: 'Co-Ed', zhHK: '男女校', zhCN: '男女校' },
      BOYS: { enUS: 'Boys', zhHK: '', zhCN: '' },
      GIRLS: { enUS: 'Girls', zhHK: '', zhCN: '' },
      OTHERS: { enUS: 'Others', zhHK: '', zhCN: '' },
    },
  },
  SCHOOL_COURSE: {
    STATUS: {
      DRAFT,
      PUBLISHED: { enUS: 'Published', zhHK: '發佈', zhCN: '发布' },
    },
  },

  SYSTEM: {
    LOCALE: {
      enUS: { enUS: 'English', zhHK: '', zhCN: '英文' },
      zhHK: { enUS: 'Traditional Chinese', zhHK: '繁中', zhCN: '繁中' },
      zhCN: { enUS: 'Simplified Chinese', zhHK: '簡中', zhCN: '简中' },
    },
  },

  SUBJECT: {
    FLAG: {
      DSE_CORE: { enUS: 'DSE Core', zhHK: 'DSE 核心科目', zhCN: 'DSE 核心科目' },
      DSE_ELECTIVE: { enUS: 'DSE Elective', zhHK: 'DSE 選修科目', zhCN: 'DSE 选修科目' },
      STEM,
    },
  },

  TENANT: {
    FLAG: {
      BUREAU_STATS: { enUS: 'Education Bureau Stats', zhHK: '教育處', zhCN: '教育处' },
      REPUTABLE: { enUS: 'Reputable', zhHK: '信譽', zhCN: '信誉' },
    },
    SERVICE: {
      AUTH_SERVICE: { enUS: 'Auth Service' },
      CHAT_GROUP: { enUS: 'Chat Group' },
      CLASSROOM: { enUS: 'Classroom' },
      QUESTION: { enUS: 'Question' },
      QUESTION_BID: { enUS: 'Question Bid' },
      TUTOR: { enUS: 'Tutor' },
    },
  },

  TRANSACTION: {
    // TODO: to be implemented
    TYPE: {
      CONSOLIDATED: {
        enUS: 'Consolidated Statement',
        zhHK: 'TODO',
        zhCN: '',
      },
      COUPON: { enUS: 'Coupon Give Away', zhHK: '', zhCN: '' },
      DEPOSIT: { enUS: 'Deposit Money' },
      FEE: { enUS: 'Monthly or Member Fee' },
      SPENDING: { enUS: 'Spending' },
      WITHHELD: { enUS: 'pending, withheld ' },
      REVENUE: { enUS: 'Revenue' },
      REFUND: { enUS: 'Refund' },
    },
  },

  TUTOR: {
    FLAG: {
      SYSTEM_TUTOR: TUTOR,
      // TRUSTED_TUTOR: { enUS: 'Trusted Tutor', zhHK: '高信譽導師', zhCN: '高信誉导师' }, // TODO: EOL ?
      // VERIFIED_TUTOR: { enUS: 'Verified Tutor', zhHK: '認可導師', zhCN: '认可导师' },
    },
  },

  USER: {
    FEATURE: {
      DEVELOPER: { enUS: 'Developer', zhHK: '開發者', zhCN: '开发者' },
      EXPERIMENTAL: { enUS: 'Experimental', zhHK: '試用功能', zhCN: '试用功能' },
      NO_HINT: { enUS: 'No Hint' },
      OFFLINE: { enUS: 'Offline', zhHK: '離線', zhCN: '离线' },
      TLDR: { enUS: 'TLDR', zhHK: 'TLDR', zhCN: 'TLDR' }, // too long don't read for developers
    },

    FLAG: {
      EDA,
      REQUIRE_PASSWORD_CHANGE: { enUS: 'Require Password Change' },
      // TRUSTED_ADVERTISER: { enUS: 'Trusted Advertiser', zhHK: '高信譽廣告商', zhCN: '高信誉广告商' },
      // TRUSTED_ORGANIZER: { enUS: 'Trusted Event Organizer', zhHK: '高信譽活動主辦者', zhCN: '高信誉活动主办者' },
      // TRUSTED_TUTOR: { enUS: 'Trusted Tutor', zhHK: '高信譽導師', zhCN: '高信誉导师' },
    },

    NETWORK_STATUS: {
      AWAY: { enUS: 'Away', zhHK: '暫時離開', zhCN: '暂时离开' }, // user-selected
      IDLE: { enUS: 'Away', zhHK: '暫時離開', zhCN: '暂时离开' }, // system-detected
      BUSY: { enUS: 'Busy', zhHK: '忙碌中', zhCN: '忙碌中' },
      HOLIDAY: { enUS: 'Holiday', zhHK: '休假中', zhCN: '休假中' },
      INVISIBLE: { enUS: 'Invisible', zhHK: '隱形', zhCN: '隐形' },
      OFFLINE: { enUS: 'Offline', zhHK: '離線', zhCN: '离线' },
      ONLINE: { enUS: 'Online', zhHK: '在線', zhCN: '在线' },
    },

    OAUTH2: {
      PROVIDER: {
        GOOGLE: { enUS: 'Google', zhHK: '谷哥', zhCN: '谷哥' },
        FACEBOOK: { enUS: 'Facebook', zhHK: '面書', zhCN: '面书' },
        GITHUB: { enUS: 'Github', zhHK: 'Github', zhCN: 'Github' },
      },
    },
    ROLE: {
      JEST_FAKE_ROLE: { enUS: 'FOR-TESTING-ROLE' },
      ADMIN,
      ROOT: { enUS: 'Root', zhHK: '根用戶', zhCN: '根用户' },
      ADVERTISER: { enUS: 'Advertiser', zhHK: '廣告商', zhCN: '广告商' },
      BUREAU: { enUS: 'Education Bureau', zhHK: '教育處', zhCN: '教育处' },
      GUARDIAN: { enUS: 'Guardian', zhHK: '守護人員', zhCN: '守护人员' },
      ORGANIZER: { enUS: 'Event Organizer', zhHK: '活動主辦者', zhCN: '活动主办者' },
    },
    STATUS: {
      ACCOUNT: { enUS: 'Account', zhHK: '會計', zhCN: '会计' },
      BOT: { enUS: 'Bot', zhHK: '機械人', zhCN: '机械人' },
      CHARITY: { enUS: 'Charity', zhHK: '慈善', zhCN: '慈善' },
      SYSTEM: { enUS: 'System', zhHK: '系統', zhCN: '系统' },
      ACTIVE: { enUS: 'Active', zhHK: '正常', zhCN: '正常' },
      DELETED: { enUS: 'Deleted', zhHK: '已被刪除', zhCN: '已被删除' },
    },

    VIOLATION: { CENSOR },

    WEBPUSH: {
      PERMISSION: {
        DEFAULT: { enUS: 'Unknown', zhHK: '', zhCN: '' },
        GRANTED: { enUS: 'Granted' },
        DENIED: { enUS: 'Denied' },
      },
    },
  },
};
