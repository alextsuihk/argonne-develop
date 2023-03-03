import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateInput: any;
};

export type Announcement = {
  __typename?: 'Announcement';
  _id: Scalars['ID'];
  beginAt: Scalars['Float'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  endAt: Scalars['Float'];
  flags: Array<Scalars['String']>;
  message: Scalars['String'];
  tenant?: Maybe<Scalars['String']>;
  title: Scalars['String'];
  updatedAt: Scalars['Float'];
};

export type AnnouncementInput = {
  beginAt: Scalars['DateInput'];
  endAt: Scalars['DateInput'];
  message: Scalars['String'];
  tenantId?: InputMaybe<Scalars['String']>;
  title: Scalars['String'];
};

export type ApiKey = {
  __typename?: 'ApiKey';
  expireAt: Scalars['Float'];
  note?: Maybe<Scalars['String']>;
  scope: Scalars['String'];
  value: Scalars['String'];
};

export type Assignment = {
  __typename?: 'Assignment';
  _id: Scalars['ID'];
  bookAssignments: Array<BookAssignment>;
  chapter: Scalars['String'];
  classroom?: Maybe<Scalars['String']>;
  createdAt: Scalars['Float'];
  deadline: Scalars['Float'];
  flags: Array<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  updatedAt: Scalars['Float'];
};

export type AssignmentInput = {
  chapter?: InputMaybe<Scalars['String']>;
  classroom: Scalars['String'];
  deadline: Scalars['Float'];
  flags: Array<Scalars['String']>;
  homeworks: Array<HomeworkInput>;
  maxScores: Array<InputMaybe<Scalars['Int']>>;
  questions: Array<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
};

export type AuthConflict = {
  __typename?: 'AuthConflict';
  exceedLogin?: Maybe<Scalars['Int']>;
  ip?: Maybe<Scalars['String']>;
  maxLogin?: Maybe<Scalars['Int']>;
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  accessToken?: Maybe<Scalars['String']>;
  accessTokenExpireAt?: Maybe<Scalars['Float']>;
  conflict?: Maybe<AuthConflict>;
  refreshToken?: Maybe<Scalars['String']>;
  refreshTokenExpireAt?: Maybe<Scalars['Float']>;
  user: User;
};

export type AuthSuccessfulResponse = {
  __typename?: 'AuthSuccessfulResponse';
  accessToken: Scalars['String'];
  accessTokenExpireAt: Scalars['Float'];
  refreshToken: Scalars['String'];
  refreshTokenExpireAt: Scalars['Float'];
  user: User;
};

export type Bid = {
  __typename?: 'Bid';
  _id: Scalars['ID'];
  messages: Array<BidMessage>;
};

export type BidMessage = {
  __typename?: 'BidMessage';
  createdAt: Scalars['Float'];
  creator: Scalars['String'];
  data: Content;
};

export type Book = {
  __typename?: 'Book';
  _id: Scalars['ID'];
  assignments?: Maybe<Array<BookAssignment>>;
  chatGroup: Scalars['String'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  level: Scalars['String'];
  publisher: Scalars['String'];
  remarks?: Maybe<Array<Remark>>;
  revisions: Array<BookRevision>;
  subTitle?: Maybe<Scalars['String']>;
  subjects: Array<Scalars['String']>;
  supplements: Array<BookSupplement>;
  title: Scalars['String'];
  updatedAt: Scalars['Float'];
};

export type BookAssignment = {
  __typename?: 'BookAssignment';
  _id: Scalars['ID'];
  chapter: Scalars['String'];
  content: Content;
  contribution: Contribution;
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  dynParams: Array<Scalars['String']>;
  examples: Array<Content>;
  solutions: Array<Scalars['String']>;
  updatedAt: Scalars['Float'];
};

export type BookAssignmentInput = {
  chapter: Scalars['String'];
  content: Scalars['String'];
  contribution: ContributionInput;
  dynParams: Array<Scalars['String']>;
  examples: Array<Scalars['String']>;
  solutions: Array<Scalars['String']>;
};

export type BookInput = {
  level: Scalars['String'];
  publisher: Scalars['String'];
  subTitle?: InputMaybe<Scalars['String']>;
  subjects: Array<Scalars['String']>;
  title: Scalars['String'];
};

export type BookRevision = {
  __typename?: 'BookRevision';
  _id: Scalars['String'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  imageUrls: Array<Scalars['String']>;
  isbn?: Maybe<Scalars['String']>;
  listPrice?: Maybe<Scalars['Int']>;
  rev: Scalars['String'];
  year: Scalars['Int'];
};

export type BookRevisionInput = {
  isbn?: InputMaybe<Scalars['String']>;
  listPrice?: InputMaybe<Scalars['Int']>;
  rev: Scalars['String'];
  year: Scalars['Int'];
};

export type BookSupplement = {
  __typename?: 'BookSupplement';
  _id: Scalars['ID'];
  chapter: Scalars['String'];
  contribution: Contribution;
  deletedAt?: Maybe<Scalars['Float']>;
};

export type BookSupplementInput = {
  chapter: Scalars['String'];
  contribution: ContributionInput;
};

export enum CacheControlScope {
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export type Chat = {
  __typename?: 'Chat';
  _id: Scalars['ID'];
  contents?: Maybe<Array<Maybe<Scalars['String']>>>;
  contentsToken?: Maybe<Scalars['String']>;
  createdAt: Scalars['Float'];
  flags: Array<Scalars['String']>;
  members: Array<Maybe<Member>>;
  parents: Array<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  updatedAt: Scalars['Float'];
};

export type ChatGroup = {
  __typename?: 'ChatGroup';
  _id: Scalars['ID'];
  adminKey?: Maybe<Scalars['String']>;
  admins: Array<Scalars['String']>;
  chats: Array<Scalars['String']>;
  createdAt: Scalars['Float'];
  description?: Maybe<Scalars['String']>;
  flags: Array<Scalars['String']>;
  key?: Maybe<Scalars['String']>;
  logoUrl?: Maybe<Scalars['String']>;
  membership: Scalars['String'];
  tenant?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  updatedAt: Scalars['Float'];
  url?: Maybe<Scalars['String']>;
  users: Array<Scalars['String']>;
};

export type Classroom = {
  __typename?: 'Classroom';
  _id: Scalars['ID'];
  assignments: Array<Scalars['String']>;
  books: Array<Scalars['String']>;
  chats: Array<Scalars['String']>;
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  level: Scalars['String'];
  remarks?: Maybe<Array<Remark>>;
  room?: Maybe<Scalars['String']>;
  schedule?: Maybe<Scalars['String']>;
  schoolClass: Scalars['String'];
  students: Array<Scalars['String']>;
  subject: Scalars['String'];
  teachers: Array<Scalars['String']>;
  tenant?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  updatedAt: Scalars['Float'];
  year: Scalars['String'];
};

export type Contact = {
  __typename?: 'Contact';
  _id: Scalars['ID'];
  avatarUrl?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  status: Scalars['String'];
  tenants: Array<Scalars['String']>;
};

export type Content = {
  __typename?: 'Content';
  _id: Scalars['ID'];
  createdAt: Scalars['Float'];
  creator: Scalars['String'];
  data: Scalars['String'];
  flags: Array<Scalars['String']>;
  parents: Array<Scalars['String']>;
  updatedAt: Scalars['Float'];
};

export type Contribution = {
  __typename?: 'Contribution';
  _id: Scalars['ID'];
  contributors: Array<Contributor>;
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  description?: Maybe<Scalars['String']>;
  title: Scalars['String'];
  updatedAt: Scalars['Float'];
  urls: Array<Scalars['String']>;
};

export type ContributionInput = {
  contributors: Array<ContributorInput>;
  description?: InputMaybe<Scalars['String']>;
  title: Scalars['String'];
  urls: Array<Scalars['String']>;
};

export type Contributor = {
  __typename?: 'Contributor';
  _id: Scalars['ID'];
  name: Scalars['String'];
  school: Scalars['String'];
  user: Scalars['String'];
};

export type ContributorInput = {
  name: Scalars['String'];
  school: Scalars['String'];
  user: Scalars['String'];
};

export type CoordinatesInput = {
  lat?: InputMaybe<Scalars['Float']>;
  lng?: InputMaybe<Scalars['Float']>;
};

export type Credential = {
  __typename?: 'Credential';
  _id: Scalars['String'];
  proofs?: Maybe<Array<Scalars['String']>>;
  title: Scalars['String'];
  updatedAt: Scalars['Float'];
  verifiedAt?: Maybe<Scalars['Float']>;
};

export type DeregisterResponse = {
  __typename?: 'DeregisterResponse';
  code?: Maybe<Scalars['String']>;
  days?: Maybe<Scalars['Int']>;
};

export type District = {
  __typename?: 'District';
  _id: Scalars['ID'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  name: Locale;
  region: Locale;
  remarks?: Maybe<Array<Remark>>;
  updatedAt: Scalars['Float'];
};

export type DistrictInput = {
  name: LocaleInput;
  region: LocaleInput;
};

export type Homework = {
  __typename?: 'Homework';
  _id: Scalars['ID'];
  answer?: Maybe<Scalars['String']>;
  answeredAt?: Maybe<Scalars['Float']>;
  assignmentIdx: Scalars['Int'];
  contents: Array<Scalars['String']>;
  createdAt: Scalars['Float'];
  dynParamIdx?: Maybe<Scalars['Int']>;
  score?: Maybe<Scalars['Int']>;
  timeSpent?: Maybe<Scalars['Int']>;
  updatedAt: Scalars['Float'];
  user: Scalars['String'];
  viewedExamples?: Maybe<Array<Scalars['Int']>>;
};

export type HomeworkInput = {
  assignmentIdx: Scalars['Int'];
  dynParamIdx?: InputMaybe<Scalars['Int']>;
  user: Scalars['String'];
};

export type Level = {
  __typename?: 'Level';
  _id: Scalars['ID'];
  code: Scalars['String'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  name: Locale;
  nextLevel?: Maybe<Scalars['String']>;
  remarks?: Maybe<Array<Remark>>;
  updatedAt: Scalars['Float'];
};

export type LevelInput = {
  code: Scalars['String'];
  name: LocaleInput;
};

export type Locale = {
  __typename?: 'Locale';
  enUS?: Maybe<Scalars['String']>;
  zhCN?: Maybe<Scalars['String']>;
  zhHK?: Maybe<Scalars['String']>;
};

export type LocaleInput = {
  enUS?: InputMaybe<Scalars['String']>;
  zhCN?: InputMaybe<Scalars['String']>;
  zhHK?: InputMaybe<Scalars['String']>;
};

export type LocationPoint = {
  __typename?: 'LocationPoint';
  coordinates?: Maybe<Array<Scalars['String']>>;
  type?: Maybe<Scalars['String']>;
};

export type LogoutOtherResponse = {
  __typename?: 'LogoutOtherResponse';
  code?: Maybe<Scalars['String']>;
  count?: Maybe<Scalars['Int']>;
};

export type Member = {
  __typename?: 'Member';
  flags: Array<Scalars['String']>;
  lastViewedAt?: Maybe<Scalars['Float']>;
  ranking?: Maybe<Scalars['Int']>;
  user: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _?: Maybe<Scalars['String']>;
  addAnnouncement: Announcement;
  addAssignment: Assignment;
  addBook: Book;
  addBookAssignment: Book;
  addBookRemark: Book;
  addBookRevision: Book;
  addBookRevisionImage: Book;
  addBookSupplement: Book;
  addChat: Chat;
  addChatGroup: ChatGroup;
  addChatGroupAdmins: ChatGroup;
  addChatGroupUsers: ChatGroup;
  addClassroom: Classroom;
  addClassroomRemark: Classroom;
  addClassroomStudents: Classroom;
  addClassroomTeachers: Classroom;
  addContact: Contact;
  addContribution: Contribution;
  addCustomTypography: Typography;
  addDistrict: District;
  addDistrictRemark: District;
  addEmail: User;
  addLevel: Level;
  addLevelRemark: Level;
  addPresignedUrl: PresignedUrl;
  addPublisher: Publisher;
  addPublisherRemark: Publisher;
  addQuestion: Question;
  addRole: Array<Scalars['String']>;
  addSchool: School;
  addSchoolRemark: School;
  addSubject: Subject;
  addSubjectRemark: Subject;
  addTag: Tag;
  addTagRemark: Tag;
  addTenant: Tenant;
  addTenantRemark: Tenant;
  addTutor: Tutor;
  addTutorCredential: Tutor;
  addTutorRemark: Tutor;
  addTutorSpecialty: Tutor;
  addTypography: Typography;
  addTypographyRemark: Typography;
  addUser: User;
  analyticSession: StatusResponse;
  attachChatToClassroom: Chat;
  bidQuestion: Question;
  bindTenant: StatusResponse;
  blockChatContent: Chat;
  changePassword: StatusResponse;
  clearChatFlag: Chat;
  deregister: DeregisterResponse;
  impersonateStart: AuthSuccessfulResponse;
  impersonateStop: StatusResponse;
  joinBookChat: StatusResponse;
  joinChatGroup: ChatGroup;
  leaveChatGroup: StatusResponse;
  login: AuthResponse;
  loginToken: Scalars['String'];
  loginWithId: AuthResponse;
  loginWithToken: AuthResponse;
  logout: StatusResponse;
  logoutOther: LogoutOtherResponse;
  oAuth2: AuthResponse;
  oAuth2Connect: StatusResponse;
  oAuth2Disconnect: StatusResponse;
  recallChatContent: Chat;
  recoverClassroom: Classroom;
  register: AuthSuccessfulResponse;
  removeAnnouncement: StatusResponse;
  removeAssignment: StatusResponse;
  removeBook: StatusResponse;
  removeBookAssignment: Book;
  removeBookRevision: Book;
  removeBookRevisionImage: Book;
  removeBookSupplement: Book;
  removeChatGroupUsers: ChatGroup;
  removeClassroom: StatusResponse;
  removeClassroomStudents: Classroom;
  removeClassroomTeachers: Classroom;
  removeContact: StatusResponse;
  removeContribution: StatusResponse;
  removeCustomTypography: Typography;
  removeDistrict: StatusResponse;
  removeEmail: User;
  removeLevel: StatusResponse;
  removePublisher: StatusResponse;
  removeQuestion: StatusResponse;
  removeRole: Array<Scalars['String']>;
  removeSchool: StatusResponse;
  removeSubject: StatusResponse;
  removeTag: StatusResponse;
  removeTenant: StatusResponse;
  removeTutor: StatusResponse;
  removeTutorCredential: Tutor;
  removeTutorSpecialty: Tutor;
  removeTypography: StatusResponse;
  renewToken: AuthSuccessfulResponse;
  resetPasswordConfirm: StatusResponse;
  resetPasswordRequest: StatusResponse;
  sendTestEmail: StatusResponse;
  setChatFlag: Chat;
  setPrimaryEmail: User;
  toAdminChatGroup: ChatGroup;
  toAlexChatGroup: ChatGroup;
  unbindTenant: StatusResponse;
  updateAssignment?: Maybe<Assignment>;
  updateBook: Book;
  updateChatGroup: ChatGroup;
  updateChatLastViewedAt: Chat;
  updateChatTitle: Chat;
  updateClassroom?: Maybe<Classroom>;
  updateContact: Contact;
  updateContribution: Contribution;
  updateDistrict: District;
  updateLevel: Level;
  updateNetworkStatus: User;
  updatePublisher: Publisher;
  updateQuestion: Question;
  updateSchool: School;
  updateSubject: Subject;
  updateTag: Tag;
  updateTenantCore: Tenant;
  updateTenantExtra: Tenant;
  updateTutor: Tutor;
  updateTypography: Typography;
  updateUserProfile: User;
  updateUserSchool: User;
  verifyTutorCredential: Tutor;
};


export type MutationAddAnnouncementArgs = {
  announcement: AnnouncementInput;
};


export type MutationAddAssignmentArgs = {
  assignment: AssignmentInput;
};


export type MutationAddBookArgs = {
  book: BookInput;
};


export type MutationAddBookAssignmentArgs = {
  assignment: BookAssignmentInput;
  id: Scalars['ID'];
};


export type MutationAddBookRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddBookRevisionArgs = {
  id: Scalars['ID'];
  revision: BookRevisionInput;
};


export type MutationAddBookRevisionImageArgs = {
  id: Scalars['ID'];
  revisionId: Scalars['String'];
  url: Scalars['String'];
};


export type MutationAddBookSupplementArgs = {
  id: Scalars['ID'];
  supplement: BookSupplementInput;
};


export type MutationAddChatArgs = {
  content: Scalars['String'];
  id?: InputMaybe<Scalars['ID']>;
  parent: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
};


export type MutationAddChatGroupArgs = {
  description?: InputMaybe<Scalars['String']>;
  logoUrl?: InputMaybe<Scalars['String']>;
  membership: Scalars['String'];
  tenantId: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
  userIds: Array<Scalars['String']>;
};


export type MutationAddChatGroupAdminsArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationAddChatGroupUsersArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationAddClassroomArgs = {
  books: Array<Scalars['String']>;
  level: Scalars['String'];
  room?: InputMaybe<Scalars['String']>;
  schedule?: InputMaybe<Scalars['String']>;
  schoolClass: Scalars['String'];
  subject: Scalars['String'];
  tenantId: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
  year: Scalars['String'];
};


export type MutationAddClassroomRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddClassroomStudentsArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationAddClassroomTeachersArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationAddContactArgs = {
  token: Scalars['String'];
};


export type MutationAddContributionArgs = {
  book: ContributionInput;
};


export type MutationAddCustomTypographyArgs = {
  custom: TypographyCustomInput;
  id: Scalars['ID'];
  tenantId: Scalars['String'];
};


export type MutationAddDistrictArgs = {
  district: DistrictInput;
};


export type MutationAddDistrictRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddEmailArgs = {
  email: Scalars['String'];
};


export type MutationAddLevelArgs = {
  level: LevelInput;
};


export type MutationAddLevelRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddPresignedUrlArgs = {
  bucketType: Scalars['String'];
  ext: Scalars['String'];
};


export type MutationAddPublisherArgs = {
  publisher: PublisherInput;
};


export type MutationAddPublisherRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddQuestionArgs = {
  question: QuestionInput;
  tenantId: Scalars['String'];
};


export type MutationAddRoleArgs = {
  id: Scalars['ID'];
  role?: InputMaybe<Scalars['String']>;
};


export type MutationAddSchoolArgs = {
  school: SchoolInput;
};


export type MutationAddSchoolRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddSubjectArgs = {
  subject: SubjectInput;
};


export type MutationAddSubjectRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddTagArgs = {
  tag: TagInput;
};


export type MutationAddTagRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddTenantArgs = {
  tenant: TenantCoreInput;
};


export type MutationAddTenantRemarkArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationAddTutorArgs = {
  tenantId: Scalars['String'];
  userId: Scalars['String'];
};


export type MutationAddTutorCredentialArgs = {
  id: Scalars['ID'];
  proofs: Array<Scalars['String']>;
  title: Scalars['String'];
};


export type MutationAddTutorRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddTutorSpecialtyArgs = {
  id: Scalars['ID'];
  lang: Scalars['String'];
  level: Scalars['String'];
  note?: InputMaybe<Scalars['String']>;
  subject: Scalars['String'];
};


export type MutationAddTypographyArgs = {
  typography: TypographyInput;
};


export type MutationAddTypographyRemarkArgs = {
  id: Scalars['ID'];
  remark: Scalars['String'];
};


export type MutationAddUserArgs = {
  email: Scalars['String'];
  tenantId: Scalars['String'];
};


export type MutationAnalyticSessionArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  fullscreen: Scalars['Boolean'];
  token: Scalars['String'];
};


export type MutationAttachChatToClassroomArgs = {
  classroomId: Scalars['String'];
  id: Scalars['ID'];
  parent: Scalars['String'];
};


export type MutationBidQuestionArgs = {
  accept?: InputMaybe<Scalars['Boolean']>;
  bidId: Scalars['String'];
  bidderIds: Array<Scalars['String']>;
  id: Scalars['ID'];
  message: Scalars['String'];
  price?: InputMaybe<Scalars['Int']>;
};


export type MutationBindTenantArgs = {
  token: Scalars['String'];
};


export type MutationBlockChatContentArgs = {
  contentId: Scalars['String'];
  id: Scalars['ID'];
  parent: Scalars['String'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationChangePasswordArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  currPassword: Scalars['String'];
  newPassword: Scalars['String'];
  refreshToken: Scalars['String'];
};


export type MutationClearChatFlagArgs = {
  flag: Scalars['String'];
  id: Scalars['ID'];
  parent: Scalars['String'];
};


export type MutationDeregisterArgs = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  password: Scalars['String'];
};


export type MutationImpersonateStartArgs = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  impersonatedAsId: Scalars['String'];
};


export type MutationImpersonateStopArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  refreshToken: Scalars['String'];
};


export type MutationJoinBookChatArgs = {
  id: Scalars['ID'];
};


export type MutationJoinChatGroupArgs = {
  id: Scalars['ID'];
};


export type MutationLeaveChatGroupArgs = {
  id: Scalars['ID'];
};


export type MutationLoginArgs = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  email: Scalars['String'];
  force?: InputMaybe<Scalars['Boolean']>;
  isPublic?: InputMaybe<Scalars['Boolean']>;
  password: Scalars['String'];
};


export type MutationLoginTokenArgs = {
  expiresIn?: InputMaybe<Scalars['Int']>;
  tenantId: Scalars['String'];
  userId: Scalars['String'];
};


export type MutationLoginWithIdArgs = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  force?: InputMaybe<Scalars['Boolean']>;
  isPublic?: InputMaybe<Scalars['Boolean']>;
  loginId: Scalars['String'];
  password: Scalars['String'];
  tenantId: Scalars['String'];
};


export type MutationLoginWithTokenArgs = {
  token: Scalars['String'];
};


export type MutationLogoutArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  refreshToken: Scalars['String'];
};


