import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const getAccounts = async () => {
  const { data } = await api.get('/accounts');
  return data;
};

export const getTransactions = async () => {
  const { data } = await api.get('/transactions');
  return data;
};

export const performTransfer = async (from_id: string, to_id: string, amount: number, description: string, idempotencyKey: string) => {
  const { data } = await api.post('/transfer', {
    from_id,
    to_id,
    amount,
    description,
  }, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });
  return data;
};
