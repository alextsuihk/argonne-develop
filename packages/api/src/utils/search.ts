// TODO: elastic search
// TODO: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/typescript_examples.html

// import type { Types } from 'mongoose';
// import { Client, ApiResponse, RequestParams } from '@elastic/elasticsearch';
// const client = new Client({ node: 'http://localhost:9200' });

// // index:

// const index = async (doc: {
//   subject: string | Types.ObjectId;
//   level?: string | Types.ObjectId;
//   type: string;
//   id: string | Types.ObjectId;
//   body: Record<string, string>;
// }): Promise<void> =>
//   client.index({
//     index: doc.subject.toString(),
//     level: doc.level?.toString(),
//     type: doc.type,
//     id: doc.id.toString(),
//     body: doc.body,
//   });

// const search = async (params: {
//   subject: string | Types.ObjectId;
//   level?: string | Types.ObjectId;
//   type: string;
//   body: { query: unknown };
// }): Promise<Array<{ type: string; id: string }>> => {
//   const body = await client.search({
//     index: params.subject.toString(),
//     level: params.level?.toString(),
//     type: params.type,
//     body: params.body,
//   });
//   return body.hits.hits;
// };

// export default { index, search };

export default { todo: 'TODO' };