export type MutationLogoutOtherArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  refreshToken: Scalars['String'];
};


export type MutationOAuth2Args = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  force?: InputMaybe<Scalars['Boolean']>;
  isPublic?: InputMaybe<Scalars['Boolean']>;
  provider: Scalars['String'];
  token: Scalars['String'];
};


export type MutationOAuth2ConnectArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  provider: Scalars['String'];
  token: Scalars['String'];
};


export type MutationOAuth2DisconnectArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  provider: Scalars['String'];
};


export type MutationRecallChatContentArgs = {
  contentId: Scalars['String'];
  id: Scalars['ID'];
  parent: Scalars['String'];
};


export type MutationRecoverClassroomArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRegisterArgs = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  email: Scalars['String'];
  isPublic?: InputMaybe<Scalars['Boolean']>;
  name: Scalars['String'];
  password: Scalars['String'];
};


export type MutationRemoveAnnouncementArgs = {
  id: Scalars['ID'];
};


export type MutationRemoveAssignmentArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveBookArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveBookAssignmentArgs = {
  assignmentId: Scalars['String'];
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveBookRevisionArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
  revisionId: Scalars['String'];
};


export type MutationRemoveBookRevisionImageArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
  revisionId: Scalars['String'];
  url: Scalars['String'];
};


export type MutationRemoveBookSupplementArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
  supplementId: Scalars['String'];
};


export type MutationRemoveChatGroupUsersArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationRemoveClassroomArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveClassroomStudentsArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationRemoveClassroomTeachersArgs = {
  id: Scalars['ID'];
  userIds: Array<Scalars['String']>;
};


export type MutationRemoveContactArgs = {
  id: Scalars['ID'];
};


export type MutationRemoveContributionArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveCustomTypographyArgs = {
  id: Scalars['ID'];
  tenantId: Scalars['String'];
};


export type MutationRemoveDistrictArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveEmailArgs = {
  email: Scalars['String'];
};


export type MutationRemoveLevelArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemovePublisherArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveQuestionArgs = {
  id: Scalars['ID'];
};


export type MutationRemoveRoleArgs = {
  id: Scalars['ID'];
  role?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveSchoolArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveSubjectArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveTagArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveTenantArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveTutorArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRemoveTutorCredentialArgs = {
  credentialId: Scalars['String'];
  id: Scalars['ID'];
};


export type MutationRemoveTutorSpecialtyArgs = {
  id: Scalars['ID'];
  specialtyId: Scalars['String'];
};


export type MutationRemoveTypographyArgs = {
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
};


export type MutationRenewTokenArgs = {
  clientHash?: InputMaybe<Scalars['String']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  isPublic?: InputMaybe<Scalars['Boolean']>;
  refreshToken: Scalars['String'];
};


export type MutationResetPasswordConfirmArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  password: Scalars['String'];
  token: Scalars['String'];
};


export type MutationResetPasswordRequestArgs = {
  coordinates?: InputMaybe<CoordinatesInput>;
  email: Scalars['String'];
};


export type MutationSendTestEmailArgs = {
  email: Scalars['String'];
  id: Scalars['ID'];
};


export type MutationSetChatFlagArgs = {
  flag: Scalars['String'];
  id: Scalars['ID'];
  parent: Scalars['String'];
};


export type MutationSetPrimaryEmailArgs = {
  email: Scalars['String'];
};


export type MutationToAdminChatGroupArgs = {
  content: Scalars['String'];
};


export type MutationToAlexChatGroupArgs = {
  content: Scalars['String'];
};


export type MutationUnbindTenantArgs = {
  id: Scalars['ID'];
  userId: Scalars['String'];
};


export type MutationUpdateAssignmentArgs = {
  answer?: InputMaybe<Scalars['String']>;
  content?: InputMaybe<Scalars['String']>;
  homeworkId: Scalars['String'];
  id: Scalars['ID'];
  score?: InputMaybe<Scalars['Int']>;
  shareTo?: InputMaybe<Scalars['String']>;
  timeSpent?: InputMaybe<Scalars['Int']>;
  viewExample?: InputMaybe<Scalars['Int']>;
};


export type MutationUpdateBookArgs = {
  book: BookInput;
  id: Scalars['ID'];
};


export type MutationUpdateChatGroupArgs = {
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['ID'];
  logoUrl?: InputMaybe<Scalars['String']>;
  membership: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
};


export type MutationUpdateChatLastViewedAtArgs = {
  id: Scalars['ID'];
  parent: Scalars['String'];
  timestamp: Scalars['DateInput'];
};


export type MutationUpdateChatTitleArgs = {
  id: Scalars['ID'];
  parent: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
};


export type MutationUpdateClassroomArgs = {
  books: Array<Scalars['String']>;
  id: Scalars['ID'];
  room?: InputMaybe<Scalars['String']>;
  schedule?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
};


export type MutationUpdateContactArgs = {
  id: Scalars['ID'];
  name: Scalars['String'];
};


export type MutationUpdateContributionArgs = {
  book: ContributionInput;
  id: Scalars['ID'];
};


export type MutationUpdateDistrictArgs = {
  district: DistrictInput;
  id: Scalars['ID'];
};


export type MutationUpdateLevelArgs = {
  id: Scalars['ID'];
  level: LevelInput;
};


export type MutationUpdateNetworkStatusArgs = {
  networkStatus: Scalars['String'];
};


export type MutationUpdatePublisherArgs = {
  id: Scalars['ID'];
  publisher: PublisherInput;
};


export type MutationUpdateQuestionArgs = {
  content?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  pay?: InputMaybe<Scalars['Boolean']>;
  ranking?: InputMaybe<Scalars['Int']>;
  shareTo?: InputMaybe<Scalars['String']>;
  timeSpent?: InputMaybe<Scalars['Int']>;
};


export type MutationUpdateSchoolArgs = {
  id: Scalars['ID'];
  school: SchoolInput;
};


export type MutationUpdateSubjectArgs = {
  id: Scalars['ID'];
  subject: SubjectInput;
};


export type MutationUpdateTagArgs = {
  id: Scalars['ID'];
  tag: TagInput;
};


export type MutationUpdateTenantCoreArgs = {
  id: Scalars['ID'];
  tenant: TenantCoreInput;
};


export type MutationUpdateTenantExtraArgs = {
  id: Scalars['ID'];
  tenant: TenantExtraInput;
};


export type MutationUpdateTutorArgs = {
  id: Scalars['ID'];
  intro: Scalars['String'];
  officeHour?: InputMaybe<Scalars['String']>;
};


export type MutationUpdateTypographyArgs = {
  id: Scalars['ID'];
  typography: TypographyInput;
};


export type MutationUpdateUserProfileArgs = {
  user: UserProfileInput;
};


export type MutationUpdateUserSchoolArgs = {
  id: Scalars['ID'];
  level: Scalars['String'];
  school: Scalars['String'];
  schoolClass: Scalars['String'];
  studentId: Scalars['String'];
  year: Scalars['String'];
};


export type MutationVerifyTutorCredentialArgs = {
  credentialId: Scalars['String'];
  id: Scalars['ID'];
};

export type OAuth2 = {
  __typename?: 'OAuth2';
  _id: Scalars['String'];
  avatarUrl?: Maybe<Scalars['String']>;
  email: Scalars['String'];
  provider: Scalars['String'];
};

export type PaymentMethod = {
  __typename?: 'PaymentMethod';
  account: Scalars['String'];
  bank?: Maybe<Scalars['String']>;
  currency: Scalars['String'];
  payable: Scalars['Boolean'];
  receivable: Scalars['Boolean'];
  type: Scalars['String'];
};

export type PresignedUrl = {
  __typename?: 'PresignedUrl';
  expiry: Scalars['Int'];
  url: Scalars['String'];
};

export type Publisher = {
  __typename?: 'Publisher';
  _id: Scalars['ID'];
  admins: Array<Scalars['String']>;
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  logoUrl?: Maybe<Scalars['String']>;
  name?: Maybe<Locale>;
  phones: Array<Scalars['String']>;
  remarks?: Maybe<Array<Remark>>;
  updatedAt: Scalars['Float'];
  website?: Maybe<Scalars['String']>;
};

