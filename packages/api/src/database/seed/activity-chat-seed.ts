/**
 * Seeder: Activity & Chat
 *
 */

import { LOCALE } from '@argonne/common';
import chalk from 'chalk';

import type { ActivityDocument } from '../../models/activity';
import Activity from '../../models/activity';
import type { ChatDocument } from '../../models/chat';
import Chat from '../../models/chat';
import type { ChatGroupDocument } from '../../models/chat-group';
import ChatGroup from '../../models/chat-group';
import type { ContentDocument } from '../../models/content';
import Content from '../../models/content';
import Tenant from '../../models/tenant';
import User from '../../models/user';

const { ACTIVITY, CHAT_GROUP } = LOCALE.DB_ENUM;

const seed = async (): Promise<string> => {
  const [{ alexId }, stemTenant] = await Promise.all([User.findSystemAccountIds(), Tenant.exists({ code: 'STEM' })]);

  // activities
  const activities: Partial<ActivityDocument>[] = [
    {
      status: ACTIVITY.STATUS.DRAFT,
      owners: [alexId],
      title: 'Python For Everything',
      description: 'Learn Python Programming for non-STEM',
      fee: 0,
      venue: 'In School',
      schedule: 'Jul 10- Aug 10, Every Monday 3-5pm',
    },
    {
      status: ACTIVITY.STATUS.PENDING,
      owners: [alexId],
      title: '國際象棋研習班 (七月－黃)',
      description: 'TODO',
      fee: 100,
      venue: 'TBD',
    },
    {
      status: ACTIVITY.STATUS.OPEN,
      owners: [alexId],
      title: 'Javascript for Beginner',
      description: 'TODO',
    },
  ];

  // public chatGroups (project)
  const seedingChatGroups = [
    {
      title: 'Mini Clone Project',
    },
    {
      title: 'Climate Control: adjust air-conditioning temperature suits for sleeping pattern',
    },
    {
      title: 'Arduino',
      description: 'Arduino Hardware & Software (WiFi + Bluetooth with Android/iOS app)',
    },
    {
      title: 'Biotech',
      description: 'ECG/EKG, DNA Sequence',
    },
    {
      title: 'Chemistry (Periodic Table)',
      description: 'https://github.com/lmmentel/awesome-python-chemistry',
    },
    {
      title: 'Fintech',
      description: 'Algorithmic Trading, Stock/Commodity Value Analysis',
    },
    {
      title: 'Trade Floor',
      description: 'Goals: Mental Exercise for Elderly, and train student',
    },
    {
      title: 'Radar',
      description: 'Safe Hiking, Location Alert for elderly, ...',
    },
    {
      title: 'Restaurant Ordering',
    },
    {
      title: 'Project Cascade',
      description:
        'Waterfall Used Textbook school (intra-school initially), architecture will allow inter-school operation, also implement a system tracking book quality from junior to senior level. (textbook quality only deteriorate). Better quality textbook will be buy back at high price.',
    },
    {
      title: 'Grading Multi-Choice Question',
      description:
        'Students answer multiple-choice in paper, papers are scanned into a PDF file (one page per student), a Python script runs thru tesseract to check MC answer. Reference: https://nanonets.com/blog/ocr-with-tesseract/  ',
    },
    {
      title: 'Generate Dynamic (& randomized) Assignments (quizzes)',
      description:
        'React allows teacher to generate set(s) of dynamic questions, so that each student sees a different question (avoid homework copying)',
    },
    {
      title: 'Riding School Bus',
      description: 'tracking school bus arrival & location',
    },
    {
      title: 'Stock Price Modeling',
      description:
        '[ONLY accept finance-related students], using Python Numpy & Pandas (Tensorflow if we have sufficient matrix of data) to analyze or predict price',
    },
    {
      title: 'Solar & Lunar Eclipses Predictions',
      description:
        '[STRONGLY prefers Math & Phy students] predict solar & lunar eclipses, and generate a visualization.',
    },
  ];

  const chatGroups: Partial<ChatGroupDocument>[] = [];
  const chats: Partial<ChatDocument>[] = [];
  const contents: Partial<ContentDocument>[] = [];

  seedingChatGroups.forEach(seedingChatGroup => {
    const content = new Content<Partial<ContentDocument>>({ creator: alexId, data: `Welcome` });
    const chat = new Chat<Partial<ChatDocument>>({ members: [], contents: [content._id] });
    const chatGroup = new ChatGroup<Partial<ChatGroupDocument>>({
      ...seedingChatGroup,
      membership: CHAT_GROUP.MEMBERSHIP.NORMAL,
      tenant: stemTenant!._id,
      users: [alexId],
      admins: [alexId],
      chats: [chat._id],
    });

    content.parents = [`/chats/${chat._id}`];
    chat.parents = [`/chatGroups/${chatGroup._id}`];

    chatGroups.push(chatGroup);
    chats.push(chat);
    contents.push(content);
  });

  await Promise.all([
    Activity.create(activities),
    ChatGroup.create(chatGroups),
    Chat.create(chats),
    Content.create(contents),
  ]);
  return `(${chalk.green(activities.length)} - ${chalk.green(chats.length)} created)`;
};

export { seed };