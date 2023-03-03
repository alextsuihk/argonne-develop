/**
 * Seeder: Publisher
 *
 *
 * source:
 *  https://cd.edb.gov.hk/rtl/supply.asp
 *  https://www.edb.gov.hk/en/curriculum-development/resource-support/textbook-info/index.html
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import chalk from 'chalk';
import convert from 'chinese_convert';

import type { PublisherDocument } from '../../models/publisher';
import Publisher from '../../models/publisher';
import { randomString } from '../../utils/helper';
import { client as minioClient, publicBucket } from '../../utils/storage';

const seed = async (): Promise<string> => {
  const publisherLogoImage = await fsPromises.readFile(path.join(__dirname, 'images', 'logo-publisher.png'));
  const publisherLogoFilename = randomString('png');

  const publishers: Partial<PublisherDocument>[] = [
    {
      name: { enUS: '', zhHK: '進昇教育有限公司' },
      phones: ['+852 28112908'],
      website: 'https://www.learningfun.com.hk/',
    },
    {
      name: { enUS: 'Aristo Educational Press Ltd', zhHK: '雅集出版社有限公司' },
      phones: ['+852 28112908'],
      website: 'http://www.aristo.com.hk',
    },
    {
      name: { enUS: 'Cengage Learning Hong Kong Limited	', zhHK: '聖雅學習香港有限公司' },
      phones: ['+852 26121833 '],
      website: 'http://www.stanfordhouse.com.hk/product	',
    },
    {
      name: { enUS: 'Chinese Technical Press Ltd', zhHK: '中華科技出版社	' },
      phones: ['+852 29976683'],
      website: 'http://www.ctphk.com',
    },
    {
      name: { enUS: 'Chung Tai Educational Press', zhHK: '中大出版社' },
      phones: ['+852 25582247'],
      website: 'http://www.ctep.com.hk',
    },
    {
      name: { enUS: 'Chung Tai Educational Press & Marshall Cavendish Education', zhHK: '中大出版社 及 名創教育' },
      phones: ['+852 25582247'],
      website: 'http://www.ctep.com.hk',
    },
    {
      name: { enUS: 'Classroom Publications Ltd', zhHK: '晶晶教育出版社' },
      phones: ['+852 31874878'],
      website: 'http://www.classroom.com.hk',
    },
    {
      name: { enUS: 'Crystal Education Publications', zhHK: '課室教材出版有限公司' },
      phones: ['+852 25551183'],
      website: 'http://www.crystal-edu.com/',
    },
    {
      name: { enUS: 'Educational Publishing House Ltd', zhHK: '教育出版社有限公司' },
      phones: ['+852 24088801'],
      website: 'http://www.ephhk.com',
    },
    {
      name: { enUS: 'Elementi Education Organization Non-Profit Making Limited', zhHK: '培元教育機構有限公司' },
      phones: ['+852 28063870'],
      website: 'https://www.elementiedu.org/',
    },
    {
      name: { enUS: 'Excellence Publication Company Limited', zhHK: '卓思出版社有限公司' },
      phones: ['+852 24111280'],
      website: 'http://www.excellence.com.hk/index.php',
    },
    {
      name: { enUS: 'Hong Kong Educational Publishing Company Ltd.', zhHK: '香港教育圖書有限公司' },
      phones: ['+852 25651371'],
      website: 'http://www.hkep.com',
    },
    {
      name: { enUS: "Hong Kong Everyman's Book Co Ltd", zhHK: '香港人人書局有限公司' },
      phones: ['+852 23386103'],
      website: 'N/A',
    },
    {
      name: { enUS: 'Hong Kong Music Publisher', zhHK: '香港音樂出版社' },
      phones: ['+852 23846564'],
      website: 'http://www.hkmusic.com.hk',
    },
    {
      name: { enUS: 'Horizon Media Limited', zhHK: '博通文化服務有限公司	' },
      phones: ['+852 66925909'],
      website: 'TBC',
    },
    {
      name: { enUS: 'Interactive Press Company Limited', zhHK: '互動出版有限公司' },
      phones: ['+852 28956428'],
      website: 'http://moodle.hk/mshop',
    },
    {
      name: { enUS: 'International New Standard Press', zhHK: '國際新標準出版社' },
      phones: ['+852 24933350'],
      website: 'https://www.inse.org/',
    },
    {
      name: { enUS: 'IT Education Center Limited', zhHK: '智庫教育有限公司' },
      phones: ['+852 35430999'],
      website: 'http://www.achieve.hk/',
    },
    {
      name: { enUS: 'Jing Kung Educational Press', zhHK: '精工出版社' },
      phones: ['+852 28265555'],
      website: 'http://www.jingkung.com/',
    },
    {
      name: { enUS: 'Kendy Publishing Company Ltd.', zhHK: '啟迪文化有限公司' },
      phones: ['+852 35681560'],
      website: 'http://www.kendypublishing.com/',
    },
    {
      name: { enUS: 'Keys Press', zhHK: '啟思出版社' },
      phones: ['+852 25163222', '+852 25163126'],
      website: 'https://www.keyschinese.com.hk/home',
    },
    {
      name: { enUS: 'Kinder Education Press Limited', zhHK: '幼兒教育出版社有限公司' },
      phones: ['+852 29429338'],
      website: 'http://ephhk.popularworldhk.com/',
    },
    {
      name: { enUS: 'Ling Kee Publishing Co Ltd', zhHK: '齡記出版有限公司' },
      phones: ['+852 25622642'],
      website: 'http://www.lingkee.com/',
    },
    {
      name: { enUS: 'Manhattan Marshall Cavendish Education', zhHK: '文達‧名創教育' },
      phones: ['+852 24811930'],
      website: 'http://www.mceducation.com.hk/',
    },
    {
      name: { enUS: 'Manhattan Press', zhHK: '文達出版' },
      phones: ['+852 24811930'],
      website: 'http://www.mceducation.com.hk/',
    },
    {
      name: { enUS: 'Marshall Cavendish Education', zhHK: '名創教育' },
      phones: ['+852 24811930'],
      website: 'http://www.mceducation.com.hk/',
    },
    {
      name: { enUS: 'Minds Publishing Company Limited', zhHK: '明思出版有限公司' },
      phones: ['+852 21178230'],
      website: 'http://minds.hk/',
    },
    {
      name: { enUS: 'MindWorks & System Co., Ltd', zhHK: '進志系統事業有限公司' },
      phones: ['+852 23593821'],
      website: 'https://www.brainworksrnd.com/mws/',
    },
    {
      name: { enUS: 'Ming Pao Education Publications Limited', zhHK: '明報教育出版有限公司' },
      phones: ['+852 25155600'],
      website: 'http://www.mpep.com.hk/',
    },
    {
      name: { enUS: 'Moodle.hk', zhHK: '五到' },
      phones: ['+852 28956428', '+852 28956438'],
      website: 'http://moodle.hk/',
    },
    {
      name: { enUS: 'New Asia · Marshall Cavendish Education Hong Kong', zhHK: '名創教育‧新亞洲出版社' },
      phones: ['+852 24811930'],
      website: 'http://www.mceducation.com.hk/',
    },
    {
      name: { enUS: 'New Asia Publishing House', zhHK: '新亞洲出版社有限公司' },
      phones: ['+852 24811930'],
      website: 'http://www.mceducation.com.hk/',
    },
    {
      name: { enUS: 'Open Knowledge Association Ltd.', zhHK: '知識共享協會有限公司' },
      phones: ['+852 21911000'],
      website: 'http://openknowledge.hk/',
    },
    {
      name: { enUS: 'Oxford University Press (China) Ltd', zhHK: '牛津大學出版社(中國)有限公司' },
      phones: ['+852 25163222', '+852 25163126'],
      website: 'https://www.oupchina.com.hk/',
    },
    {
      name: { enUS: 'Pearson Hong Kong', zhHK: '培生香港' },
      phones: ['+852 31810123'],
      website: 'https://www.pearson.com.hk/',
    },
    {
      name: { enUS: 'Pilot Publishers Services Ltd.', zhHK: '導師圖書發行有限公司' },
      phones: ['+852 23631898'],
      website: 'http://www.i-ppc.com/',
    },
    {
      name: { enUS: 'Pilot Publishing Company Ltd.', zhHK: '導師出版社有限公司' },
      phones: ['+852 23631898'],
      website: 'http://www.i-ppc.com/',
    },
    {
      name: { enUS: 'Radian Publishing Co.', zhHK: '偉能出版社' },
      phones: ['+852 26370432'],
      website: 'http://www.radian.com.hk/',
    },
    {
      name: { enUS: 'Religious Education Resource Centre', zhHK: '宗教教育中心' },
      phones: ['+852 27766333'],
      website: 'http://www.rerc.org.hk/tc/websites.aspx?id=14',
    },
    {
      name: { enUS: 'Sky Educational Press (HK) Ltd.', zhHK: '天行教育出版(香港)有限公司' },
      phones: ['+852 24240733'],
      website: 'http://www.skyedpress.com.hk/',
    },
    {
      name: { enUS: 'Sky Educational Press (HK) Ltd.', zhHK: '天行教育出版(香港)有限公司' },
      phones: ['+852 24240733'],
      website: 'http://www.skyedpress.com.hk/',
    },
    {
      name: { enUS: 'Smart Education Charitable Foundation Limited', zhHK: '聰穎教育慈善基金' },
      phones: ['+852 28513822'],
      website: 'http://www.mysmartedu.com/',
    },
    {
      name: { enUS: 'Stanford House Publications (HK) Ltd.', zhHK: '史丹福書屋(香港)有限公司' },
      phones: ['+852 23302533'],
      website: 'http://www.stanfordhouse.com.hk/product',
    },
    {
      name: { enUS: 'Star Publishing (HK) Ltd.', zhHK: '思達出版社有限公司' },
      phones: ['+852 60529291'],
      website: 'https://www.starpub.com.sg/',
    },
    {
      name: { enUS: 'The Commercial Press (HK) Ltd', zhHK: '商務印書館(香港)有限公司' },
      phones: ['+852 28878018'],
      website: 'http://www.hkep.com/',
    },
    {
      name: { enUS: 'The Open University of Hong Kong', zhHK: '香港公開大學' },
      phones: ['+852 27686484'],
      website: 'http://www.opentextbooks.org.hk/',
    },
    {
      name: { enUS: 'The Taiyar Publication Ltd', zhHK: '大雅圖書有限公司' },
      phones: ['+852 25646833'],
      website: 'http://www.taiyar.com.hk/',
    },
    {
      name: { enUS: 'Vision Publishing Co', zhHK: '宏思出版有限公司' },
      phones: ['+852 26798119'],
      website: 'https://www.visionhk.com.hk/pripe/',
    },
    {
      name: { enUS: 'Waza Cultural Enterprises Ltd.', zhHK: '華夏文化出版有限公司' },
      phones: ['+852 34254690'],
      website: 'http://www.wazacultural.com/',
    },
    {
      name: { enUS: 'Ying Lee Music Co Ltd', zhHK: '英利音樂有限公司' },
      phones: ['+852 24672272'],
      website: 'https://www.yingleemusic.com/',
    },
  ];

  publishers.forEach(publisher => {
    if (!publisher.name?.zhCN) publisher.name!.zhCN = convert.tw2cn(publisher.name?.zhHK ?? '');
    publisher.logoUrl = `/${publicBucket}/${publisherLogoFilename}`;
  });

  await Promise.all([
    Publisher.create(publishers),
    minioClient.putObject(publicBucket, publisherLogoFilename, publisherLogoImage),
  ]);
  return `(${chalk.green(publishers.length)} created)`;
};

export { seed };