export type PublisherInput = {
  admins: Array<Scalars['String']>;
  logoUrl?: InputMaybe<Scalars['String']>;
  name: LocaleInput;
  phones: Array<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export type Query = {
  __typename?: 'Query';
  _?: Maybe<Scalars['String']>;
  announcement?: Maybe<Announcement>;
  announcements: Array<Announcement>;
  assignment?: Maybe<Assignment>;
  assignments: Array<Assignment>;
  book?: Maybe<Book>;
  books: Array<Book>;
  chat?: Maybe<Chat>;
  chatGroup?: Maybe<ChatGroup>;
  chatGroups: Array<ChatGroup>;
  chats: Array<Chat>;
  classroom?: Maybe<Classroom>;
  classrooms: Array<Classroom>;
  contact?: Maybe<Contact>;
  contactToken: Scalars['String'];
  contacts: Array<Contact>;
  content?: Maybe<Content>;
  contribution?: Maybe<Contribution>;
  contributions: Array<Contribution>;
  district?: Maybe<District>;
  districts: Array<District>;
  isEmailAvailable?: Maybe<Scalars['Boolean']>;
  isIsbnAvailable: Scalars['Boolean'];
  level?: Maybe<Level>;
  levels: Array<Level>;
  listSockets: Array<Scalars['String']>;
  listTokens: Array<Token>;
  ping: Scalars['String'];
  publisher?: Maybe<Publisher>;
  publishers: Array<Publisher>;
  question?: Maybe<Question>;
  questions: Array<Question>;
  role: Array<Scalars['String']>;
  school?: Maybe<School>;
  schools: Array<School>;
  serverInfo: ServerInfo;
  subject?: Maybe<Subject>;
  subjects: Array<Subject>;
  tag?: Maybe<Tag>;
  tags: Array<Tag>;
  tenantToken: TenantToken;
  tenants: Array<Tenant>;
  time: Scalars['Float'];
  tutor?: Maybe<Tutor>;
  tutorRanking?: Maybe<TutorRanking>;
  tutorRankings: Array<TutorRanking>;
  tutors: Array<Tutor>;
  typographies: Array<Typography>;
  typography?: Maybe<Typography>;
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryAnnouncementArgs = {
  id: Scalars['ID'];
};


export type QueryAnnouncementsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryAssignmentArgs = {
  id: Scalars['ID'];
};


export type QueryAssignmentsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryBookArgs = {
  id: Scalars['ID'];
};


export type QueryBooksArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryChatArgs = {
  id: Scalars['ID'];
};


export type QueryChatGroupArgs = {
  id: Scalars['ID'];
};


export type QueryChatGroupsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryChatsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryClassroomArgs = {
  id: Scalars['ID'];
};


export type QueryClassroomsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryContactArgs = {
  id: Scalars['ID'];
};


export type QueryContentArgs = {
  id: Scalars['ID'];
  token: Scalars['String'];
  updateAfter?: InputMaybe<Scalars['DateInput']>;
};


export type QueryContributionArgs = {
  id: Scalars['ID'];
};


export type QueryContributionsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryDistrictArgs = {
  id: Scalars['ID'];
};


export type QueryDistrictsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryIsEmailAvailableArgs = {
  email: Scalars['String'];
};


export type QueryIsIsbnAvailableArgs = {
  isbn: Scalars['String'];
};


export type QueryLevelArgs = {
  id: Scalars['ID'];
};


export type QueryLevelsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryPublisherArgs = {
  id: Scalars['ID'];
};


export type QueryPublishersArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryQuestionArgs = {
  id: Scalars['ID'];
};


export type QueryQuestionsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryRoleArgs = {
  id: Scalars['ID'];
};


export type QuerySchoolArgs = {
  id: Scalars['ID'];
};


export type QuerySchoolsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QuerySubjectArgs = {
  id: Scalars['ID'];
};


export type QuerySubjectsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryTagArgs = {
  id: Scalars['ID'];
};


export type QueryTagsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryTenantTokenArgs = {
  expiresIn?: InputMaybe<Scalars['Int']>;
  id: Scalars['ID'];
};


export type QueryTenantsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryTutorArgs = {
  id: Scalars['ID'];
};


export type QueryTutorRankingArgs = {
  id: Scalars['ID'];
};


export type QueryTutorsArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryTypographiesArgs = {
  query?: InputMaybe<QueryInput>;
};


export type QueryTypographyArgs = {
  id: Scalars['ID'];
};


export type QueryUserArgs = {
  id: Scalars['ID'];
};


export type QueryUsersArgs = {
  query?: InputMaybe<QueryInput>;
};

export type QueryInput = {
  search?: InputMaybe<Scalars['String']>;
  skipDeleted?: InputMaybe<Scalars['Boolean']>;
  updatedAfter?: InputMaybe<Scalars['DateInput']>;
  updatedBefore?: InputMaybe<Scalars['DateInput']>;
};

export type Question = {
  __typename?: 'Question';
  _id: Scalars['ID'];
  assignmentIdx?: Maybe<Scalars['String']>;
  bidders: Array<Scalars['String']>;
  bids: Array<Bid>;
  book?: Maybe<Scalars['String']>;
  bookRev?: Maybe<Scalars['String']>;
  chapter?: Maybe<Scalars['String']>;
  classroom?: Maybe<Scalars['String']>;
  content: Content;
  contents: Array<Content>;
  createdAt: Scalars['Float'];
  deadline: Scalars['Float'];
  dynParamIdx?: Maybe<Scalars['String']>;
  flags: Array<Scalars['String']>;
  lang: Scalars['String'];
  level: Scalars['String'];
  members: Array<Member>;
  paidAt?: Maybe<Scalars['Float']>;
  price?: Maybe<Scalars['Int']>;
  students: Array<Scalars['String']>;
  subject: Scalars['String'];
  tenant: Scalars['String'];
  timeSpent?: Maybe<Scalars['Int']>;
  tutors?: Maybe<Array<Scalars['String']>>;
  updatedAt: Scalars['Float'];
};

export type QuestionBidInput = {
  accept?: InputMaybe<Scalars['Boolean']>;
  bidId: Scalars['String'];
  bidders: Array<Scalars['String']>;
  id: Scalars['ID'];
  message: Scalars['String'];
  price?: InputMaybe<Scalars['Int']>;
};

export type QuestionInput = {
  assignmentIdx?: InputMaybe<Scalars['String']>;
  book?: InputMaybe<Scalars['String']>;
  bookRev?: InputMaybe<Scalars['String']>;
  chapter?: InputMaybe<Scalars['String']>;
  classroom?: InputMaybe<Scalars['String']>;
  content: Scalars['String'];
  deadline: Scalars['Float'];
  dynParamIdx?: InputMaybe<Scalars['String']>;
  homework?: InputMaybe<Scalars['String']>;
  lang: Scalars['String'];
  level: Scalars['String'];
  price?: InputMaybe<Scalars['Int']>;
  subject: Scalars['String'];
  tenantId?: InputMaybe<Scalars['String']>;
  tutors: Array<Scalars['String']>;
};

export type Remark = {
  __typename?: 'Remark';
  _id: Scalars['ID'];
  m: Scalars['String'];
  t: Scalars['Float'];
  u?: Maybe<Scalars['String']>;
};

export type School = {
  __typename?: 'School';
  _id: Scalars['ID'];
  address?: Maybe<Locale>;
  band?: Maybe<Scalars['String']>;
  code?: Maybe<Scalars['String']>;
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  district: Scalars['String'];
  emi?: Maybe<Scalars['Boolean']>;
  flags: Array<Scalars['String']>;
  funding?: Maybe<Scalars['String']>;
  gender?: Maybe<Scalars['String']>;
  levels: Array<Scalars['String']>;
  location?: Maybe<LocationPoint>;
  logoUrl?: Maybe<Scalars['String']>;
  name: Locale;
  phones: Array<Scalars['String']>;
  religion?: Maybe<Scalars['String']>;
  remarks?: Maybe<Array<Remark>>;
  updatedAt: Scalars['Float'];
  website?: Maybe<Scalars['String']>;
};

export type SchoolInput = {
  address?: InputMaybe<LocaleInput>;
  band?: InputMaybe<Scalars['String']>;
  code: Scalars['String'];
  district?: InputMaybe<Scalars['String']>;
  emi?: InputMaybe<Scalars['Boolean']>;
  funding?: InputMaybe<Scalars['String']>;
  gender?: InputMaybe<Scalars['String']>;
  levels: Array<Scalars['String']>;
  logoUrl?: InputMaybe<Scalars['String']>;
  name: LocaleInput;
  phones: Array<Scalars['String']>;
  religion?: InputMaybe<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export type ServerInfo = {
  __typename?: 'ServerInfo';
  builtAt: Scalars['String'];
  hash: Scalars['String'];
  hubVersion?: Maybe<Scalars['String']>;
  minio: Scalars['String'];
  mode: Scalars['String'];
  primaryTenantId?: Maybe<Scalars['String']>;
  status: Scalars['String'];
  timestamp: Scalars['Float'];
  version: Scalars['String'];
};

export type Specialty = {
  __typename?: 'Specialty';
  _id: Scalars['String'];
  lang: Scalars['String'];
  level: Scalars['String'];
  note?: Maybe<Scalars['String']>;
  ranking: SpecialtyRanking;
  subject: Scalars['String'];
};

export type SpecialtyRanking = {
  __typename?: 'SpecialtyRanking';
  correctness: Scalars['Int'];
  explicitness: Scalars['Int'];
  punctuality: Scalars['Int'];
};

export type StatusResponse = {
  __typename?: 'StatusResponse';
  code: Scalars['String'];
};

export type Subject = {
  __typename?: 'Subject';
  _id: Scalars['ID'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  levels: Array<Scalars['String']>;
  name: Locale;
  remarks?: Maybe<Array<Remark>>;
  updatedAt: Scalars['Float'];
};

export type SubjectInput = {
  levels: Array<Scalars['String']>;
  name: LocaleInput;
};

export type Subscription = {
  __typename?: 'Subscription';
  enabled: Scalars['Boolean'];
  ip: Scalars['String'];
  permission: Scalars['String'];
  subscription: Scalars['String'];
  token: Scalars['String'];
  ua: Scalars['String'];
};

export type Tag = {
  __typename?: 'Tag';
  _id: Scalars['ID'];
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  description: Locale;
  flags: Array<Scalars['String']>;
  name: Locale;
  remarks?: Maybe<Array<Remark>>;
  updatedAt: Scalars['Float'];
};

export type TagInput = {
  description: LocaleInput;
  name: LocaleInput;
};

export type Tenant = {
  __typename?: 'Tenant';
  _id: Scalars['ID'];
  admins: Array<Scalars['String']>;
  code: Scalars['String'];
  counselors: Array<Scalars['String']>;
  createdAt: Scalars['Float'];
  deletedAt?: Maybe<Scalars['Float']>;
  flaggedWords: Array<Scalars['String']>;
  flags: Array<Scalars['String']>;
  htmlUrl?: Maybe<Scalars['String']>;
  logoUrl?: Maybe<Scalars['String']>;
  marshals: Array<Scalars['String']>;
  name: Locale;
  remarks?: Maybe<Array<Remark>>;
  satelliteUrl?: Maybe<Scalars['String']>;
  school?: Maybe<Scalars['String']>;
  services: Array<Scalars['String']>;
  theme?: Maybe<Scalars['String']>;
  updatedAt: Scalars['Float'];
  website?: Maybe<Scalars['String']>;
};

export type TenantCoreInput = {
  code: Scalars['String'];
  name: LocaleInput;
  satelliteUrl?: InputMaybe<Scalars['String']>;
  school?: InputMaybe<Scalars['String']>;
  services: Array<Scalars['String']>;
};

export type TenantExtraInput = {
  admins: Array<Scalars['String']>;
  counselors: Array<Scalars['String']>;
  flaggedWords: Array<InputMaybe<Scalars['String']>>;
  htmlUrl?: InputMaybe<Scalars['String']>;
  logoUrl?: InputMaybe<Scalars['String']>;
  marshals: Array<Scalars['String']>;
  theme?: InputMaybe<Scalars['String']>;
  website?: InputMaybe<Scalars['String']>;
};

export type TenantHomePage = {
  __typename?: 'TenantHomePage';
  contact?: Maybe<Scalars['String']>;
  htmlTexts?: Maybe<Array<Maybe<Array<Maybe<Locale>>>>>;
  slogan?: Maybe<Locale>;
};

export type TenantToken = {
  __typename?: 'TenantToken';
  expireAt: Scalars['Float'];
  token: Scalars['String'];
};

export type Token = {
  __typename?: 'Token';
  _id: Scalars['ID'];
  authUser?: Maybe<Scalars['String']>;
  ip: Scalars['String'];
  ua: Scalars['String'];
  updatedAt: Scalars['Float'];
};

export type Tutor = {
  __typename?: 'Tutor';
  _id: Scalars['String'];
  createdAt: Scalars['Float'];
  credentials: Array<Credential>;
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  intro?: Maybe<Scalars['String']>;
  officeHour?: Maybe<Scalars['String']>;
  rankingUpdatedAt: Scalars['Float'];
  remarks?: Maybe<Array<Remark>>;
  specialties: Array<Specialty>;
  star?: Maybe<Scalars['Int']>;
  tenant: Scalars['String'];
  updatedAt: Scalars['Float'];
  user: Scalars['String'];
};

export type TutorRanking = {
  __typename?: 'TutorRanking';
  _id: Scalars['ID'];
  correctness: Scalars['Int'];
  explicitness: Scalars['Int'];
  punctuality: Scalars['Int'];
};

export type Typography = {
  __typename?: 'Typography';
  _id: Scalars['ID'];
  content: Locale;
  createdAt: Scalars['Float'];
  customs?: Maybe<Array<TypographyCustom>>;
  deletedAt?: Maybe<Scalars['Float']>;
  flags: Array<Scalars['String']>;
  key: Scalars['String'];
  remarks?: Maybe<Array<Remark>>;
  title: Locale;
  updatedAt: Scalars['Float'];
};

export type TypographyCustom = {
  __typename?: 'TypographyCustom';
  content: Locale;
  tenant: Scalars['String'];
  title: Locale;
};

export type TypographyCustomInput = {
  content: LocaleInput;
  title: LocaleInput;
};

export type TypographyInput = {
  content: LocaleInput;
  key: Scalars['String'];
  title: LocaleInput;
};

export type User = {
  __typename?: 'User';
  _id: Scalars['ID'];
  apiKeys?: Maybe<Array<Maybe<ApiKey>>>;
  avatarUrl?: Maybe<Scalars['String']>;
  balanceAuditedAt: Scalars['Float'];
  coin: Scalars['Int'];
  createdAt: Scalars['Float'];
  creditability: Scalars['Int'];
  darkMode: Scalars['Boolean'];
  deletedAt?: Maybe<Scalars['Float']>;
  dob?: Maybe<Scalars['String']>;
  emails: Array<Scalars['String']>;
  expoPushTokens: Array<Scalars['String']>;
  favoriteTutors: Array<Scalars['String']>;
  features: Array<Scalars['String']>;
  flags: Array<Scalars['String']>;
  formalName?: Maybe<Locale>;
  histories: Array<Maybe<YearLevelClass>>;
  interests: Array<Scalars['String']>;
  locale: Scalars['String'];
  loginIds: Array<Scalars['String']>;
  mobile?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  networkStatus?: Maybe<Scalars['String']>;
  oAuth2: Array<OAuth2>;
  paymentMethods: Array<PaymentMethod>;
  photoUrl?: Maybe<Scalars['String']>;
  preference?: Maybe<Scalars['String']>;
  remarks?: Maybe<Array<Remark>>;
  roles: Array<Scalars['String']>;
  school?: Maybe<Scalars['String']>;
  scopes: Array<Scalars['String']>;
  staffs: Array<Scalars['String']>;
  status: Scalars['String'];
  studentId?: Maybe<Scalars['String']>;
  subscriptions: Array<Subscription>;
  supervisors: Array<Scalars['String']>;
  suspension?: Maybe<Scalars['String']>;
  tenants: Array<Scalars['String']>;
  theme?: Maybe<Scalars['String']>;
  timezone: Scalars['String'];
  updatedAt: Scalars['Float'];
  violations: Array<Violation>;
  virtualCoin: Scalars['Int'];
  whatsapp?: Maybe<Scalars['String']>;
  yob?: Maybe<Scalars['Int']>;
};

export type UserProfileInput = {
  address?: InputMaybe<LocaleInput>;
  district: Scalars['String'];
  dob?: InputMaybe<Scalars['DateInput']>;
  locale: Scalars['String'];
  name: Scalars['String'];
  yob?: InputMaybe<Scalars['Int']>;
};

export type Violation = {
  __typename?: 'Violation';
  createdAt: Scalars['Float'];
  links: Array<Scalars['String']>;
  reason: Scalars['String'];
};

export type YearLevelClass = {
  __typename?: 'YearLevelClass';
  level: Scalars['String'];
  school: Scalars['String'];
  schoolClass?: Maybe<Scalars['String']>;
  studentId?: Maybe<Scalars['String']>;
  updatedAt: Scalars['Float'];
  year: Scalars['String'];
};

export type AnalyticSessionMutationVariables = Exact<{
  fullscreen: Scalars['Boolean'];
  token: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type AnalyticSessionMutation = { __typename?: 'Mutation', analyticSession: { __typename?: 'StatusResponse', code: string } };

export type AnnouncementFieldsFragment = { __typename?: 'Announcement', _id: string, flags: Array<string>, tenant?: string | null, title: string, message: string, beginAt: number, endAt: number, createdAt: number, updatedAt: number, deletedAt?: number | null };

export type AddAnnouncementMutationVariables = Exact<{
  announcement: AnnouncementInput;
}>;


export type AddAnnouncementMutation = { __typename?: 'Mutation', addAnnouncement: { __typename?: 'Announcement', _id: string, flags: Array<string>, tenant?: string | null, title: string, message: string, beginAt: number, endAt: number, createdAt: number, updatedAt: number, deletedAt?: number | null } };

export type GetAnnouncementQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetAnnouncementQuery = { __typename?: 'Query', announcement?: { __typename?: 'Announcement', _id: string, flags: Array<string>, tenant?: string | null, title: string, message: string, beginAt: number, endAt: number, createdAt: number, updatedAt: number, deletedAt?: number | null } | null };

export type GetAnnouncementsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetAnnouncementsQuery = { __typename?: 'Query', announcements: Array<{ __typename?: 'Announcement', _id: string, flags: Array<string>, tenant?: string | null, title: string, message: string, beginAt: number, endAt: number, createdAt: number, updatedAt: number, deletedAt?: number | null }> };

export type RemoveAnnouncementMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RemoveAnnouncementMutation = { __typename?: 'Mutation', removeAnnouncement: { __typename?: 'StatusResponse', code: string } };

export type AuthSuccessfulResponseFieldsFragment = { __typename?: 'AuthSuccessfulResponse', accessToken: string, accessTokenExpireAt: number, refreshToken: string, refreshTokenExpireAt: number, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AuthResponseFieldsFragment = { __typename?: 'AuthResponse', accessToken?: string | null, accessTokenExpireAt?: number | null, refreshToken?: string | null, refreshTokenExpireAt?: number | null, conflict?: { __typename?: 'AuthConflict', ip?: string | null, maxLogin?: number | null, exceedLogin?: number | null } | null, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type DeregisterMutationVariables = Exact<{
  password: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
  clientHash?: InputMaybe<Scalars['String']>;
}>;


export type DeregisterMutation = { __typename?: 'Mutation', deregister: { __typename?: 'DeregisterResponse', code?: string | null, days?: number | null } };

export type ImpersonateStartMutationVariables = Exact<{
  impersonatedAsId: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
  clientHash?: InputMaybe<Scalars['String']>;
}>;


export type ImpersonateStartMutation = { __typename?: 'Mutation', impersonateStart: { __typename?: 'AuthSuccessfulResponse', accessToken: string, accessTokenExpireAt: number, refreshToken: string, refreshTokenExpireAt: number, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } } };

export type ImpersonateStopMutationVariables = Exact<{
  refreshToken: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type ImpersonateStopMutation = { __typename?: 'Mutation', impersonateStop: { __typename?: 'StatusResponse', code: string } };

export type ListTokensQueryVariables = Exact<{ [key: string]: never; }>;


export type ListTokensQuery = { __typename?: 'Query', listTokens: Array<{ __typename?: 'Token', _id: string, authUser?: string | null, ip: string, ua: string, updatedAt: number }> };

export type LoginMutationVariables = Exact<{
  email: Scalars['String'];
  password: Scalars['String'];
  isPublic?: InputMaybe<Scalars['Boolean']>;
  force?: InputMaybe<Scalars['Boolean']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  clientHash?: InputMaybe<Scalars['String']>;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthResponse', accessToken?: string | null, accessTokenExpireAt?: number | null, refreshToken?: string | null, refreshTokenExpireAt?: number | null, conflict?: { __typename?: 'AuthConflict', ip?: string | null, maxLogin?: number | null, exceedLogin?: number | null } | null, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } } };

export type LoginTokenMutationVariables = Exact<{
  tenantId: Scalars['String'];
  userId: Scalars['String'];
  expiresIn?: InputMaybe<Scalars['Int']>;
}>;


export type LoginTokenMutation = { __typename?: 'Mutation', loginToken: string };

export type LoginWithIdMutationVariables = Exact<{
  loginId: Scalars['String'];
  password: Scalars['String'];
  isPublic?: InputMaybe<Scalars['Boolean']>;
  force?: InputMaybe<Scalars['Boolean']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  clientHash?: InputMaybe<Scalars['String']>;
  tenantId: Scalars['String'];
}>;


export type LoginWithIdMutation = { __typename?: 'Mutation', loginWithId: { __typename?: 'AuthResponse', accessToken?: string | null, accessTokenExpireAt?: number | null, refreshToken?: string | null, refreshTokenExpireAt?: number | null, conflict?: { __typename?: 'AuthConflict', ip?: string | null, maxLogin?: number | null, exceedLogin?: number | null } | null, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } } };

export type LoginWithTokenMutationVariables = Exact<{
  token: Scalars['String'];
}>;


export type LoginWithTokenMutation = { __typename?: 'Mutation', loginWithToken: { __typename?: 'AuthResponse', accessToken?: string | null, accessTokenExpireAt?: number | null, refreshToken?: string | null, refreshTokenExpireAt?: number | null, conflict?: { __typename?: 'AuthConflict', ip?: string | null, maxLogin?: number | null, exceedLogin?: number | null } | null, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } } };

export type LogoutMutationVariables = Exact<{
  refreshToken: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type LogoutMutation = { __typename?: 'Mutation', logout: { __typename?: 'StatusResponse', code: string } };

export type LogoutOtherMutationVariables = Exact<{
  refreshToken: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type LogoutOtherMutation = { __typename?: 'Mutation', logoutOther: { __typename?: 'LogoutOtherResponse', code?: string | null, count?: number | null } };

export type RegisterMutationVariables = Exact<{
  name: Scalars['String'];
  email: Scalars['String'];
  password: Scalars['String'];
  isPublic?: InputMaybe<Scalars['Boolean']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  clientHash?: InputMaybe<Scalars['String']>;
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'AuthSuccessfulResponse', accessToken: string, accessTokenExpireAt: number, refreshToken: string, refreshTokenExpireAt: number, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } } };

export type RenewTokenMutationVariables = Exact<{
  refreshToken: Scalars['String'];
  isPublic?: InputMaybe<Scalars['Boolean']>;
  coordinates?: InputMaybe<CoordinatesInput>;
  clientHash?: InputMaybe<Scalars['String']>;
}>;


export type RenewTokenMutation = { __typename?: 'Mutation', renewToken: { __typename?: 'AuthSuccessfulResponse', accessToken: string, accessTokenExpireAt: number, refreshToken: string, refreshTokenExpireAt: number, user: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } } };

export type BookFieldsFragment = { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddBookMutationVariables = Exact<{
  book: BookInput;
}>;


export type AddBookMutation = { __typename?: 'Mutation', addBook: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddBookAssignmentMutationVariables = Exact<{
  id: Scalars['ID'];
  assignment: BookAssignmentInput;
}>;


export type AddBookAssignmentMutation = { __typename?: 'Mutation', addBookAssignment: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddBookRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddBookRemarkMutation = { __typename?: 'Mutation', addBookRemark: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddBookRevisionMutationVariables = Exact<{
  id: Scalars['ID'];
  revision: BookRevisionInput;
}>;


export type AddBookRevisionMutation = { __typename?: 'Mutation', addBookRevision: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddBookRevisionImageMutationVariables = Exact<{
  id: Scalars['ID'];
  revisionId: Scalars['String'];
  url: Scalars['String'];
}>;


export type AddBookRevisionImageMutation = { __typename?: 'Mutation', addBookRevisionImage: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddBookSupplementMutationVariables = Exact<{
  id: Scalars['ID'];
  supplement: BookSupplementInput;
}>;


export type AddBookSupplementMutation = { __typename?: 'Mutation', addBookSupplement: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type IsIsbnAvailableQueryVariables = Exact<{
  isbn: Scalars['String'];
}>;


export type IsIsbnAvailableQuery = { __typename?: 'Query', isIsbnAvailable: boolean };

export type JoinBookChatMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type JoinBookChatMutation = { __typename?: 'Mutation', joinBookChat: { __typename?: 'StatusResponse', code: string } };

export type GetBookQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetBookQuery = { __typename?: 'Query', book?: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetBooksQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetBooksQuery = { __typename?: 'Query', books: Array<{ __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveBookMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveBookMutation = { __typename?: 'Mutation', removeBook: { __typename?: 'StatusResponse', code: string } };

export type RemoveBookAssignmentMutationVariables = Exact<{
  id: Scalars['ID'];
  assignmentId: Scalars['String'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveBookAssignmentMutation = { __typename?: 'Mutation', removeBookAssignment: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveBookRevisionMutationVariables = Exact<{
  id: Scalars['ID'];
  revisionId: Scalars['String'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveBookRevisionMutation = { __typename?: 'Mutation', removeBookRevision: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveBookRevisionImageMutationVariables = Exact<{
  id: Scalars['ID'];
  revisionId: Scalars['String'];
  url: Scalars['String'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveBookRevisionImageMutation = { __typename?: 'Mutation', removeBookRevisionImage: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveBookSupplementMutationVariables = Exact<{
  id: Scalars['ID'];
  supplementId: Scalars['String'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveBookSupplementMutation = { __typename?: 'Mutation', removeBookSupplement: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type UpdateBookMutationVariables = Exact<{
  id: Scalars['ID'];
  book: BookInput;
}>;


export type UpdateBookMutation = { __typename?: 'Mutation', updateBook: { __typename?: 'Book', _id: string, flags: Array<string>, publisher: string, level: string, subjects: Array<string>, title: string, subTitle?: string | null, chatGroup: string, createdAt: number, updatedAt: number, deletedAt?: number | null, assignments?: Array<{ __typename?: 'BookAssignment', _id: string, chapter: string, dynParams: Array<string>, solutions: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> }, content: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }, examples: Array<{ __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number }> }> | null, supplements: Array<{ __typename?: 'BookSupplement', _id: string, chapter: string, deletedAt?: number | null, contribution: { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> } }>, revisions: Array<{ __typename?: 'BookRevision', _id: string, rev: string, isbn?: string | null, year: number, imageUrls: Array<string>, listPrice?: number | null, createdAt: number, deletedAt?: number | null }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type ChatGroupFieldsFragment = { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number };

export type AddChatGroupMutationVariables = Exact<{
  tenantId: Scalars['String'];
  userIds: Array<Scalars['String']> | Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  membership: Scalars['String'];
  logoUrl?: InputMaybe<Scalars['String']>;
}>;


export type AddChatGroupMutation = { __typename?: 'Mutation', addChatGroup: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type AddChatGroupAdminsMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type AddChatGroupAdminsMutation = { __typename?: 'Mutation', addChatGroupAdmins: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type AddChatGroupUsersMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type AddChatGroupUsersMutation = { __typename?: 'Mutation', addChatGroupUsers: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type GetChatGroupQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetChatGroupQuery = { __typename?: 'Query', chatGroup?: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } | null };

export type GetChatGroupsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetChatGroupsQuery = { __typename?: 'Query', chatGroups: Array<{ __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number }> };

export type JoinChatGroupMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type JoinChatGroupMutation = { __typename?: 'Mutation', joinChatGroup: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type LeaveChatGroupMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type LeaveChatGroupMutation = { __typename?: 'Mutation', leaveChatGroup: { __typename?: 'StatusResponse', code: string } };

export type RemoveChatGroupUsersMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type RemoveChatGroupUsersMutation = { __typename?: 'Mutation', removeChatGroupUsers: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type ToAdminChatGroupMutationVariables = Exact<{
  content: Scalars['String'];
}>;


export type ToAdminChatGroupMutation = { __typename?: 'Mutation', toAdminChatGroup: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type ToAlexChatGroupMutationVariables = Exact<{
  content: Scalars['String'];
}>;


export type ToAlexChatGroupMutation = { __typename?: 'Mutation', toAlexChatGroup: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type UpdateChatGroupMutationVariables = Exact<{
  id: Scalars['ID'];
  title?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  membership: Scalars['String'];
  logoUrl?: InputMaybe<Scalars['String']>;
}>;


export type UpdateChatGroupMutation = { __typename?: 'Mutation', updateChatGroup: { __typename?: 'ChatGroup', _id: string, flags: Array<string>, tenant?: string | null, title?: string | null, description?: string | null, membership: string, users: Array<string>, admins: Array<string>, chats: Array<string>, adminKey?: string | null, key?: string | null, url?: string | null, logoUrl?: string | null, createdAt: number, updatedAt: number } };

export type ChatFieldsFragment = { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> };

export type AddChatMutationVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  title?: InputMaybe<Scalars['String']>;
  parent: Scalars['String'];
  content: Scalars['String'];
}>;


export type AddChatMutation = { __typename?: 'Mutation', addChat: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type AttachChatMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  classroomId: Scalars['String'];
}>;


export type AttachChatMutation = { __typename?: 'Mutation', attachChatToClassroom: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type BockChatContentMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  contentId: Scalars['String'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type BockChatContentMutation = { __typename?: 'Mutation', blockChatContent: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type ClearChatFlagMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  flag: Scalars['String'];
}>;


export type ClearChatFlagMutation = { __typename?: 'Mutation', clearChatFlag: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type GetChatQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetChatQuery = { __typename?: 'Query', chat?: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } | null };

export type GetChatsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetChatsQuery = { __typename?: 'Query', chats: Array<{ __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> }> };

export type RecallChatContentMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  contentId: Scalars['String'];
}>;


export type RecallChatContentMutation = { __typename?: 'Mutation', recallChatContent: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type SetChatFlagMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  flag: Scalars['String'];
}>;


export type SetChatFlagMutation = { __typename?: 'Mutation', setChatFlag: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type UpdateChatLastViewedAtMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  timestamp: Scalars['DateInput'];
}>;


export type UpdateChatLastViewedAtMutation = { __typename?: 'Mutation', updateChatLastViewedAt: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type UpdateChatTitleMutationVariables = Exact<{
  id: Scalars['ID'];
  parent: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
}>;


export type UpdateChatTitleMutation = { __typename?: 'Mutation', updateChatTitle: { __typename?: 'Chat', _id: string, flags: Array<string>, parents: Array<string>, title?: string | null, contents?: Array<string | null> | null, contentsToken?: string | null, createdAt: number, updatedAt: number, members: Array<{ __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null } | null> } };

export type ClassroomFieldsFragment = { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddClassroomMutationVariables = Exact<{
  tenantId: Scalars['String'];
  level: Scalars['String'];
  subject: Scalars['String'];
  year: Scalars['String'];
  schoolClass: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
  room?: InputMaybe<Scalars['String']>;
  schedule?: InputMaybe<Scalars['String']>;
  books: Array<Scalars['String']> | Scalars['String'];
}>;


export type AddClassroomMutation = { __typename?: 'Mutation', addClassroom: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddClassroomRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddClassroomRemarkMutation = { __typename?: 'Mutation', addClassroomRemark: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddClassroomStudentsMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type AddClassroomStudentsMutation = { __typename?: 'Mutation', addClassroomStudents: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddClassroomTeachersMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type AddClassroomTeachersMutation = { __typename?: 'Mutation', addClassroomTeachers: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetClassroomQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetClassroomQuery = { __typename?: 'Query', classroom?: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetClassroomsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetClassroomsQuery = { __typename?: 'Query', classrooms: Array<{ __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RecoverClassroomMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RecoverClassroomMutation = { __typename?: 'Mutation', recoverClassroom: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveClassroomMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveClassroomMutation = { __typename?: 'Mutation', removeClassroom: { __typename?: 'StatusResponse', code: string } };

export type RemoveClassroomStudentsMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type RemoveClassroomStudentsMutation = { __typename?: 'Mutation', removeClassroomStudents: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveClassroomTeachersMutationVariables = Exact<{
  id: Scalars['ID'];
  userIds: Array<Scalars['String']> | Scalars['String'];
}>;


export type RemoveClassroomTeachersMutation = { __typename?: 'Mutation', removeClassroomTeachers: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type UpdateClassroomMutationVariables = Exact<{
  id: Scalars['ID'];
  title?: InputMaybe<Scalars['String']>;
  room?: InputMaybe<Scalars['String']>;
  schedule?: InputMaybe<Scalars['String']>;
  books: Array<Scalars['String']> | Scalars['String'];
}>;


export type UpdateClassroomMutation = { __typename?: 'Mutation', updateClassroom?: { __typename?: 'Classroom', _id: string, flags: Array<string>, tenant?: string | null, level: string, subject: string, year: string, schoolClass: string, title?: string | null, room?: string | null, schedule?: string | null, books: Array<string>, teachers: Array<string>, students: Array<string>, chats: Array<string>, assignments: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type LocaleFieldsFragment = { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null };

export type RemarkFieldsFragment = { __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string };

export type StatusResponseFragment = { __typename?: 'StatusResponse', code: string };

export type ContributionFieldsFragment = { __typename?: 'Contribution', _id: string, title: string, description?: string | null, urls: Array<string>, contributors: Array<{ __typename?: 'Contributor', _id: string, user: string, name: string, school: string }> };

export type ContentFieldsFragment = { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number };

export type MemberFieldsFragment = { __typename?: 'Member', user: string, flags: Array<string>, lastViewedAt?: number | null };

export type GetContentQueryVariables = Exact<{
  id: Scalars['ID'];
  token: Scalars['String'];
  updateAfter?: InputMaybe<Scalars['DateInput']>;
}>;


export type GetContentQuery = { __typename?: 'Query', content?: { __typename?: 'Content', _id: string, flags: Array<string>, parents: Array<string>, creator: string, data: string, createdAt: number, updatedAt: number } | null };

export type ContactFieldsFragment = { __typename?: 'Contact', _id: string, avatarUrl?: string | null, name: string, status: string, tenants: Array<string> };

export type GetContactTokenQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContactTokenQuery = { __typename?: 'Query', contactToken: string };

export type AddContactMutationVariables = Exact<{
  token: Scalars['String'];
}>;


export type AddContactMutation = { __typename?: 'Mutation', addContact: { __typename?: 'Contact', _id: string, avatarUrl?: string | null, name: string, status: string, tenants: Array<string> } };

export type GetContactQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetContactQuery = { __typename?: 'Query', contact?: { __typename?: 'Contact', _id: string, avatarUrl?: string | null, name: string, status: string, tenants: Array<string> } | null };

export type GetContactsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContactsQuery = { __typename?: 'Query', contacts: Array<{ __typename?: 'Contact', _id: string, avatarUrl?: string | null, name: string, status: string, tenants: Array<string> }> };

export type RemoveContactMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type RemoveContactMutation = { __typename?: 'Mutation', removeContact: { __typename?: 'StatusResponse', code: string } };

export type UpdateContactMutationVariables = Exact<{
  id: Scalars['ID'];
  name: Scalars['String'];
}>;


export type UpdateContactMutation = { __typename?: 'Mutation', updateContact: { __typename?: 'Contact', _id: string, avatarUrl?: string | null, name: string, status: string, tenants: Array<string> } };

export type DistrictFieldsFragment = { __typename?: 'District', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, region: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddDistrictMutationVariables = Exact<{
  district: DistrictInput;
}>;


export type AddDistrictMutation = { __typename?: 'Mutation', addDistrict: { __typename?: 'District', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, region: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddDistrictRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddDistrictRemarkMutation = { __typename?: 'Mutation', addDistrictRemark: { __typename?: 'District', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, region: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetDistrictQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetDistrictQuery = { __typename?: 'Query', district?: { __typename?: 'District', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, region: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetDistrictsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetDistrictsQuery = { __typename?: 'Query', districts: Array<{ __typename?: 'District', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, region: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveDistrictMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveDistrictMutation = { __typename?: 'Mutation', removeDistrict: { __typename?: 'StatusResponse', code: string } };

export type UpdateDistrictMutationVariables = Exact<{
  id: Scalars['ID'];
  district: DistrictInput;
}>;


export type UpdateDistrictMutation = { __typename?: 'Mutation', updateDistrict: { __typename?: 'District', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, region: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type LevelFieldsFragment = { __typename?: 'Level', _id: string, flags: Array<string>, code: string, nextLevel?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddLevelMutationVariables = Exact<{
  level: LevelInput;
}>;


export type AddLevelMutation = { __typename?: 'Mutation', addLevel: { __typename?: 'Level', _id: string, flags: Array<string>, code: string, nextLevel?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddLevelRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddLevelRemarkMutation = { __typename?: 'Mutation', addLevelRemark: { __typename?: 'Level', _id: string, flags: Array<string>, code: string, nextLevel?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetLevelQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetLevelQuery = { __typename?: 'Query', level?: { __typename?: 'Level', _id: string, flags: Array<string>, code: string, nextLevel?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetLevelsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetLevelsQuery = { __typename?: 'Query', levels: Array<{ __typename?: 'Level', _id: string, flags: Array<string>, code: string, nextLevel?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveLevelMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveLevelMutation = { __typename?: 'Mutation', removeLevel: { __typename?: 'StatusResponse', code: string } };

export type UpdateLevelMutationVariables = Exact<{
  id: Scalars['ID'];
  level: LevelInput;
}>;


export type UpdateLevelMutation = { __typename?: 'Mutation', updateLevel: { __typename?: 'Level', _id: string, flags: Array<string>, code: string, nextLevel?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type ChangePasswordMutationVariables = Exact<{
  currPassword: Scalars['String'];
  newPassword: Scalars['String'];
  refreshToken: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type ChangePasswordMutation = { __typename?: 'Mutation', changePassword: { __typename?: 'StatusResponse', code: string } };

export type ResetPasswordRequestMutationVariables = Exact<{
  email: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type ResetPasswordRequestMutation = { __typename?: 'Mutation', resetPasswordRequest: { __typename?: 'StatusResponse', code: string } };

export type ResetPasswordConfirmMutationVariables = Exact<{
  token: Scalars['String'];
  password: Scalars['String'];
  coordinates?: InputMaybe<CoordinatesInput>;
}>;


export type ResetPasswordConfirmMutation = { __typename?: 'Mutation', resetPasswordConfirm: { __typename?: 'StatusResponse', code: string } };

export type PresignedUrlFieldsFragment = { __typename?: 'PresignedUrl', url: string, expiry: number };

export type AddPresignedUrlMutationVariables = Exact<{
  bucketType: Scalars['String'];
  ext: Scalars['String'];
}>;


export type AddPresignedUrlMutation = { __typename?: 'Mutation', addPresignedUrl: { __typename?: 'PresignedUrl', url: string, expiry: number } };

export type PublisherFieldsFragment = { __typename?: 'Publisher', _id: string, flags: Array<string>, admins: Array<string>, phones: Array<string>, logoUrl?: string | null, website?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddPublisherMutationVariables = Exact<{
  publisher: PublisherInput;
}>;


export type AddPublisherMutation = { __typename?: 'Mutation', addPublisher: { __typename?: 'Publisher', _id: string, flags: Array<string>, admins: Array<string>, phones: Array<string>, logoUrl?: string | null, website?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddPublisherRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddPublisherRemarkMutation = { __typename?: 'Mutation', addPublisherRemark: { __typename?: 'Publisher', _id: string, flags: Array<string>, admins: Array<string>, phones: Array<string>, logoUrl?: string | null, website?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetPublisherQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetPublisherQuery = { __typename?: 'Query', publisher?: { __typename?: 'Publisher', _id: string, flags: Array<string>, admins: Array<string>, phones: Array<string>, logoUrl?: string | null, website?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetPublishersQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetPublishersQuery = { __typename?: 'Query', publishers: Array<{ __typename?: 'Publisher', _id: string, flags: Array<string>, admins: Array<string>, phones: Array<string>, logoUrl?: string | null, website?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemovePublisherMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemovePublisherMutation = { __typename?: 'Mutation', removePublisher: { __typename?: 'StatusResponse', code: string } };

export type UpdatePublisherMutationVariables = Exact<{
  id: Scalars['ID'];
  publisher: PublisherInput;
}>;


export type UpdatePublisherMutation = { __typename?: 'Mutation', updatePublisher: { __typename?: 'Publisher', _id: string, flags: Array<string>, admins: Array<string>, phones: Array<string>, logoUrl?: string | null, website?: string | null, createdAt: number, updatedAt: number, deletedAt?: number | null, name?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddRoleMutationVariables = Exact<{
  id: Scalars['ID'];
  role: Scalars['String'];
}>;


export type AddRoleMutation = { __typename?: 'Mutation', addRole: Array<string> };

export type GetRoleQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetRoleQuery = { __typename?: 'Query', role: Array<string> };

export type RemoveRoleMutationVariables = Exact<{
  id: Scalars['ID'];
  role: Scalars['String'];
}>;


export type RemoveRoleMutation = { __typename?: 'Mutation', removeRole: Array<string> };

export type SchoolFieldsFragment = { __typename?: 'School', _id: string, flags: Array<string>, code?: string | null, district: string, phones: Array<string>, emi?: boolean | null, band?: string | null, logoUrl?: string | null, website?: string | null, funding?: string | null, gender?: string | null, religion?: string | null, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, address?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, location?: { __typename?: 'LocationPoint', coordinates?: Array<string> | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddSchoolMutationVariables = Exact<{
  school: SchoolInput;
}>;


export type AddSchoolMutation = { __typename?: 'Mutation', addSchool: { __typename?: 'School', _id: string, flags: Array<string>, code?: string | null, district: string, phones: Array<string>, emi?: boolean | null, band?: string | null, logoUrl?: string | null, website?: string | null, funding?: string | null, gender?: string | null, religion?: string | null, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, address?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, location?: { __typename?: 'LocationPoint', coordinates?: Array<string> | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddSchoolRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddSchoolRemarkMutation = { __typename?: 'Mutation', addSchoolRemark: { __typename?: 'School', _id: string, flags: Array<string>, code?: string | null, district: string, phones: Array<string>, emi?: boolean | null, band?: string | null, logoUrl?: string | null, website?: string | null, funding?: string | null, gender?: string | null, religion?: string | null, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, address?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, location?: { __typename?: 'LocationPoint', coordinates?: Array<string> | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetSchoolQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetSchoolQuery = { __typename?: 'Query', school?: { __typename?: 'School', _id: string, flags: Array<string>, code?: string | null, district: string, phones: Array<string>, emi?: boolean | null, band?: string | null, logoUrl?: string | null, website?: string | null, funding?: string | null, gender?: string | null, religion?: string | null, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, address?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, location?: { __typename?: 'LocationPoint', coordinates?: Array<string> | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetSchoolsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetSchoolsQuery = { __typename?: 'Query', schools: Array<{ __typename?: 'School', _id: string, flags: Array<string>, code?: string | null, district: string, phones: Array<string>, emi?: boolean | null, band?: string | null, logoUrl?: string | null, website?: string | null, funding?: string | null, gender?: string | null, religion?: string | null, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, address?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, location?: { __typename?: 'LocationPoint', coordinates?: Array<string> | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveSchoolMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveSchoolMutation = { __typename?: 'Mutation', removeSchool: { __typename?: 'StatusResponse', code: string } };

export type UpdateSchoolMutationVariables = Exact<{
  id: Scalars['ID'];
  school: SchoolInput;
}>;


export type UpdateSchoolMutation = { __typename?: 'Mutation', updateSchool: { __typename?: 'School', _id: string, flags: Array<string>, code?: string | null, district: string, phones: Array<string>, emi?: boolean | null, band?: string | null, logoUrl?: string | null, website?: string | null, funding?: string | null, gender?: string | null, religion?: string | null, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, address?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, location?: { __typename?: 'LocationPoint', coordinates?: Array<string> | null } | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type SubjectFieldsFragment = { __typename?: 'Subject', _id: string, flags: Array<string>, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddSubjectMutationVariables = Exact<{
  subject: SubjectInput;
}>;


export type AddSubjectMutation = { __typename?: 'Mutation', addSubject: { __typename?: 'Subject', _id: string, flags: Array<string>, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddSubjectRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddSubjectRemarkMutation = { __typename?: 'Mutation', addSubjectRemark: { __typename?: 'Subject', _id: string, flags: Array<string>, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetSubjectQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetSubjectQuery = { __typename?: 'Query', subject?: { __typename?: 'Subject', _id: string, flags: Array<string>, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type Get_SubjectsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type Get_SubjectsQuery = { __typename?: 'Query', subjects: Array<{ __typename?: 'Subject', _id: string, flags: Array<string>, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveSubjectMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveSubjectMutation = { __typename?: 'Mutation', removeSubject: { __typename?: 'StatusResponse', code: string } };

export type UpdateSubjectMutationVariables = Exact<{
  id: Scalars['ID'];
  subject: SubjectInput;
}>;


export type UpdateSubjectMutation = { __typename?: 'Mutation', updateSubject: { __typename?: 'Subject', _id: string, flags: Array<string>, levels: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetServerInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type GetServerInfoQuery = { __typename?: 'Query', serverInfo: { __typename?: 'ServerInfo', mode: string, primaryTenantId?: string | null, status: string, minio: string, timestamp: number, version: string, hubVersion?: string | null, hash: string, builtAt: string } };

export type PingQueryVariables = Exact<{ [key: string]: never; }>;


export type PingQuery = { __typename?: 'Query', ping: string };

export type TagFieldsFragment = { __typename?: 'Tag', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, description: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddTagMutationVariables = Exact<{
  tag: TagInput;
}>;


export type AddTagMutation = { __typename?: 'Mutation', addTag: { __typename?: 'Tag', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, description: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTagRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddTagRemarkMutation = { __typename?: 'Mutation', addTagRemark: { __typename?: 'Tag', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, description: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetTagQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetTagQuery = { __typename?: 'Query', tag?: { __typename?: 'Tag', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, description: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetTagsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetTagsQuery = { __typename?: 'Query', tags: Array<{ __typename?: 'Tag', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, description: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveTagMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveTagMutation = { __typename?: 'Mutation', removeTag: { __typename?: 'StatusResponse', code: string } };

export type UpdateTagMutationVariables = Exact<{
  id: Scalars['ID'];
  tag: TagInput;
}>;


export type UpdateTagMutation = { __typename?: 'Mutation', updateTag: { __typename?: 'Tag', _id: string, flags: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, description: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type TenantFieldsFragment = { __typename?: 'Tenant', _id: string, flags: Array<string>, code: string, school?: string | null, admins: Array<string>, counselors: Array<string>, marshals: Array<string>, theme?: string | null, services: Array<string>, htmlUrl?: string | null, logoUrl?: string | null, website?: string | null, satelliteUrl?: string | null, flaggedWords: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddTenantMutationVariables = Exact<{
  tenant: TenantCoreInput;
}>;


export type AddTenantMutation = { __typename?: 'Mutation', addTenant: { __typename?: 'Tenant', _id: string, flags: Array<string>, code: string, school?: string | null, admins: Array<string>, counselors: Array<string>, marshals: Array<string>, theme?: string | null, services: Array<string>, htmlUrl?: string | null, logoUrl?: string | null, website?: string | null, satelliteUrl?: string | null, flaggedWords: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTenantRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddTenantRemarkMutation = { __typename?: 'Mutation', addTenantRemark: { __typename?: 'Tenant', _id: string, flags: Array<string>, code: string, school?: string | null, admins: Array<string>, counselors: Array<string>, marshals: Array<string>, theme?: string | null, services: Array<string>, htmlUrl?: string | null, logoUrl?: string | null, website?: string | null, satelliteUrl?: string | null, flaggedWords: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type BindTenantMutationVariables = Exact<{
  token: Scalars['String'];
}>;


export type BindTenantMutation = { __typename?: 'Mutation', bindTenant: { __typename?: 'StatusResponse', code: string } };

export type GetTenantsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetTenantsQuery = { __typename?: 'Query', tenants: Array<{ __typename?: 'Tenant', _id: string, flags: Array<string>, code: string, school?: string | null, admins: Array<string>, counselors: Array<string>, marshals: Array<string>, theme?: string | null, services: Array<string>, htmlUrl?: string | null, logoUrl?: string | null, website?: string | null, satelliteUrl?: string | null, flaggedWords: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type GetTenantTokenQueryVariables = Exact<{
  id: Scalars['ID'];
  expiresIn?: InputMaybe<Scalars['Int']>;
}>;


export type GetTenantTokenQuery = { __typename?: 'Query', tenantToken: { __typename?: 'TenantToken', token: string, expireAt: number } };

export type RemoveTenantMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveTenantMutation = { __typename?: 'Mutation', removeTenant: { __typename?: 'StatusResponse', code: string } };

export type SendTestEmailMutationVariables = Exact<{
  id: Scalars['ID'];
  email: Scalars['String'];
}>;


export type SendTestEmailMutation = { __typename?: 'Mutation', sendTestEmail: { __typename?: 'StatusResponse', code: string } };

export type UnbindTenantMutationVariables = Exact<{
  id: Scalars['ID'];
  userId: Scalars['String'];
}>;


export type UnbindTenantMutation = { __typename?: 'Mutation', unbindTenant: { __typename?: 'StatusResponse', code: string } };

export type UpdateTenantCoreMutationVariables = Exact<{
  id: Scalars['ID'];
  tenant: TenantCoreInput;
}>;


export type UpdateTenantCoreMutation = { __typename?: 'Mutation', updateTenantCore: { __typename?: 'Tenant', _id: string, flags: Array<string>, code: string, school?: string | null, admins: Array<string>, counselors: Array<string>, marshals: Array<string>, theme?: string | null, services: Array<string>, htmlUrl?: string | null, logoUrl?: string | null, website?: string | null, satelliteUrl?: string | null, flaggedWords: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type UpdateTenantExtraMutationVariables = Exact<{
  id: Scalars['ID'];
  tenant: TenantExtraInput;
}>;


export type UpdateTenantExtraMutation = { __typename?: 'Mutation', updateTenantExtra: { __typename?: 'Tenant', _id: string, flags: Array<string>, code: string, school?: string | null, admins: Array<string>, counselors: Array<string>, marshals: Array<string>, theme?: string | null, services: Array<string>, htmlUrl?: string | null, logoUrl?: string | null, website?: string | null, satelliteUrl?: string | null, flaggedWords: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, name: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type TutorRankingFieldsFragment = { __typename?: 'TutorRanking', _id: string, correctness: number, explicitness: number, punctuality: number };

export type GetTutorRankingQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetTutorRankingQuery = { __typename?: 'Query', tutorRanking?: { __typename?: 'TutorRanking', _id: string, correctness: number, explicitness: number, punctuality: number } | null };

export type GetTutorRankingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTutorRankingsQuery = { __typename?: 'Query', tutorRankings: Array<{ __typename?: 'TutorRanking', _id: string, correctness: number, explicitness: number, punctuality: number }> };

export type TutorFieldsFragment = { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type GetTutorQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetTutorQuery = { __typename?: 'Query', tutor?: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetTutorsQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetTutorsQuery = { __typename?: 'Query', tutors: Array<{ __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type AddTutorMutationVariables = Exact<{
  tenantId: Scalars['String'];
  userId: Scalars['String'];
}>;


export type AddTutorMutation = { __typename?: 'Mutation', addTutor: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTutorCredentialMutationVariables = Exact<{
  id: Scalars['ID'];
  title: Scalars['String'];
  proofs: Array<Scalars['String']> | Scalars['String'];
}>;


export type AddTutorCredentialMutation = { __typename?: 'Mutation', addTutorCredential: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTutorRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddTutorRemarkMutation = { __typename?: 'Mutation', addTutorRemark: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTutorSpecialtyMutationVariables = Exact<{
  id: Scalars['ID'];
  note?: InputMaybe<Scalars['String']>;
  lang: Scalars['String'];
  level: Scalars['String'];
  subject: Scalars['String'];
}>;


export type AddTutorSpecialtyMutation = { __typename?: 'Mutation', addTutorSpecialty: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveTutorMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveTutorMutation = { __typename?: 'Mutation', removeTutor: { __typename?: 'StatusResponse', code: string } };

export type RemoveTutorCredentialMutationVariables = Exact<{
  id: Scalars['ID'];
  credentialId: Scalars['String'];
}>;


export type RemoveTutorCredentialMutation = { __typename?: 'Mutation', removeTutorCredential: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveTutorSpecialtyMutationVariables = Exact<{
  id: Scalars['ID'];
  specialtyId: Scalars['String'];
}>;


export type RemoveTutorSpecialtyMutation = { __typename?: 'Mutation', removeTutorSpecialty: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type UpdateTutorMutationVariables = Exact<{
  id: Scalars['ID'];
  intro: Scalars['String'];
  officeHour?: InputMaybe<Scalars['String']>;
}>;


export type UpdateTutorMutation = { __typename?: 'Mutation', updateTutor: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type VerifyTutorCredentialMutationVariables = Exact<{
  id: Scalars['ID'];
  credentialId: Scalars['String'];
}>;


export type VerifyTutorCredentialMutation = { __typename?: 'Mutation', verifyTutorCredential: { __typename?: 'Tutor', _id: string, flags: Array<string>, tenant: string, user: string, intro?: string | null, officeHour?: string | null, rankingUpdatedAt: number, star?: number | null, createdAt: number, updatedAt: number, deletedAt?: number | null, credentials: Array<{ __typename?: 'Credential', _id: string, title: string, proofs?: Array<string> | null, updatedAt: number, verifiedAt?: number | null }>, specialties: Array<{ __typename?: 'Specialty', _id: string, note?: string | null, lang: string, level: string, subject: string, ranking: { __typename?: 'SpecialtyRanking', correctness: number, punctuality: number, explicitness: number } }>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type TypographyFieldsFragment = { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddCustomTypographyMutationVariables = Exact<{
  id: Scalars['ID'];
  tenantId: Scalars['String'];
  custom: TypographyCustomInput;
}>;


export type AddCustomTypographyMutation = { __typename?: 'Mutation', addCustomTypography: { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTypographyMutationVariables = Exact<{
  typography: TypographyInput;
}>;


export type AddTypographyMutation = { __typename?: 'Mutation', addTypography: { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type AddTypographyRemarkMutationVariables = Exact<{
  id: Scalars['ID'];
  remark: Scalars['String'];
}>;


export type AddTypographyRemarkMutation = { __typename?: 'Mutation', addTypographyRemark: { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type GetTypographyQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type GetTypographyQuery = { __typename?: 'Query', typography?: { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } | null };

export type GetTypographiesQueryVariables = Exact<{
  query?: InputMaybe<QueryInput>;
}>;


export type GetTypographiesQuery = { __typename?: 'Query', typographies: Array<{ __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null }> };

export type RemoveCustomTypographyMutationVariables = Exact<{
  id: Scalars['ID'];
  tenantId: Scalars['String'];
}>;


export type RemoveCustomTypographyMutation = { __typename?: 'Mutation', removeCustomTypography: { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type RemoveTypographyMutationVariables = Exact<{
  id: Scalars['ID'];
  remark?: InputMaybe<Scalars['String']>;
}>;


export type RemoveTypographyMutation = { __typename?: 'Mutation', removeTypography: { __typename?: 'StatusResponse', code: string } };

export type UpdateTypographyMutationVariables = Exact<{
  id: Scalars['ID'];
  typography: TypographyInput;
}>;


export type UpdateTypographyMutation = { __typename?: 'Mutation', updateTypography: { __typename?: 'Typography', _id: string, flags: Array<string>, key: string, createdAt: number, updatedAt: number, deletedAt?: number | null, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, customs?: Array<{ __typename?: 'TypographyCustom', tenant: string, title: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null }, content: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } }> | null, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export type UserFieldsFragment = { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null };

export type AddUserMutationVariables = Exact<{
  tenantId: Scalars['String'];
  email: Scalars['String'];
}>;


export type AddUserMutation = { __typename?: 'Mutation', addUser: { __typename?: 'User', _id: string, flags: Array<string>, tenants: Array<string>, status: string, name: string, loginIds: Array<string>, emails: Array<string>, avatarUrl?: string | null, mobile?: string | null, whatsapp?: string | null, networkStatus?: string | null, timezone: string, locale: string, darkMode: boolean, theme?: string | null, roles: Array<string>, features: Array<string>, scopes: Array<string>, yob?: number | null, dob?: string | null, coin: number, virtualCoin: number, balanceAuditedAt: number, preference?: string | null, interests: Array<string>, supervisors: Array<string>, staffs: Array<string>, suspension?: string | null, expoPushTokens: Array<string>, creditability: number, school?: string | null, studentId?: string | null, photoUrl?: string | null, favoriteTutors: Array<string>, createdAt: number, updatedAt: number, deletedAt?: number | null, formalName?: { __typename?: 'Locale', enUS?: string | null, zhCN?: string | null, zhHK?: string | null } | null, oAuth2: Array<{ __typename?: 'OAuth2', _id: string, provider: string, email: string, avatarUrl?: string | null }>, apiKeys?: Array<{ __typename?: 'ApiKey', value: string, scope: string, note?: string | null, expireAt: number } | null> | null, paymentMethods: Array<{ __typename?: 'PaymentMethod', currency: string, type: string, bank?: string | null, account: string, payable: boolean, receivable: boolean }>, subscriptions: Array<{ __typename?: 'Subscription', token: string, subscription: string, enabled: boolean, permission: string, ip: string, ua: string }>, violations: Array<{ __typename?: 'Violation', createdAt: number, reason: string, links: Array<string> }>, histories: Array<{ __typename?: 'YearLevelClass', year: string, school: string, studentId?: string | null, level: string, schoolClass?: string | null, updatedAt: number } | null>, remarks?: Array<{ __typename?: 'Remark', _id: string, u?: string | null, t: number, m: string }> | null } };

export const AnnouncementFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AnnouncementFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Announcement"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"tenant"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"beginAt"}},{"kind":"Field","name":{"kind":"Name","value":"endAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}}]} as unknown as DocumentNode<AnnouncementFieldsFragment, unknown>;
export const LocaleFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LocaleFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Locale"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enUS"}},{"kind":"Field","name":{"kind":"Name","value":"zhCN"}},{"kind":"Field","name":{"kind":"Name","value":"zhHK"}}]}}]} as unknown as DocumentNode<LocaleFieldsFragment, unknown>;
export const RemarkFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RemarkFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Remark"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"u"}},{"kind":"Field","name":{"kind":"Name","value":"t"}},{"kind":"Field","name":{"kind":"Name","value":"m"}}]}}]} as unknown as DocumentNode<RemarkFieldsFragment, unknown>;
export const UserFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"tenants"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"formalName"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"loginIds"}},{"kind":"Field","name":{"kind":"Name","value":"emails"}},{"kind":"Field","name":{"kind":"Name","value":"oAuth2"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"mobile"}},{"kind":"Field","name":{"kind":"Name","value":"whatsapp"}},{"kind":"Field","name":{"kind":"Name","value":"networkStatus"}},{"kind":"Field","name":{"kind":"Name","value":"timezone"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"darkMode"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"apiKeys"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"scope"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"features"}},{"kind":"Field","name":{"kind":"Name","value":"scopes"}},{"kind":"Field","name":{"kind":"Name","value":"yob"}},{"kind":"Field","name":{"kind":"Name","value":"dob"}},{"kind":"Field","name":{"kind":"Name","value":"coin"}},{"kind":"Field","name":{"kind":"Name","value":"virtualCoin"}},{"kind":"Field","name":{"kind":"Name","value":"balanceAuditedAt"}},{"kind":"Field","name":{"kind":"Name","value":"paymentMethods"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"bank"}},{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"payable"}},{"kind":"Field","name":{"kind":"Name","value":"receivable"}}]}},{"kind":"Field","name":{"kind":"Name","value":"preference"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"subscription"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"permission"}},{"kind":"Field","name":{"kind":"Name","value":"ip"}},{"kind":"Field","name":{"kind":"Name","value":"ua"}}]}},{"kind":"Field","name":{"kind":"Name","value":"interests"}},{"kind":"Field","name":{"kind":"Name","value":"supervisors"}},{"kind":"Field","name":{"kind":"Name","value":"staffs"}},{"kind":"Field","name":{"kind":"Name","value":"violations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"suspension"}},{"kind":"Field","name":{"kind":"Name","value":"expoPushTokens"}},{"kind":"Field","name":{"kind":"Name","value":"creditability"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"photoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"histories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"studentId"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"schoolClass"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"favoriteTutors"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UserFieldsFragment, unknown>;
export const AuthSuccessfulResponseFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthSuccessfulResponseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthSuccessfulResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"accessTokenExpireAt"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshTokenExpireAt"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},...UserFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AuthSuccessfulResponseFieldsFragment, unknown>;
export const AuthResponseFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"AuthResponseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AuthResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"accessTokenExpireAt"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshTokenExpireAt"}},{"kind":"Field","name":{"kind":"Name","value":"conflict"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ip"}},{"kind":"Field","name":{"kind":"Name","value":"maxLogin"}},{"kind":"Field","name":{"kind":"Name","value":"exceedLogin"}}]}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},...UserFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AuthResponseFieldsFragment, unknown>;
export const ContributionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"school"}}]}},{"kind":"Field","name":{"kind":"Name","value":"urls"}}]}}]} as unknown as DocumentNode<ContributionFieldsFragment, unknown>;
export const ContentFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContentFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Content"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"parents"}},{"kind":"Field","name":{"kind":"Name","value":"creator"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ContentFieldsFragment, unknown>;
export const BookFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"BookFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Book"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"publisher"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"subjects"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"subTitle"}},{"kind":"Field","name":{"kind":"Name","value":"chatGroup"}},{"kind":"Field","name":{"kind":"Name","value":"assignments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"contribution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"chapter"}},{"kind":"Field","name":{"kind":"Name","value":"content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"dynParams"}},{"kind":"Field","name":{"kind":"Name","value":"solutions"}},{"kind":"Field","name":{"kind":"Name","value":"examples"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"supplements"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"contribution"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"chapter"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"revisions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"rev"}},{"kind":"Field","name":{"kind":"Name","value":"isbn"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"imageUrls"}},{"kind":"Field","name":{"kind":"Name","value":"listPrice"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...ContributionFieldsFragmentDoc.definitions,...ContentFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<BookFieldsFragment, unknown>;
export const ChatGroupFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChatGroupFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ChatGroup"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"tenant"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"membership"}},{"kind":"Field","name":{"kind":"Name","value":"users"}},{"kind":"Field","name":{"kind":"Name","value":"admins"}},{"kind":"Field","name":{"kind":"Name","value":"chats"}},{"kind":"Field","name":{"kind":"Name","value":"adminKey"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ChatGroupFieldsFragment, unknown>;
export const MemberFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MemberFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Member"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"lastViewedAt"}}]}}]} as unknown as DocumentNode<MemberFieldsFragment, unknown>;
export const ChatFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Chat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"parents"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"members"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MemberFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contents"}},{"kind":"Field","name":{"kind":"Name","value":"contentsToken"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},...MemberFieldsFragmentDoc.definitions]} as unknown as DocumentNode<ChatFieldsFragment, unknown>;
export const ClassroomFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ClassroomFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Classroom"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"tenant"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"schoolClass"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"room"}},{"kind":"Field","name":{"kind":"Name","value":"schedule"}},{"kind":"Field","name":{"kind":"Name","value":"books"}},{"kind":"Field","name":{"kind":"Name","value":"teachers"}},{"kind":"Field","name":{"kind":"Name","value":"students"}},{"kind":"Field","name":{"kind":"Name","value":"chats"}},{"kind":"Field","name":{"kind":"Name","value":"assignments"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<ClassroomFieldsFragment, unknown>;
export const StatusResponseFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"StatusResponse"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"StatusResponse"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}}]}}]} as unknown as DocumentNode<StatusResponseFragment, unknown>;
export const ContactFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContactFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contact"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"tenants"}}]}}]} as unknown as DocumentNode<ContactFieldsFragment, unknown>;
export const DistrictFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DistrictFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"District"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"region"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<DistrictFieldsFragment, unknown>;
export const LevelFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"LevelFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Level"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"nextLevel"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<LevelFieldsFragment, unknown>;
export const PresignedUrlFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PresignedUrlFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PresignedUrl"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"expiry"}}]}}]} as unknown as DocumentNode<PresignedUrlFieldsFragment, unknown>;
export const PublisherFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PublisherFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Publisher"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"admins"}},{"kind":"Field","name":{"kind":"Name","value":"phones"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<PublisherFieldsFragment, unknown>;
export const SchoolFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SchoolFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"School"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"enUS"}},{"kind":"Field","name":{"kind":"Name","value":"zhCN"}},{"kind":"Field","name":{"kind":"Name","value":"zhHK"}}]}},{"kind":"Field","name":{"kind":"Name","value":"district"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coordinates"}}]}},{"kind":"Field","name":{"kind":"Name","value":"phones"}},{"kind":"Field","name":{"kind":"Name","value":"emi"}},{"kind":"Field","name":{"kind":"Name","value":"band"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"funding"}},{"kind":"Field","name":{"kind":"Name","value":"gender"}},{"kind":"Field","name":{"kind":"Name","value":"religion"}},{"kind":"Field","name":{"kind":"Name","value":"levels"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<SchoolFieldsFragment, unknown>;
export const SubjectFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SubjectFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Subject"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"levels"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<SubjectFieldsFragment, unknown>;
export const TagFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TagFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tag"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<TagFieldsFragment, unknown>;
export const TenantFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TenantFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tenant"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"school"}},{"kind":"Field","name":{"kind":"Name","value":"admins"}},{"kind":"Field","name":{"kind":"Name","value":"counselors"}},{"kind":"Field","name":{"kind":"Name","value":"marshals"}},{"kind":"Field","name":{"kind":"Name","value":"theme"}},{"kind":"Field","name":{"kind":"Name","value":"services"}},{"kind":"Field","name":{"kind":"Name","value":"htmlUrl"}},{"kind":"Field","name":{"kind":"Name","value":"logoUrl"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"satelliteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"flaggedWords"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<TenantFieldsFragment, unknown>;
export const TutorRankingFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TutorRankingFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"TutorRanking"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"correctness"}},{"kind":"Field","name":{"kind":"Name","value":"explicitness"}},{"kind":"Field","name":{"kind":"Name","value":"punctuality"}}]}}]} as unknown as DocumentNode<TutorRankingFieldsFragment, unknown>;
export const TutorFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TutorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tutor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"tenant"}},{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"intro"}},{"kind":"Field","name":{"kind":"Name","value":"officeHour"}},{"kind":"Field","name":{"kind":"Name","value":"credentials"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"proofs"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"verifiedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"specialties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"note"}},{"kind":"Field","name":{"kind":"Name","value":"lang"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"subject"}},{"kind":"Field","name":{"kind":"Name","value":"ranking"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"correctness"}},{"kind":"Field","name":{"kind":"Name","value":"punctuality"}},{"kind":"Field","name":{"kind":"Name","value":"explicitness"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankingUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"star"}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<TutorFieldsFragment, unknown>;
export const TypographyFieldsFragmentDoc = {"kind":"Document", "definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TypographyFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Typography"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"flags"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"title"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"customs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tenant"}},{"kind":"Field","name":{"kind":"Name","value":"title"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LocaleFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"remarks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RemarkFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}},...LocaleFieldsFragmentDoc.definitions,...RemarkFieldsFragmentDoc.definitions]} as unknown as DocumentNode<TypographyFieldsFragment, unknown>;
export const AnalyticSessionDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AnalyticSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fullscreen"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"analyticSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"fullscreen"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fullscreen"}}},{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<AnalyticSessionMutation, AnalyticSessionMutationVariables>;
export const AddAnnouncementDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddAnnouncement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"announcement"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AnnouncementInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addAnnouncement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"announcement"},"value":{"kind":"Variable","name":{"kind":"Name","value":"announcement"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnnouncementFields"}}]}}]}},...AnnouncementFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddAnnouncementMutation, AddAnnouncementMutationVariables>;
export const GetAnnouncementDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAnnouncement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"announcement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnnouncementFields"}}]}}]}},...AnnouncementFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetAnnouncementQuery, GetAnnouncementQueryVariables>;
export const GetAnnouncementsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAnnouncements"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"announcements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AnnouncementFields"}}]}}]}},...AnnouncementFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetAnnouncementsQuery, GetAnnouncementsQueryVariables>;
export const RemoveAnnouncementDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveAnnouncement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeAnnouncement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveAnnouncementMutation, RemoveAnnouncementMutationVariables>;
export const DeregisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Deregister"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deregister"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}},{"kind":"Argument","name":{"kind":"Name","value":"clientHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"days"}}]}}]}}]} as unknown as DocumentNode<DeregisterMutation, DeregisterMutationVariables>;
export const ImpersonateStartDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImpersonateStart"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"impersonatedAsId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"impersonateStart"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"impersonatedAsId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"impersonatedAsId"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}},{"kind":"Argument","name":{"kind":"Name","value":"clientHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthSuccessfulResponseFields"}}]}}]}},...AuthSuccessfulResponseFieldsFragmentDoc.definitions]} as unknown as DocumentNode<ImpersonateStartMutation, ImpersonateStartMutationVariables>;
export const ImpersonateStopDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ImpersonateStop"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"impersonateStop"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<ImpersonateStopMutation, ImpersonateStopMutationVariables>;
export const ListTokensDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listTokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_id"}},{"kind":"Field","name":{"kind":"Name","value":"authUser"}},{"kind":"Field","name":{"kind":"Name","value":"ip"}},{"kind":"Field","name":{"kind":"Name","value":"ua"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<ListTokensQuery, ListTokensQueryVariables>;
export const LoginDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"force"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"isPublic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}}},{"kind":"Argument","name":{"kind":"Name","value":"force"},"value":{"kind":"Variable","name":{"kind":"Name","value":"force"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}},{"kind":"Argument","name":{"kind":"Name","value":"clientHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthResponseFields"}}]}}]}},...AuthResponseFieldsFragmentDoc.definitions]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const LoginTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LoginToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresIn"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"loginToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresIn"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresIn"}}}]}]}}]} as unknown as DocumentNode<LoginTokenMutation, LoginTokenMutationVariables>;
export const LoginWithIdDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LoginWithId"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"loginId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"force"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"loginWithId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"loginId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"loginId"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"isPublic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}}},{"kind":"Argument","name":{"kind":"Name","value":"force"},"value":{"kind":"Variable","name":{"kind":"Name","value":"force"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}},{"kind":"Argument","name":{"kind":"Name","value":"clientHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}}},{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthResponseFields"}}]}}]}},...AuthResponseFieldsFragmentDoc.definitions]} as unknown as DocumentNode<LoginWithIdMutation, LoginWithIdMutationVariables>;
export const LoginWithTokenDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LoginWithToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"loginWithToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthResponseFields"}}]}}]}},...AuthResponseFieldsFragmentDoc.definitions]} as unknown as DocumentNode<LoginWithTokenMutation, LoginWithTokenMutationVariables>;
export const LogoutDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const LogoutOtherDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LogoutOther"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logoutOther"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"count"}}]}}]}}]} as unknown as DocumentNode<LogoutOtherMutation, LogoutOtherMutationVariables>;
export const RegisterDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"isPublic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}},{"kind":"Argument","name":{"kind":"Name","value":"clientHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthSuccessfulResponseFields"}}]}}]}},...AuthSuccessfulResponseFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const RenewTokenDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenewToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renewToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"isPublic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isPublic"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}},{"kind":"Argument","name":{"kind":"Name","value":"clientHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientHash"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"AuthSuccessfulResponseFields"}}]}}]}},...AuthSuccessfulResponseFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RenewTokenMutation, RenewTokenMutationVariables>;
export const AddBookDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"book"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addBook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"book"},"value":{"kind":"Variable","name":{"kind":"Name","value":"book"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddBookMutation, AddBookMutationVariables>;
export const AddBookAssignmentDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBookAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assignment"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookAssignmentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addBookAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"assignment"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assignment"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddBookAssignmentMutation, AddBookAssignmentMutationVariables>;
export const AddBookRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBookRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addBookRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddBookRemarkMutation, AddBookRemarkMutationVariables>;
export const AddBookRevisionDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBookRevision"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"revision"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookRevisionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addBookRevision"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"revision"},"value":{"kind":"Variable","name":{"kind":"Name","value":"revision"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddBookRevisionMutation, AddBookRevisionMutationVariables>;
export const AddBookRevisionImageDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBookRevisionImage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"revisionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addBookRevisionImage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"revisionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"revisionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddBookRevisionImageMutation, AddBookRevisionImageMutationVariables>;
export const AddBookSupplementDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddBookSupplement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"supplement"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookSupplementInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addBookSupplement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"supplement"},"value":{"kind":"Variable","name":{"kind":"Name","value":"supplement"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddBookSupplementMutation, AddBookSupplementMutationVariables>;
export const IsIsbnAvailableDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IsIsbnAvailable"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isbn"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isIsbnAvailable"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"isbn"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isbn"}}}]}]}}]} as unknown as DocumentNode<IsIsbnAvailableQuery, IsIsbnAvailableQueryVariables>;
export const JoinBookChatDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"JoinBookChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"joinBookChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<JoinBookChatMutation, JoinBookChatMutationVariables>;
export const GetBookDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"book"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetBookQuery, GetBookQueryVariables>;
export const GetBooksDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBooks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"books"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetBooksQuery, GetBooksQueryVariables>;
export const RemoveBookDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveBook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeBook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveBookMutation, RemoveBookMutationVariables>;
export const RemoveBookAssignmentDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveBookAssignment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"assignmentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeBookAssignment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"assignmentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"assignmentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveBookAssignmentMutation, RemoveBookAssignmentMutationVariables>;
export const RemoveBookRevisionDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveBookRevision"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"revisionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeBookRevision"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"revisionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"revisionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveBookRevisionMutation, RemoveBookRevisionMutationVariables>;
export const RemoveBookRevisionImageDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveBookRevisionImage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"revisionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeBookRevisionImage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"revisionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"revisionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveBookRevisionImageMutation, RemoveBookRevisionImageMutationVariables>;
export const RemoveBookSupplementDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveBookSupplement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"supplementId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeBookSupplement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"supplementId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"supplementId"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveBookSupplementMutation, RemoveBookSupplementMutationVariables>;
export const UpdateBookDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBook"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"book"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BookInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateBook"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"book"},"value":{"kind":"Variable","name":{"kind":"Name","value":"book"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"BookFields"}}]}}]}},...BookFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateBookMutation, UpdateBookMutationVariables>;
export const AddChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"membership"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"logoUrl"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addChatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"membership"},"value":{"kind":"Variable","name":{"kind":"Name","value":"membership"}}},{"kind":"Argument","name":{"kind":"Name","value":"logoUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"logoUrl"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddChatGroupMutation, AddChatGroupMutationVariables>;
export const AddChatGroupAdminsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddChatGroupAdmins"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addChatGroupAdmins"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddChatGroupAdminsMutation, AddChatGroupAdminsMutationVariables>;
export const AddChatGroupUsersDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddChatGroupUsers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addChatGroupUsers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddChatGroupUsersMutation, AddChatGroupUsersMutationVariables>;
export const GetChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetChatGroupQuery, GetChatGroupQueryVariables>;
export const GetChatGroupsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChatGroups"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatGroups"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetChatGroupsQuery, GetChatGroupsQueryVariables>;
export const JoinChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"JoinChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"joinChatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<JoinChatGroupMutation, JoinChatGroupMutationVariables>;
export const LeaveChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LeaveChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveChatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<LeaveChatGroupMutation, LeaveChatGroupMutationVariables>;
export const RemoveChatGroupUsersDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveChatGroupUsers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeChatGroupUsers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveChatGroupUsersMutation, RemoveChatGroupUsersMutationVariables>;
export const ToAdminChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToAdminChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toAdminChatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<ToAdminChatGroupMutation, ToAdminChatGroupMutationVariables>;
export const ToAlexChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ToAlexChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"toAlexChatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<ToAlexChatGroupMutation, ToAlexChatGroupMutationVariables>;
export const UpdateChatGroupDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateChatGroup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"membership"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"logoUrl"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateChatGroup"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"membership"},"value":{"kind":"Variable","name":{"kind":"Name","value":"membership"}}},{"kind":"Argument","name":{"kind":"Name","value":"logoUrl"},"value":{"kind":"Variable","name":{"kind":"Name","value":"logoUrl"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatGroupFields"}}]}}]}},...ChatGroupFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateChatGroupMutation, UpdateChatGroupMutationVariables>;
export const AddChatDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddChatMutation, AddChatMutationVariables>;
export const AttachChatDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AttachChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"classroomId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"attachChatToClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"classroomId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"classroomId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AttachChatMutation, AttachChatMutationVariables>;
export const BockChatContentDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BockChatContent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blockChatContent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"contentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<BockChatContentMutation, BockChatContentMutationVariables>;
export const ClearChatFlagDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ClearChatFlag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"flag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clearChatFlag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"flag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"flag"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<ClearChatFlagMutation, ClearChatFlagMutationVariables>;
export const GetChatDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetChatQuery, GetChatQueryVariables>;
export const GetChatsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetChatsQuery, GetChatsQueryVariables>;
export const RecallChatContentDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RecallChatContent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"contentId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recallChatContent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"contentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"contentId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RecallChatContentMutation, RecallChatContentMutationVariables>;
export const SetChatFlagDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetChatFlag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"flag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setChatFlag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"flag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"flag"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<SetChatFlagMutation, SetChatFlagMutationVariables>;
export const UpdateChatLastViewedAtDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateChatLastViewedAt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"timestamp"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateChatLastViewedAt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"timestamp"},"value":{"kind":"Variable","name":{"kind":"Name","value":"timestamp"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateChatLastViewedAtMutation, UpdateChatLastViewedAtMutationVariables>;
export const UpdateChatTitleDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateChatTitle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parent"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateChatTitle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"parent"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parent"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},...ChatFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateChatTitleMutation, UpdateChatTitleMutationVariables>;
export const AddClassroomDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"year"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schoolClass"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"room"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"books"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}},{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}},{"kind":"Argument","name":{"kind":"Name","value":"year"},"value":{"kind":"Variable","name":{"kind":"Name","value":"year"}}},{"kind":"Argument","name":{"kind":"Name","value":"schoolClass"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schoolClass"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"room"},"value":{"kind":"Variable","name":{"kind":"Name","value":"room"}}},{"kind":"Argument","name":{"kind":"Name","value":"schedule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}}},{"kind":"Argument","name":{"kind":"Name","value":"books"},"value":{"kind":"Variable","name":{"kind":"Name","value":"books"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddClassroomMutation, AddClassroomMutationVariables>;
export const AddClassroomRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddClassroomRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addClassroomRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddClassroomRemarkMutation, AddClassroomRemarkMutationVariables>;
export const AddClassroomStudentsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddClassroomStudents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addClassroomStudents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddClassroomStudentsMutation, AddClassroomStudentsMutationVariables>;
export const AddClassroomTeachersDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddClassroomTeachers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addClassroomTeachers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddClassroomTeachersMutation, AddClassroomTeachersMutationVariables>;
export const GetClassroomDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetClassroomQuery, GetClassroomQueryVariables>;
export const GetClassroomsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetClassrooms"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"classrooms"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetClassroomsQuery, GetClassroomsQueryVariables>;
export const RecoverClassroomDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RecoverClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"recoverClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RecoverClassroomMutation, RecoverClassroomMutationVariables>;
export const RemoveClassroomDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveClassroomMutation, RemoveClassroomMutationVariables>;
export const RemoveClassroomStudentsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveClassroomStudents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeClassroomStudents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveClassroomStudentsMutation, RemoveClassroomStudentsMutationVariables>;
export const RemoveClassroomTeachersDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveClassroomTeachers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeClassroomTeachers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveClassroomTeachersMutation, RemoveClassroomTeachersMutationVariables>;
export const UpdateClassroomDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateClassroom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"room"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"books"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateClassroom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"room"},"value":{"kind":"Variable","name":{"kind":"Name","value":"room"}}},{"kind":"Argument","name":{"kind":"Name","value":"schedule"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schedule"}}},{"kind":"Argument","name":{"kind":"Name","value":"books"},"value":{"kind":"Variable","name":{"kind":"Name","value":"books"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ClassroomFields"}}]}}]}},...ClassroomFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateClassroomMutation, UpdateClassroomMutationVariables>;
export const GetContentDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"updateAfter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"DateInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"content"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"updateAfter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"updateAfter"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContentFields"}}]}}]}},...ContentFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetContentQuery, GetContentQueryVariables>;
export const GetContactTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContactToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contactToken"}}]}}]} as unknown as DocumentNode<GetContactTokenQuery, GetContactTokenQueryVariables>;
export const AddContactDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContactFields"}}]}}]}},...ContactFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddContactMutation, AddContactMutationVariables>;
export const GetContactDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContactFields"}}]}}]}},...ContactFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetContactQuery, GetContactQueryVariables>;
export const GetContactsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetContacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contacts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContactFields"}}]}}]}},...ContactFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetContactsQuery, GetContactsQueryVariables>;
export const RemoveContactDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveContactMutation, RemoveContactMutationVariables>;
export const UpdateContactDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContact"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContact"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContactFields"}}]}}]}},...ContactFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateContactMutation, UpdateContactMutationVariables>;
export const AddDistrictDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddDistrict"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"district"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DistrictInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addDistrict"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"district"},"value":{"kind":"Variable","name":{"kind":"Name","value":"district"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DistrictFields"}}]}}]}},...DistrictFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddDistrictMutation, AddDistrictMutationVariables>;
export const AddDistrictRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddDistrictRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addDistrictRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DistrictFields"}}]}}]}},...DistrictFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddDistrictRemarkMutation, AddDistrictRemarkMutationVariables>;
export const GetDistrictDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDistrict"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"district"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DistrictFields"}}]}}]}},...DistrictFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetDistrictQuery, GetDistrictQueryVariables>;
export const GetDistrictsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDistricts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"districts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DistrictFields"}}]}}]}},...DistrictFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetDistrictsQuery, GetDistrictsQueryVariables>;
export const RemoveDistrictDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveDistrict"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeDistrict"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveDistrictMutation, RemoveDistrictMutationVariables>;
export const UpdateDistrictDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDistrict"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"district"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DistrictInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDistrict"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"district"},"value":{"kind":"Variable","name":{"kind":"Name","value":"district"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DistrictFields"}}]}}]}},...DistrictFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateDistrictMutation, UpdateDistrictMutationVariables>;
export const AddLevelDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddLevel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LevelInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addLevel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelFields"}}]}}]}},...LevelFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddLevelMutation, AddLevelMutationVariables>;
export const AddLevelRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddLevelRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addLevelRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelFields"}}]}}]}},...LevelFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddLevelRemarkMutation, AddLevelRemarkMutationVariables>;
export const GetLevelDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLevel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"level"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelFields"}}]}}]}},...LevelFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetLevelQuery, GetLevelQueryVariables>;
export const GetLevelsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLevels"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"levels"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelFields"}}]}}]}},...LevelFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetLevelsQuery, GetLevelsQueryVariables>;
export const RemoveLevelDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveLevel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeLevel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveLevelMutation, RemoveLevelMutationVariables>;
export const UpdateLevelDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLevel"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LevelInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLevel"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"LevelFields"}}]}}]}},...LevelFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateLevelMutation, UpdateLevelMutationVariables>;
export const ChangePasswordDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangePassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changePassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"currPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}},{"kind":"Argument","name":{"kind":"Name","value":"refreshToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"refreshToken"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const ResetPasswordRequestDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPasswordRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPasswordRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<ResetPasswordRequestMutation, ResetPasswordRequestMutationVariables>;
export const ResetPasswordConfirmDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPasswordConfirm"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CoordinatesInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPasswordConfirm"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"coordinates"},"value":{"kind":"Variable","name":{"kind":"Name","value":"coordinates"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<ResetPasswordConfirmMutation, ResetPasswordConfirmMutationVariables>;
export const AddPresignedUrlDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddPresignedUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"bucketType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addPresignedUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"bucketType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"bucketType"}}},{"kind":"Argument","name":{"kind":"Name","value":"ext"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ext"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PresignedUrlFields"}}]}}]}},...PresignedUrlFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddPresignedUrlMutation, AddPresignedUrlMutationVariables>;
export const AddPublisherDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddPublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publisher"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublisherInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addPublisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"publisher"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publisher"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFields"}}]}}]}},...PublisherFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddPublisherMutation, AddPublisherMutationVariables>;
export const AddPublisherRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddPublisherRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addPublisherRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFields"}}]}}]}},...PublisherFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddPublisherRemarkMutation, AddPublisherRemarkMutationVariables>;
export const GetPublisherDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFields"}}]}}]}},...PublisherFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetPublisherQuery, GetPublisherQueryVariables>;
export const GetPublishersDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublishers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publishers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFields"}}]}}]}},...PublisherFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetPublishersQuery, GetPublishersQueryVariables>;
export const RemovePublisherDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemovePublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removePublisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemovePublisherMutation, RemovePublisherMutationVariables>;
export const UpdatePublisherDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePublisher"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publisher"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PublisherInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePublisher"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"publisher"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publisher"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PublisherFields"}}]}}]}},...PublisherFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdatePublisherMutation, UpdatePublisherMutationVariables>;
export const AddRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}]}]}}]} as unknown as DocumentNode<AddRoleMutation, AddRoleMutationVariables>;
export const GetRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<GetRoleQuery, GetRoleQueryVariables>;
export const RemoveRoleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveRole"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"role"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeRole"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"role"},"value":{"kind":"Variable","name":{"kind":"Name","value":"role"}}}]}]}}]} as unknown as DocumentNode<RemoveRoleMutation, RemoveRoleMutationVariables>;
export const AddSchoolDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddSchool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"school"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SchoolInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSchool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"school"},"value":{"kind":"Variable","name":{"kind":"Name","value":"school"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SchoolFields"}}]}}]}},...SchoolFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddSchoolMutation, AddSchoolMutationVariables>;
export const AddSchoolRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddSchoolRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSchoolRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SchoolFields"}}]}}]}},...SchoolFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddSchoolRemarkMutation, AddSchoolRemarkMutationVariables>;
export const GetSchoolDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSchool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"school"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SchoolFields"}}]}}]}},...SchoolFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetSchoolQuery, GetSchoolQueryVariables>;
export const GetSchoolsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSchools"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"schools"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SchoolFields"}}]}}]}},...SchoolFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetSchoolsQuery, GetSchoolsQueryVariables>;
export const RemoveSchoolDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveSchool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeSchool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveSchoolMutation, RemoveSchoolMutationVariables>;
export const UpdateSchoolDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSchool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"school"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SchoolInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSchool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"school"},"value":{"kind":"Variable","name":{"kind":"Name","value":"school"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SchoolFields"}}]}}]}},...SchoolFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateSchoolMutation, UpdateSchoolMutationVariables>;
export const AddSubjectDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFields"}}]}}]}},...SubjectFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddSubjectMutation, AddSubjectMutationVariables>;
export const AddSubjectRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddSubjectRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addSubjectRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFields"}}]}}]}},...SubjectFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddSubjectRemarkMutation, AddSubjectRemarkMutationVariables>;
export const GetSubjectDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFields"}}]}}]}},...SubjectFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetSubjectQuery, GetSubjectQueryVariables>;
export const Get_SubjectsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GET_SUBJECTS"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subjects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFields"}}]}}]}},...SubjectFieldsFragmentDoc.definitions]} as unknown as DocumentNode<Get_SubjectsQuery, Get_SubjectsQueryVariables>;
export const RemoveSubjectDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveSubjectMutation, RemoveSubjectMutationVariables>;
export const UpdateSubjectDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSubject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SubjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSubject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SubjectFields"}}]}}]}},...SubjectFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateSubjectMutation, UpdateSubjectMutationVariables>;
export const GetServerInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetServerInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"serverInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"primaryTenantId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"minio"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"hubVersion"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}},{"kind":"Field","name":{"kind":"Name","value":"builtAt"}}]}}]}}]} as unknown as DocumentNode<GetServerInfoQuery, GetServerInfoQueryVariables>;
export const PingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Ping"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ping"}}]}}]} as unknown as DocumentNode<PingQuery, PingQueryVariables>;
export const AddTagDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TagInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TagFields"}}]}}]}},...TagFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTagMutation, AddTagMutationVariables>;
export const AddTagRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTagRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTagRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TagFields"}}]}}]}},...TagFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTagRemarkMutation, AddTagRemarkMutationVariables>;
export const GetTagDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TagFields"}}]}}]}},...TagFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTagQuery, GetTagQueryVariables>;
export const GetTagsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTags"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tags"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TagFields"}}]}}]}},...TagFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTagsQuery, GetTagsQueryVariables>;
export const RemoveTagDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveTagMutation, RemoveTagMutationVariables>;
export const UpdateTagDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTag"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tag"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TagInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTag"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"tag"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tag"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TagFields"}}]}}]}},...TagFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateTagMutation, UpdateTagMutationVariables>;
export const AddTenantDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTenant"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenant"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TenantCoreInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTenant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenant"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenant"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantFields"}}]}}]}},...TenantFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTenantMutation, AddTenantMutationVariables>;
export const AddTenantRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTenantRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTenantRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantFields"}}]}}]}},...TenantFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTenantRemarkMutation, AddTenantRemarkMutationVariables>;
export const BindTenantDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BindTenant"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bindTenant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<BindTenantMutation, BindTenantMutationVariables>;
export const GetTenantsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTenants"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tenants"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantFields"}}]}}]}},...TenantFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTenantsQuery, GetTenantsQueryVariables>;
export const GetTenantTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTenantToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"expiresIn"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tenantToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"expiresIn"},"value":{"kind":"Variable","name":{"kind":"Name","value":"expiresIn"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}}]}}]} as unknown as DocumentNode<GetTenantTokenQuery, GetTenantTokenQueryVariables>;
export const RemoveTenantDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTenant"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTenant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveTenantMutation, RemoveTenantMutationVariables>;
export const SendTestEmailDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendTestEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendTestEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<SendTestEmailMutation, SendTestEmailMutationVariables>;
export const UnbindTenantDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnbindTenant"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unbindTenant"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<UnbindTenantMutation, UnbindTenantMutationVariables>;
export const UpdateTenantCoreDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTenantCore"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenant"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TenantCoreInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTenantCore"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"tenant"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenant"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantFields"}}]}}]}},...TenantFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateTenantCoreMutation, UpdateTenantCoreMutationVariables>;
export const UpdateTenantExtraDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTenantExtra"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenant"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TenantExtraInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTenantExtra"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"tenant"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenant"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TenantFields"}}]}}]}},...TenantFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateTenantExtraMutation, UpdateTenantExtraMutationVariables>;
export const GetTutorRankingDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTutorRanking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tutorRanking"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorRankingFields"}}]}}]}},...TutorRankingFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTutorRankingQuery, GetTutorRankingQueryVariables>;
export const GetTutorRankingsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTutorRankings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tutorRankings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorRankingFields"}}]}}]}},...TutorRankingFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTutorRankingsQuery, GetTutorRankingsQueryVariables>;
export const GetTutorDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTutor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tutor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTutorQuery, GetTutorQueryVariables>;
export const GetTutorsDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTutors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tutors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTutorsQuery, GetTutorsQueryVariables>;
export const AddTutorDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTutor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTutor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTutorMutation, AddTutorMutationVariables>;
export const AddTutorCredentialDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTutorCredential"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"proofs"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTutorCredential"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"proofs"},"value":{"kind":"Variable","name":{"kind":"Name","value":"proofs"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTutorCredentialMutation, AddTutorCredentialMutationVariables>;
export const AddTutorRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTutorRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTutorRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTutorRemarkMutation, AddTutorRemarkMutationVariables>;
export const AddTutorSpecialtyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTutorSpecialty"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"note"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lang"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"level"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subject"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTutorSpecialty"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"note"},"value":{"kind":"Variable","name":{"kind":"Name","value":"note"}}},{"kind":"Argument","name":{"kind":"Name","value":"lang"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lang"}}},{"kind":"Argument","name":{"kind":"Name","value":"level"},"value":{"kind":"Variable","name":{"kind":"Name","value":"level"}}},{"kind":"Argument","name":{"kind":"Name","value":"subject"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subject"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTutorSpecialtyMutation, AddTutorSpecialtyMutationVariables>;
export const RemoveTutorDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTutor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTutor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveTutorMutation, RemoveTutorMutationVariables>;
export const RemoveTutorCredentialDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTutorCredential"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"credentialId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTutorCredential"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"credentialId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"credentialId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveTutorCredentialMutation, RemoveTutorCredentialMutationVariables>;
export const RemoveTutorSpecialtyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTutorSpecialty"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"specialtyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTutorSpecialty"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"specialtyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"specialtyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveTutorSpecialtyMutation, RemoveTutorSpecialtyMutationVariables>;
export const UpdateTutorDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTutor"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"intro"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"officeHour"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTutor"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"intro"},"value":{"kind":"Variable","name":{"kind":"Name","value":"intro"}}},{"kind":"Argument","name":{"kind":"Name","value":"officeHour"},"value":{"kind":"Variable","name":{"kind":"Name","value":"officeHour"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateTutorMutation, UpdateTutorMutationVariables>;
export const VerifyTutorCredentialDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyTutorCredential"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"credentialId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyTutorCredential"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"credentialId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"credentialId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TutorFields"}}]}}]}},...TutorFieldsFragmentDoc.definitions]} as unknown as DocumentNode<VerifyTutorCredentialMutation, VerifyTutorCredentialMutationVariables>;
export const AddCustomTypographyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddCustomTypography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"custom"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TypographyCustomInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addCustomTypography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"custom"},"value":{"kind":"Variable","name":{"kind":"Name","value":"custom"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddCustomTypographyMutation, AddCustomTypographyMutationVariables>;
export const AddTypographyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTypography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"typography"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TypographyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTypography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"typography"},"value":{"kind":"Variable","name":{"kind":"Name","value":"typography"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTypographyMutation, AddTypographyMutationVariables>;
export const AddTypographyRemarkDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTypographyRemark"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTypographyRemark"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddTypographyRemarkMutation, AddTypographyRemarkMutationVariables>;
export const GetTypographyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTypography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"typography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTypographyQuery, GetTypographyQueryVariables>;
export const GetTypographiesDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTypographies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"typographies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<GetTypographiesQuery, GetTypographiesQueryVariables>;
export const RemoveCustomTypographyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveCustomTypography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeCustomTypography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<RemoveCustomTypographyMutation, RemoveCustomTypographyMutationVariables>;
export const RemoveTypographyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTypography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"remark"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTypography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"remark"},"value":{"kind":"Variable","name":{"kind":"Name","value":"remark"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"StatusResponse"}}]}}]}},...StatusResponseFragmentDoc.definitions]} as unknown as DocumentNode<RemoveTypographyMutation, RemoveTypographyMutationVariables>;
export const UpdateTypographyDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTypography"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"typography"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TypographyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTypography"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"typography"},"value":{"kind":"Variable","name":{"kind":"Name","value":"typography"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TypographyFields"}}]}}]}},...TypographyFieldsFragmentDoc.definitions]} as unknown as DocumentNode<UpdateTypographyMutation, UpdateTypographyMutationVariables>;
export const AddUserDocument = {"kind":"Document", "definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tenantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tenantId"}}},{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFields"}}]}}]}},...UserFieldsFragmentDoc.definitions]} as unknown as DocumentNode<AddUserMutation, AddUserMutationVariables>;