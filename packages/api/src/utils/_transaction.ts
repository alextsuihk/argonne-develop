// TODO: not in use

/**
 * Transaction: create & commit (verify)
 *
 */

// import Transaction from '../models/_transaction';

// type UserTrans = {
//   userId: string;
//   amount: number;
//   virtual: boolean;
//   withheld: boolean;
// }[];

// const commit = () => {};

// const create = async (userTrans: UserTrans, links: string[], commitAfter: Date): Promise<void> => {
//   const session = await Transaction.startSession();

//   await session.withTransaction(() => {
//     return Transaction.create([{ name: 'Test' }], { session: session });
//   });
// };

export default { create: 'TODO', commit: 'TODO' };
